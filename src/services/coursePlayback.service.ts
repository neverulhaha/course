/**
 * Плеер, прогресс студента, квизы и вспомогательные преобразования контента.
 */
import { supabase } from "@/lib/supabase/client";
import { completeLesson as completeLessonViaFunction, submitAssignment as submitAssignmentViaFunction } from "@/services/progress.service";
import { parseLessonContentJson } from "@/entities/course/lessonContentJson";
import type {
  ActivityView,
  CourseProgressView,
  PlayerCourseData,
  QuizQuestionView,
} from "@/entities/course/readModels";
import { formatRuDateTime } from "@/lib/dateFormat";
import { asRecord, num, str } from "@/services/dbRowUtils";
import { toUserErrorMessage } from "@/lib/errorMessages";
import { getCourseAccessStatus, getLessonAccessStatus, getQuizAccessStatus } from "@/services/accessControl.service";

export type { ActivityView, CourseProgressView, PlayerCourseData, QuizQuestionView };

export type AssignmentReviewView = {
  score: number | null;
  status: string | null;
  feedback: string | null;
  strengths: string[];
  improvements: string[];
  criteria: Array<{ criterion: string; passed: boolean; comment: string }>;
  suggestedAnswer: string | null;
  warnings: string[];
};

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => str(item)).filter(Boolean) as string[] : [];
}

export type AssignmentCriterionView = { criterion: string; weight: number | null };

function assignmentCriteriaFromValue(value: unknown): AssignmentCriterionView[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const rec = asRecord(item);
    const criterion = str(rec?.criterion) ?? str(rec?.title) ?? str(rec?.name) ?? str(item);
    if (!criterion) return null;
    const weight = num(rec?.weight ?? rec?.points ?? rec?.score);
    return { criterion, weight };
  }).filter(Boolean) as AssignmentCriterionView[];
}

function mapAssignmentReview(row: Record<string, unknown> | null): AssignmentReviewView | null {
  if (!row) return null;
  const reviewJson = asRecord(row.review_json) ?? {};
  const criteriaRaw = Array.isArray(reviewJson.criteria) ? reviewJson.criteria : [];
  const criteria = criteriaRaw.map((item) => {
    const rec = asRecord(item);
    if (!rec) return null;
    const criterion = str(rec.criterion);
    if (!criterion) return null;
    return { criterion, passed: Boolean(rec.passed), comment: str(rec.comment) ?? "" };
  }).filter(Boolean) as AssignmentReviewView["criteria"];
  const score = num(row.review_score) ?? num(reviewJson.score);
  const status = str(row.review_status) ?? str(reviewJson.status);
  const feedback = str(row.review_feedback) ?? str(reviewJson.feedback);
  const hasReview = score != null || Boolean(status || feedback || criteria.length);
  if (!hasReview) return null;
  return {
    score,
    status,
    feedback,
    strengths: strArray(reviewJson.strengths),
    improvements: strArray(reviewJson.improvements),
    criteria,
    suggestedAnswer: str(reviewJson.suggested_answer) ?? str(reviewJson.suggestedAnswer),
    warnings: strArray(reviewJson.warnings),
  };
}

async function courseIdsFromLessonActivity(userId: string): Promise<string[]> {
  const { data: lc } = await supabase.from("lesson_completions").select("lesson_id").eq("user_id", userId);
  const lids = [...new Set((lc ?? []).map((r) => str(asRecord(r)?.lesson_id)).filter(Boolean))] as string[];
  if (lids.length === 0) return [];
  const { data: lessons } = await supabase.from("lessons").select("module_id").in("id", lids);
  const mids = [...new Set((lessons ?? []).map((l) => str(asRecord(l)?.module_id)).filter(Boolean))] as string[];
  if (mids.length === 0) return [];
  const { data: modules } = await supabase.from("modules").select("course_id").in("id", mids);
  return [...new Set((modules ?? []).map((m) => str(asRecord(m)?.course_id)).filter(Boolean))] as string[];
}

