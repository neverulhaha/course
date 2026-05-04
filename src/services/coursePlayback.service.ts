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

export type { ActivityView, CourseProgressView, PlayerCourseData, QuizQuestionView };

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
  error: string | null;
}> {
  const { data: les } = await supabase.from("lessons").select("id, title, module_id, objective, summary, estimated_duration, learning_outcome").eq("id", lessonId).maybeSingle();
  const lr = asRecord(les);
  if (!lr) return { moduleTitle: "—", lessonTitle: "—", content: null, quizId: null, quizTitle: null, attemptsCount: 0, bestScore: null, completed: false, assignmentStatus: null, error: "not_found" };
  const mid = str(lr.module_id);
  let moduleTitle = "—";
  if (mid) {
    const { data: mod } = await supabase.from("modules").select("title, course_id").eq("id", mid).maybeSingle();
    const mr = asRecord(mod);
    if (str(mr?.course_id) !== courseId) return { moduleTitle: "—", lessonTitle: "—", content: null, quizId: null, quizTitle: null, attemptsCount: 0, bestScore: null, completed: false, assignmentStatus: null, error: "forbidden" };
    moduleTitle = str(mr?.title) ?? "—";
  }

  const { data: lc } = await supabase.from("lesson_contents").select("theory_text, examples_text, practice_text, checklist_text").eq("lesson_id", lessonId).maybeSingle();
  const content = lc ? asRecord(lc) : null;

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
  if (userId) {
    const { data: completion } = await supabase.from("lesson_completions").select("id").eq("lesson_id", lessonId).eq("user_id", userId).maybeSingle();
    completed = Boolean(completion);
    const { data: assignmentRows } = await supabase.from("assignment_submissions").select("status").eq("lesson_id", lessonId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
    assignmentStatus = str(asRecord((assignmentRows ?? [])[0])?.status) ?? null;
  }

  const contentWithLessonMeta = {
    ...(asRecord(content) ?? {}),
    lesson_objective: str(lr.objective) ?? null,
    lesson_summary: str(lr.summary) ?? null,
    lesson_estimated_duration: str(lr.estimated_duration) ?? null,
    lesson_learning_outcome: str(lr.learning_outcome) ?? null,
  };

  return { moduleTitle, lessonTitle: str(lr.title) ?? "Урок", content: contentWithLessonMeta, quizId, quizTitle: str(quiz?.title) ?? null, attemptsCount, bestScore, completed, assignmentStatus, error: null };
}

export async function fetchQuizForTaking(quizId: string): Promise<{ title: string; questions: QuizQuestionView[]; error: string | null }> {
  const { data: quiz, error: qErr } = await supabase.from("quizzes").select("id, title").eq("id", quizId).maybeSingle();
  if (qErr) return { title: "", questions: [], error: qErr.message };
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

    const { data: opts } = await supabase.from("answer_options").select("*").eq("question_id", qid).order("position", { ascending: true });

    const optionTexts: string[] = [];
    let correctIndex = 0;
    let i = 0;
    for (const o of opts ?? []) {
      const orow = asRecord(o);
      const t = str(orow?.answer_text) ?? str(orow?.text) ?? str(orow?.body) ?? str(orow?.label) ?? "";
      optionTexts.push(t);
      if (orow?.is_correct === true) correctIndex = i;
      i += 1;
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

export async function submitLessonAssignment(courseId: string, lessonId: string, text: string): Promise<{ error: Error | null; submission?: unknown; progress?: unknown }> {
  const { data, error } = await submitAssignmentViaFunction(courseId, lessonId, text);
  return { error: error ? new Error(error) : null, submission: data?.submission, progress: data?.progress };
}
