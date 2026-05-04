import { supabase } from "@/lib/supabase/client";
import { toUserErrorMessage } from "@/lib/errorMessages";
import { getCourseAccessStatus } from "@/services/accessControl.service";

export type CourseProgress = {
  id?: string;
  userId: string;
  courseId: string;
  completedLessonsCount: number;
  totalLessonsCount: number;
  completionPercent: number;
  lastOpenedLessonId: string | null;
  nextRecommendedLessonId: string | null;
  updatedAt: string | null;
};

export type CourseLearningLesson = {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  position: number;
  modulePosition: number;
};

export type CourseLearningStats = {
  progress: CourseProgress;
  quizAttemptsCount: number;
  completedQuizzesCount: number;
  averageQuizScore: number | null;
  bestQuizScore: number | null;
  lastOpenedLesson: CourseLearningLesson | null;
  nextRecommendedLesson: CourseLearningLesson | null;
};

type Rec = Record<string, unknown>;
type InvokeResult<T> = { data: T | null; error: string | null };

function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function str(value: unknown): string | null {
  const cleaned = asString(value).trim();
  return cleaned || null;
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}


async function ensureCourseAccess(courseId: string): Promise<string | null> {
  const access = await getCourseAccessStatus(courseId);
  if (access.status === "ok") return null;
  if (access.status === "unauthorized") return "Войдите в систему.";
  if (access.status === "forbidden") return "У вас нет доступа к этому разделу.";
  if (access.status === "not_found") return "Курс не найден.";
  return access.error ?? "Не удалось проверить доступ к курсу.";
}

function messageFromBackend(value: unknown): string | null {
  const error = asRecord(asRecord(value)?.error);
  const message = error?.message;
  const code = error?.code;
  if (typeof message === "string" && message.trim()) return toUserErrorMessage({ error: { code, message } }, "Не удалось выполнить действие. Попробуйте ещё раз.");
  if (typeof code === "string" && code.trim()) return toUserErrorMessage({ error: { code } }, "Не удалось выполнить действие. Попробуйте ещё раз.");
  return null;
}

function mapProgress(raw: unknown, fallbackUserId: string, fallbackCourseId: string): CourseProgress {
  const row = asRecord(raw) ?? {};
  const completedLessonsCount = Math.max(0, Math.round(num(row.completed_lessons_count) ?? 0));
  const totalLessonsCount = Math.max(0, Math.round(num(row.total_lessons_count) ?? 0));
  const completionPercent = Math.max(0, Math.min(100, Math.round(num(row.completion_percent) ?? 0)));

  return {
    id: str(row.id) ?? undefined,
    userId: str(row.user_id) ?? fallbackUserId,
    courseId: str(row.course_id) ?? fallbackCourseId,
    completedLessonsCount,
    totalLessonsCount,
    completionPercent,
    lastOpenedLessonId: str(row.last_opened_lesson_id),
    nextRecommendedLessonId: str(row.next_recommended_lesson_id),
    updatedAt: str(row.updated_at),
  };
}

async function currentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

async function invoke<T>(name: string, body: Rec): Promise<InvokeResult<T>> {
  const { data, error } = await supabase.functions.invoke<T | { error: unknown }>(name, { body });
  if (error) {
    if (error.context instanceof Response) {
      try {
        const payload = await error.context.clone().json();
        const message = messageFromBackend(payload);
        if (message) return { data: null, error: message };
      } catch {}
    }
    return { data: null, error: toUserErrorMessage(error, "Не удалось выполнить действие. Попробуйте ещё раз.") };
  }
  const backendMessage = messageFromBackend(data);
  if (backendMessage) return { data: null, error: backendMessage };
  return { data: data as T, error: null };
}

async function getOrderedCourseLessons(courseId: string): Promise<CourseLearningLesson[]> {
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("id, title, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true });
  if (modulesError) throw modulesError;

  const result: CourseLearningLesson[] = [];
  for (const module of modules ?? []) {
    const mr = asRecord(module);
    const moduleId = str(mr?.id);
    if (!moduleId) continue;

    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, title, position")
      .eq("module_id", moduleId)
      .order("position", { ascending: true });
    if (lessonsError) throw lessonsError;

    for (const lesson of lessons ?? []) {
      const lr = asRecord(lesson);
      const lessonId = str(lr?.id);
      if (!lessonId) continue;
      result.push({
        id: lessonId,
        title: str(lr?.title) ?? "Урок",
        moduleId,
        moduleTitle: str(mr?.title) ?? "Модуль",
        position: Math.round(num(lr?.position) ?? result.length + 1),
        modulePosition: Math.round(num(mr?.position) ?? 0),
      });
    }
  }
  return result;
}

async function getStoredProgress(courseId: string, userId: string): Promise<CourseProgress | null> {
  const { data, error } = await supabase
    .from("progress")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProgress(data, userId, courseId) : null;
}

async function getCompletedLessonIds(lessonIds: string[], userId: string): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);
  if (error) throw error;
  return new Set((data ?? []).map((row) => str(asRecord(row)?.lesson_id)).filter(Boolean) as string[]);
}