export async function fetchStudentProgressDashboard(userId: string): Promise<{
  courses: CourseProgressView[];
  activity: ActivityView[];
  stats: {
    totalCourses: number;
    completedCourses: number;
    totalLessons: number;
    completedLessons: number;
    averageScore: number | null;
    studyTime: string;
    streak: number;
  };
  error: string | null;
}> {
  const { data: progRows, error: pErr } = await supabase.from("progress").select("*").eq("user_id", userId);
  if (pErr) {
    return {
      courses: [],
      activity: [],
      stats: {
        totalCourses: 0,
        completedCourses: 0,
        totalLessons: 0,
        completedLessons: 0,
        averageScore: null,
        studyTime: "—",
        streak: 0,
      },
      error: pErr.message,
    };
  }

  let courseIds = [...new Set((progRows ?? []).map((r) => str(asRecord(r)?.course_id)).filter(Boolean))] as string[];
  if (courseIds.length === 0) {
    courseIds = await courseIdsFromLessonActivity(userId);
  }

  const titles = new Map<string, string>();
  if (courseIds.length > 0) {
    const { data: crs } = await supabase.from("courses").select("id, title").in("id", courseIds);
    for (const c of crs ?? []) {
      const cr = asRecord(c);
      const id = str(cr?.id);
      if (id) titles.set(id, str(cr?.title) ?? "Курс");
    }
  }

  const { data: completions } = await supabase.from("lesson_completions").select("lesson_id, completed_at").eq("user_id", userId);

  const lessonIdsDone = new Set((completions ?? []).map((r) => str(asRecord(r)?.lesson_id)).filter(Boolean) as string[]);

  const { data: attempts } = await supabase.from("quiz_attempts").select("quiz_id, score, created_at").eq("user_id", userId).order("created_at", { ascending: false });

  const quizScoresByCourse = new Map<string, number[]>();
  if (attempts && attempts.length > 0) {
    const qids = [...new Set(attempts.map((a) => str(asRecord(a)?.quiz_id)).filter(Boolean))] as string[];
    if (qids.length > 0) {
      const { data: quizzes } = await supabase.from("quizzes").select("id, lesson_id").in("id", qids);
      const quizToLesson = new Map<string, string>();
      const lessonIdsFromQuiz: string[] = [];
      for (const q of quizzes ?? []) {
        const qr = asRecord(q);
        const qid = str(qr?.id);
        const lid = str(qr?.lesson_id);
        if (qid && lid) {
          quizToLesson.set(qid, lid);
          lessonIdsFromQuiz.push(lid);
        }
      }
      const { data: lesForQuiz } =
        lessonIdsFromQuiz.length > 0
          ? await supabase.from("lessons").select("id, module_id").in("id", lessonIdsFromQuiz)
          : { data: [] as { id: string; module_id: string }[] };
      const mids = [...new Set((lesForQuiz ?? []).map((l) => str(asRecord(l)?.module_id)).filter(Boolean))] as string[];
      const { data: modRows } = mids.length > 0 ? await supabase.from("modules").select("id, course_id").in("id", mids) : { data: [] };
      const modToCourse = new Map<string, string>();
      for (const m of modRows ?? []) {
        const mr = asRecord(m);
        const mid = str(mr?.id);
        const cid = str(mr?.course_id);
        if (mid && cid) modToCourse.set(mid, cid);
      }
      const lessonToCourse = new Map<string, string>();
      for (const l of lesForQuiz ?? []) {
        const lr = asRecord(l);
        const lid = str(lr?.id);
        const mid = str(lr?.module_id);
        if (lid && mid) {
          const cid = modToCourse.get(mid);
          if (cid) lessonToCourse.set(lid, cid);
        }
      }
      for (const a of attempts) {
        const ar = asRecord(a);
        const qid = str(ar?.quiz_id);
        const sc = num(ar?.score);
        if (!qid || sc == null) continue;
        const lid = quizToLesson.get(qid);
        if (!lid) continue;
        const cid = lessonToCourse.get(lid);
        if (!cid) continue;
        const arr = quizScoresByCourse.get(cid) ?? [];
        arr.push(sc);
        quizScoresByCourse.set(cid, arr);
      }
    }
  }

  const courses: CourseProgressView[] = [];
  let totalLessonsAll = 0;
  let completedLessonsAll = 0;
  let completedCourses = 0;
  const allScores: number[] = [];

  for (const cid of courseIds.length ? courseIds : []) {
    const { data: mods } = await supabase.from("modules").select("id").eq("course_id", cid);
    const mids = (mods ?? []).map((m) => str(asRecord(m)?.id)).filter(Boolean) as string[];
    const { data: les } = mids.length > 0 ? await supabase.from("lessons").select("id").in("module_id", mids) : { data: [] };
    const allLessonIds = (les ?? []).map((l) => str(asRecord(l)?.id)).filter(Boolean) as string[];
    const total = allLessonIds.length;
    let done = 0;
    for (const lid of allLessonIds) {
      if (lessonIdsDone.has(lid)) done += 1;
    }
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    totalLessonsAll += total;
    completedLessonsAll += done;
    if (pct >= 100 && total > 0) completedCourses += 1;

    let lastActivity = "—";
    const times = (completions ?? [])
      .filter((c) => {
        const lid = str(asRecord(c)?.lesson_id);
        return lid && allLessonIds.includes(lid);
      })
      .map((c) => str(asRecord(c)?.completed_at))
      .filter(Boolean) as string[];
    if (times.length > 0) {
      times.sort();
      lastActivity = formatRuDateTime(times[times.length - 1]);
    }

    const qz = quizScoresByCourse.get(cid) ?? [];
    qz.forEach((s) => allScores.push(s));

    let nextLesson: string | undefined;
    for (const lid of allLessonIds) {
      if (!lessonIdsDone.has(lid)) {
        const { data: lesRow } = await supabase.from("lessons").select("title").eq("id", lid).maybeSingle();
        nextLesson = str(asRecord(lesRow)?.title) ?? undefined;
        break;
      }
    }

    courses.push({
      id: cid,
      title: titles.get(cid) ?? "Курс",
      progress: pct,
      completedLessons: done,
      totalLessons: total,
      lastActivity,
      quizScores: qz,
      completed: total > 0 && done >= total,
      nextLesson,
    });
  }

  const averageScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

  const activity: ActivityView[] = [];
  for (const c of completions ?? []) {
    const cr = asRecord(c);
    const lid = str(cr?.lesson_id);
    const when = str(cr?.completed_at);
    if (!lid || !when) continue;
    const { data: lr } = await supabase.from("lessons").select("title, module_id").eq("id", lid).maybeSingle();
    const lrow = asRecord(lr);
    const mid = str(lrow?.module_id);
    let courseName = "—";
    if (mid) {
      const { data: mr } = await supabase.from("modules").select("course_id").eq("id", mid).maybeSingle();
      const cid = str(asRecord(mr)?.course_id);
      if (cid) courseName = titles.get(cid) ?? courseName;
    }
    activity.push({
      type: "lesson",
      title: str(lrow?.title) ?? "Урок",
      course: courseName,
      date: formatRuDateTime(when),
    });
  }
  for (const a of (attempts ?? []).slice(0, 10)) {
    const ar = asRecord(a);
    const when = str(ar?.created_at);
    const sc = num(ar?.score);
    if (!when) continue;
    activity.push({
      type: "quiz",
      title: "Попытка квиза",
      course: "—",
      score: sc ?? undefined,
      date: formatRuDateTime(when),
    });
  }
  activity.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

  return {
    courses,
    activity: activity.slice(0, 12),
    stats: {
      totalCourses: courses.length,
      completedCourses,
      totalLessons: totalLessonsAll,
      completedLessons: completedLessonsAll,
      averageScore,
      studyTime: "—",
      streak: 0,
    },
    error: null,
  };
}

export async function fetchPlayerCourse(
  courseId: string,
  userId: string | null
): Promise<{ data: PlayerCourseData | null; error: string | null }> {
  const access = await getCourseAccessStatus(courseId);
  if (access.status !== "ok") return { data: null, error: access.status === "error" ? access.error ?? "Не удалось проверить доступ к курсу." : access.status };

  const { data: course, error: cErr } = await supabase.from("courses").select("id, title").eq("id", courseId).maybeSingle();
  if (cErr) return { data: null, error: cErr.message };
  const crow = asRecord(course);
  if (!crow) return { data: null, error: "not_found" };

  const { data: modRows, error: mErr } = await supabase
    .from("modules")
    .select("id, title, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true });
  if (mErr) return { data: null, error: mErr.message };

  const moduleIds = (modRows ?? []).map((m) => str(asRecord(m)?.id)).filter(Boolean) as string[];

  const completedIds = new Set<string>();
  if (userId && moduleIds.length > 0) {
    const { data: courseLessons } = await supabase.from("lessons").select("id").in("module_id", moduleIds);
    const lessonIds = (courseLessons ?? []).map((l) => str(asRecord(l)?.id)).filter(Boolean) as string[];
    if (lessonIds.length > 0) {
      const { data: lc } = await supabase.from("lesson_completions").select("lesson_id").eq("user_id", userId).in("lesson_id", lessonIds);
      for (const r of lc ?? []) {
        const lid = str(asRecord(r)?.lesson_id);
        if (lid) completedIds.add(lid);
      }
    }
  }

  let savedLastOpenedLessonId: string | null = null;
  if (userId) {
    const { data: progressRow } = await supabase
      .from("progress")
      .select("last_opened_lesson_id, next_recommended_lesson_id")
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .maybeSingle();
    savedLastOpenedLessonId = str(asRecord(progressRow)?.last_opened_lesson_id) || str(asRecord(progressRow)?.next_recommended_lesson_id) || null;
  }

  const modules: PlayerCourseData["modules"] = [];
  let firstLessonId: string | null = null;
  const orderedLessonIds: string[] = [];

  for (const m of modRows ?? []) {
    const mr = asRecord(m);
    const mid = str(mr?.id);
    if (!mid) continue;
    const { data: lesRows } = await supabase
      .from("lessons")
      .select("id, title, position")
      .eq("module_id", mid)
      .order("position", { ascending: true });
    const lessons: PlayerCourseData["modules"][0]["lessons"] = [];
    for (const l of lesRows ?? []) {
      const lr = asRecord(l);
      const lid = str(lr?.id);
      if (!lid) continue;
      orderedLessonIds.push(lid);
      if (!firstLessonId) firstLessonId = lid;
      lessons.push({
        id: lid,
        title: str(lr?.title) ?? "Урок",
        completed: completedIds.has(lid),
        current: false,
      });
    }
    modules.push({ id: mid, title: str(mr?.title) ?? "Модуль", lessons });
  }

  const firstNotCompleted = orderedLessonIds.find((id) => !completedIds.has(id)) ?? null;
  const currentLessonId = savedLastOpenedLessonId && orderedLessonIds.includes(savedLastOpenedLessonId)
    ? savedLastOpenedLessonId
    : firstNotCompleted ?? firstLessonId ?? "";

  return {
    data: {
      title: str(crow.title) ?? "Курс",
      currentLessonId,
      modules: modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({ ...lesson, current: lesson.id === currentLessonId })),
      })),
    },
    error: null,
  };
}