async function calculateLocalProgress(courseId: string, userId: string, lastOpenedLessonId?: string | null): Promise<CourseProgress> {
  const lessons = await getOrderedCourseLessons(courseId);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const completed = await getCompletedLessonIds(lessonIds, userId);
  const totalLessonsCount = lessonIds.length;
  const completedLessonsCount = completed.size;
  const completionPercent = totalLessonsCount === 0 ? 0 : Math.round((completedLessonsCount / totalLessonsCount) * 100);
  const stored = await getStoredProgress(courseId, userId).catch(() => null);
  const validLastOpened = lastOpenedLessonId && lessonIds.includes(lastOpenedLessonId) ? lastOpenedLessonId : null;
  const storedLastOpened = stored?.lastOpenedLessonId && lessonIds.includes(stored.lastOpenedLessonId) ? stored.lastOpenedLessonId : null;

  return {
    id: stored?.id,
    userId,
    courseId,
    completedLessonsCount,
    totalLessonsCount,
    completionPercent,
    lastOpenedLessonId: validLastOpened ?? storedLastOpened ?? lessonIds[0] ?? null,
    nextRecommendedLessonId: lessonIds.find((id) => !completed.has(id)) ?? null,
    updatedAt: stored?.updatedAt ?? null,
  };
}

export const completeLesson = (courseId: string, lessonId: string) =>
  invoke<{ completion: unknown; progress: unknown }>("complete-lesson", { course_id: courseId, lesson_id: lessonId });

export const submitAssignment = (courseId: string, lessonId: string, submissionText: string) =>
  invoke<{ submission: unknown; progress: unknown; progress_warning?: string | null }>("submit-assignment", {
    course_id: courseId,
    lesson_id: lessonId,
    submission_text: submissionText,
  });

export async function recalculateProgress(courseId: string, lastOpenedLessonId?: string | null): Promise<InvokeResult<{ progress: CourseProgress }>> {
  const userId = await currentUserId();
  if (!userId) return { data: null, error: "Нужно войти в систему" };
  const accessError = await ensureCourseAccess(courseId);
  if (accessError) return { data: null, error: accessError };
  const result = await invoke<{ progress: unknown }>("recalculate-progress", { course_id: courseId, last_opened_lesson_id: lastOpenedLessonId ?? null });
  if (result.error) return { data: null, error: result.error };
  return { data: { progress: mapProgress(result.data?.progress, userId, courseId) }, error: null };
}

export async function getCourseProgress(courseId: string): Promise<InvokeResult<{ progress: CourseProgress }>> {
  const userId = await currentUserId();
  if (!userId) return { data: null, error: "Нужно войти в систему" };
  const accessError = await ensureCourseAccess(courseId);
  if (accessError) return { data: null, error: accessError };
  const stored = await getStoredProgress(courseId, userId).catch(() => null);
  if (stored) return { data: { progress: stored }, error: null };
  try {
    const progress = await calculateLocalProgress(courseId, userId);
    return { data: { progress }, error: null };
  } catch {
    return { data: null, error: "Не удалось загрузить прогресс" };
  }
}

export async function getNextRecommendedLesson(courseId: string): Promise<InvokeResult<{ lesson: CourseLearningLesson | null }>> {
  const stats = await getCourseLearningStats(courseId);
  if (stats.error) return { data: null, error: stats.error };
  return { data: { lesson: stats.data?.nextRecommendedLesson ?? null }, error: null };
}

export async function getCourseLearningStats(courseId: string): Promise<InvokeResult<CourseLearningStats>> {
  const userId = await currentUserId();
  if (!userId) return { data: null, error: "Нужно войти в систему" };
  const accessError = await ensureCourseAccess(courseId);
  if (accessError) return { data: null, error: accessError };

  try {
    const lessons = await getOrderedCourseLessons(courseId);
    const lessonIds = lessons.map((lesson) => lesson.id);
    const stored = await getStoredProgress(courseId, userId).catch(() => null);
    const progress = stored ?? await calculateLocalProgress(courseId, userId);
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const lastOpenedLesson = progress.lastOpenedLessonId ? lessonById.get(progress.lastOpenedLessonId) ?? null : null;
    const nextRecommendedLesson = progress.nextRecommendedLessonId ? lessonById.get(progress.nextRecommendedLessonId) ?? null : null;

    const quizRows: unknown[] = [];
    const { data: courseQuizzes, error: courseQuizError } = await supabase.from("quizzes").select("id").eq("course_id", courseId);
    if (courseQuizError) throw courseQuizError;
    quizRows.push(...(courseQuizzes ?? []));

    if (lessonIds.length > 0) {
      const { data: lessonQuizzes, error: lessonQuizError } = await supabase.from("quizzes").select("id").in("lesson_id", lessonIds);
      if (lessonQuizError) throw lessonQuizError;
      quizRows.push(...(lessonQuizzes ?? []));
    }

    const quizIds = [...new Set(quizRows.map((row) => str(asRecord(row)?.id)).filter(Boolean))] as string[];
    let scores: number[] = [];
    let attemptedQuizIds = new Set<string>();
    if (quizIds.length > 0) {
      const { data: attempts, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, score")
        .eq("user_id", userId)
        .in("quiz_id", quizIds);
      if (attemptsError) throw attemptsError;
      scores = (attempts ?? []).map((row) => num(asRecord(row)?.score)).filter((score): score is number => score != null);
      attemptedQuizIds = new Set((attempts ?? []).map((row) => str(asRecord(row)?.quiz_id)).filter(Boolean) as string[]);
    }

    return {
      data: {
        progress,
        quizAttemptsCount: scores.length,
        completedQuizzesCount: attemptedQuizIds.size,
        averageQuizScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
        bestQuizScore: scores.length ? Math.max(...scores) : null,
        lastOpenedLesson,
        nextRecommendedLesson,
      },
      error: null,
    };
  } catch {
    return { data: null, error: "Не удалось загрузить статистику обучения" };
  }
}

export function getContinueLessonId(progress: Pick<CourseProgress, "lastOpenedLessonId" | "nextRecommendedLessonId"> | null | undefined): string | null {
  return progress?.lastOpenedLessonId ?? progress?.nextRecommendedLessonId ?? null;
}