export function lessonContentToPlayerBlocks(raw: unknown): {
  title: string;
  description: string;
  duration: string;
  blocks: {
    type: "theory" | "code" | "key-points" | "practice";
    title: string;
    text?: string;
    items?: string[];
    code?: string;
    codeCaption?: string;
  }[];
  nextHint: string;
  hasAssignment: boolean;
  hasQuiz: boolean;
} {
  const parsed = parseLessonContentJson(raw);
  const blocks: {
    type: "theory" | "code" | "key-points" | "practice";
    title: string;
    text?: string;
    items?: string[];
    code?: string;
    codeCaption?: string;
  }[] = [];
  for (const b of parsed.blocks) {
    if (b.type === "text") {
      blocks.push({ type: "theory", title: b.label, text: b.content });
    } else if (b.type === "example" || b.type === "code") {
      blocks.push({
        type: "code",
        title: b.label,
        text: b.description ?? "",
        code: b.content,
        codeCaption: b.description,
      });
    } else if (b.type === "practice") {
      blocks.push({
        type: "practice",
        title: b.label,
        items: b.content.split(/\n+/).map((s) => s.trim()).filter(Boolean),
      });
    }
  }
  // Пустые блоки не добавляем: экран прохождения покажет понятное пустое состояние.
  const rec = asRecord(raw);
  return {
    title: "",
    description: parsed.goal ?? "",
    duration: str(rec?.duration) ?? "—",
    blocks,
    nextHint: str(rec?.next_hint) ?? str(rec?.nextHint) ?? "",
    hasAssignment: Boolean(rec?.has_assignment ?? rec?.hasAssignment),
    hasQuiz: Boolean(rec?.has_quiz ?? rec?.hasQuiz),
  };
}

export async function fetchPlayerLessonPayload(courseId: string, lessonId: string, userId?: string | null): Promise<{
  moduleTitle: string;
  lessonTitle: string;
  content: unknown;
  quizId: string | null;
  quizTitle: string | null;
  attemptsCount: number;
  bestScore: number | null;
  completed: boolean;
  assignmentStatus: string | null;
  assignmentText: string | null;
  assignmentReview: AssignmentReviewView | null;
  assignmentExpectedAnswer: string | null;
  assignmentCriteria: AssignmentCriterionView[];
  error: string | null;
}> {
  const access = await getLessonAccessStatus(lessonId, courseId);
  if (access.status !== "ok") return { moduleTitle: "—", lessonTitle: "—", content: null, quizId: null, quizTitle: null, attemptsCount: 0, bestScore: null, completed: false, assignmentStatus: null, assignmentText: null, assignmentReview: null, assignmentExpectedAnswer: null, assignmentCriteria: [], error: access.status === "error" ? access.error ?? "Не удалось проверить доступ к уроку." : access.status };

  const { data: les } = await supabase.from("lessons").select("id, title, module_id, objective, summary, estimated_duration, learning_outcome").eq("id", lessonId).maybeSingle();
  const lr = asRecord(les);
  if (!lr) return { moduleTitle: "—", lessonTitle: "—", content: null, quizId: null, quizTitle: null, attemptsCount: 0, bestScore: null, completed: false, assignmentStatus: null, assignmentText: null, assignmentReview: null, assignmentExpectedAnswer: null, assignmentCriteria: [], error: "not_found" };
  const mid = str(lr.module_id);
  let moduleTitle = "—";
  if (mid) {
    const { data: mod } = await supabase.from("modules").select("title, course_id").eq("id", mid).maybeSingle();
    const mr = asRecord(mod);
    if (str(mr?.course_id) !== courseId) return { moduleTitle: "—", lessonTitle: "—", content: null, quizId: null, quizTitle: null, attemptsCount: 0, bestScore: null, completed: false, assignmentStatus: null, assignmentText: null, assignmentReview: null, assignmentExpectedAnswer: null, assignmentCriteria: [], error: "forbidden" };
    moduleTitle = str(mr?.title) ?? "—";
  }

  let content: Record<string, unknown> | null = null;
  const extendedContent = await supabase
    .from("lesson_contents")
    .select("theory_text, examples_text, practice_text, checklist_text, expected_answer_text, assessment_criteria_json")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (extendedContent.error) {
    const fallbackContent = await supabase
      .from("lesson_contents")
      .select("theory_text, examples_text, practice_text, checklist_text")
      .eq("lesson_id", lessonId)
      .maybeSingle();
    content = fallbackContent.data ? asRecord(fallbackContent.data) : null;
  } else {
    content = extendedContent.data ? asRecord(extendedContent.data) : null;
  }

  const { data: quizRow } = await supabase.from("quizzes").select("id, title").eq("lesson_id", lessonId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const quiz = asRecord(quizRow);
  const quizId = str(quiz?.id) ?? null;

  let attemptsCount = 0;
  let bestScore: number | null = null;
  if (quizId && userId) {
    const { data: attempts } = await supabase.from("quiz_attempts").select("score").eq("quiz_id", quizId).eq("user_id", userId);
    attemptsCount = attempts?.length ?? 0;
    const scores = (attempts ?? []).map((a) => num(asRecord(a)?.score)).filter((v): v is number => v != null);
    bestScore = scores.length ? Math.max(...scores) : null;
  }

  let completed = false;
  let assignmentStatus: string | null = null;
  let assignmentText: string | null = null;
  let assignmentReview: AssignmentReviewView | null = null;
  if (userId) {
    const { data: completion } = await supabase.from("lesson_completions").select("id").eq("lesson_id", lessonId).eq("user_id", userId).maybeSingle();
    completed = Boolean(completion);
    let assignmentRows: unknown[] | null = null;
    const extended = await supabase
      .from("assignment_submissions")
      .select("status, submission_text, review_score, review_status, review_feedback, review_json")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (extended.error) {
      const fallback = await supabase
        .from("assignment_submissions")
        .select("status, submission_text")
        .eq("lesson_id", lessonId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      assignmentRows = fallback.data ?? [];
    } else {
      assignmentRows = extended.data ?? [];
    }
    const assignmentRow = asRecord((assignmentRows ?? [])[0]);
    assignmentStatus = str(assignmentRow?.status) ?? null;
    assignmentText = str(assignmentRow?.submission_text) ?? null;
    assignmentReview = mapAssignmentReview(assignmentRow);
  }

  const contentWithLessonMeta = {
    ...(asRecord(content) ?? {}),
    lesson_objective: str(lr.objective) ?? null,
    lesson_summary: str(lr.summary) ?? null,
    lesson_estimated_duration: str(lr.estimated_duration) ?? null,
    lesson_learning_outcome: str(lr.learning_outcome) ?? null,
  };

  return {
    moduleTitle,
    lessonTitle: str(lr.title) ?? "Урок",
    content: contentWithLessonMeta,
    quizId,
    quizTitle: str(quiz?.title) ?? null,
    attemptsCount,
    bestScore,
    completed,
    assignmentStatus,
    assignmentText,
    assignmentReview,
    assignmentExpectedAnswer: str(contentWithLessonMeta.expected_answer_text) ?? null,
    assignmentCriteria: assignmentCriteriaFromValue(contentWithLessonMeta.assessment_criteria_json),
    error: null,
  };
}

export async function fetchQuizForTaking(quizId: string): Promise<{ title: string; questions: QuizQuestionView[]; error: string | null }> {
  const access = await getQuizAccessStatus(quizId);
  if (access.status !== "ok") return { title: "", questions: [], error: access.status === "error" ? access.error ?? "Не удалось проверить доступ к квизу." : access.status };

  const { data: quiz, error: qErr } = await supabase.from("quizzes").select("id, title").eq("id", quizId).maybeSingle();
  if (qErr) return { title: "", questions: [], error: toUserErrorMessage(qErr, "Не удалось загрузить квиз.") };
  const qr = asRecord(quiz);
  if (!qr) return { title: "", questions: [], error: "not_found" };

  const { data: qs } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });

  const questions: QuizQuestionView[] = [];

  for (const q of qs ?? []) {
    const qrow = asRecord(q);
    const qid = str(qrow?.id);
    if (!qid) continue;
    const text = str(qrow?.question_text) ?? str(qrow?.body) ?? str(qrow?.text) ?? "Вопрос";

    const { data: opts } = await supabase.from("answer_options").select("id, answer_text, position").eq("question_id", qid).order("position", { ascending: true });

    const optionTexts: string[] = [];
    const correctIndex = -1;
    for (const o of opts ?? []) {
      const orow = asRecord(o);
      const t = str(orow?.answer_text) ?? str(orow?.text) ?? str(orow?.body) ?? str(orow?.label) ?? "";
      optionTexts.push(t);
    }

    questions.push({
      id: qid,
      text,
      options: optionTexts.length ? optionTexts : ["—"],
      correctIndex: Math.min(correctIndex, optionTexts.length - 1),
      explanation: null,
    });
  }

  return { title: str(qr.title) ?? "Квиз", questions, error: null };
}

export async function fetchQuizForEditor(quizId: string): Promise<{ title: string; questions: QuizQuestionView[]; error: string | null }> {
  return fetchQuizForTaking(quizId);
}

export async function insertQuizAttempt(_userId: string, _quizId: string, _scorePercent: number): Promise<{ error: Error | null }> {
  return { error: new Error("Используйте submit-quiz-attempt: правильные ответы считаются только на backend.") };
}

export async function insertLessonCompletion(_userId: string, lessonId: string, courseId?: string): Promise<{ error: Error | null; progress?: unknown }> {
  if (!courseId) return { error: new Error("Не передан courseId для завершения урока") };
  const { data, error } = await completeLessonViaFunction(courseId, lessonId);
  return { error: error ? new Error(error) : null, progress: data?.progress };
}

export async function submitLessonAssignment(courseId: string, lessonId: string, text: string, review?: AssignmentReviewView | null): Promise<{ error: Error | null; submission?: unknown; progress?: unknown; review?: AssignmentReviewView | null; reviewWarning?: string | null }> {
  const reviewPayload = review ? {
    score: review.score,
    status: review.status,
    feedback: review.feedback,
    strengths: review.strengths,
    improvements: review.improvements,
    criteria: review.criteria,
    suggested_answer: review.suggestedAnswer,
    warnings: review.warnings,
  } : null;
  const { data, error } = await submitAssignmentViaFunction(courseId, lessonId, text, reviewPayload);
  return {
    error: error ? new Error(error) : null,
    submission: data?.submission,
    progress: data?.progress,
    review: mapAssignmentReview({ review_json: data?.review, review_score: asRecord(data?.review)?.score, review_status: asRecord(data?.review)?.status, review_feedback: asRecord(data?.review)?.feedback }) ?? review ?? null,
    reviewWarning: str(data?.review_warning),
  };
}

export function buildCoursePlaybackPath(courseId: string, lessonId?: string | null): string {
  return lessonId ? `/learn/${courseId}/lesson/${lessonId}` : `/learn/${courseId}`;
}
