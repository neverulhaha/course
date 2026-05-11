/**
 * Чтение курсов для списков, карточек, метрик и страницы «Мои курсы».
 * Клиент использует только пользовательский anon/session контекст Supabase.
 */
import { supabase } from "@/lib/supabase/client";
import type { CourseStatus } from "@/entities/course/courseStatus";
import { normalizeCourseStatus } from "@/entities/course/courseStatus";
import type { CourseContentMetrics } from "@/entities/course/courseStatus";
import { lessonContentRowHasContent } from "@/entities/course/lessonContentJson";
import type { DashboardCourse } from "@/entities/course/readModels";
import { formatRuDate, formatRuDateTime } from "@/lib/dateFormat";
import { asRecord, num, str } from "@/services/dbRowUtils";
import { toUserErrorMessage } from "@/lib/errorMessages";

export type { DashboardCourse };

export type MyCourseListItem = {
  id: string;
  title: string;
  topic: string;
  status: CourseStatus;
  createdAt: string | null;
  updatedAt: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  lastOpenedAt: string | null;
  lastOpenedAtLabel: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  moduleCount: number;
  lessonCount: number;
  filledLessonCount: number;
  lastOpenedLessonId: string | null;
  lastOpenedLessonTitle: string | null;
  nextRecommendedLessonId: string | null;
  nextRecommendedLessonTitle: string | null;
  qaScore: number | null;
  currentVersionId: string | null;
  accessRole: "owner" | "learner";
  courseType: string | null;
};

export type MyCoursesQueryResult = {
  courses: MyCourseListItem[];
  error: Error | null;
};

type CourseRowLite = {
  id: string;
  title: string | null;
  topic: string | null;
  author_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  status: string | null;
  current_version_id: string | null;
  course_type?: string | null;
  accessRole?: "owner" | "learner";
};

type ModuleRowLite = {
  id: string;
  course_id: string;
  position: number | null;
};

type LessonRowLite = {
  id: string;
  module_id: string;
  title: string | null;
  position: number | null;
  content_status: string | null;
};

type ProgressRowLite = {
  course_id: string;
  completed_lessons_count: number | null;
  total_lessons_count: number | null;
  completion_percent: number | null;
  last_opened_lesson_id: string | null;
  next_recommended_lesson_id: string | null;
  updated_at: string | null;
};

function clampPercent(value: unknown): number {
  const n = Math.round(num(value) ?? 0);
  return Math.max(0, Math.min(100, n));
}

function compareNullableIsoDesc(a: string | null, b: string | null) {
  const at = a ? new Date(a).getTime() : 0;
  const bt = b ? new Date(b).getTime() : 0;
  return bt - at;
}

function safeError(error: unknown, fallback: string): Error {
  return new Error(toUserErrorMessage(error, fallback));
}

export async function fetchCourseContentMetrics(courseId: string): Promise<CourseContentMetrics> {
  const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseId);
  const mids = (modules ?? []).map((m: unknown) => str(asRecord(m)?.id)).filter(Boolean) as string[];
  if (mids.length === 0) return { moduleCount: 0, lessonCount: 0, filledCount: 0 };

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, content_status")
    .in("module_id", mids);

  const lessonRows = lessons ?? [];
  const lessonIds = lessonRows.map((l: unknown) => str(asRecord(l)?.id)).filter(Boolean) as string[];
  const lessonCount = lessonIds.length;

  let filled = lessonRows.filter((l: unknown) => {
    const status = str(asRecord(l)?.content_status);
    return status === "generated" || status === "edited";
  }).length;

  if (filled === 0 && lessonIds.length > 0) {
    const { data: contents } = await supabase
      .from("lesson_contents")
      .select("lesson_id, theory_text, examples_text, practice_text, checklist_text")
      .in("lesson_id", lessonIds);
    filled = (contents ?? []).filter((row: unknown) => lessonContentRowHasContent(row)).length;
  }

  return { moduleCount: mids.length, lessonCount, filledCount: filled };
}

export async function listMyCourses(authorId: string): Promise<MyCoursesQueryResult> {
  const { data: ownedRows, error: coursesError } = await supabase
    .from("courses")
    .select("id, title, topic, author_id, created_at, updated_at, status, current_version_id, course_type")
    .eq("author_id", authorId)
    .order("updated_at", { ascending: false });

  if (coursesError) return { courses: [], error: safeError(coursesError, "Не удалось загрузить курсы") };

  const courseById = new Map<string, CourseRowLite>();
  for (const course of (ownedRows ?? []) as CourseRowLite[]) {
    if (course.id) courseById.set(course.id, { ...course, accessRole: "owner" });
  }

  const { data: enrollmentRows, error: enrollmentsError } = await supabase
    .from("course_enrollments")
    .select("course_id, role, status")
    .eq("user_id", authorId)
    .eq("status", "active");

  if (enrollmentsError && !/course_enrollments|relation/i.test(enrollmentsError.message ?? "")) {
    return { courses: [], error: safeError(enrollmentsError, "Не удалось загрузить доступные курсы") };
  }

  const enrollmentRoleByCourse = new Map<string, "owner" | "learner">();
  for (const row of enrollmentRows ?? []) {
    const rec = asRecord(row);
    const courseId = str(rec?.course_id);
    const role = str(rec?.role) === "owner" ? "owner" : "learner";
    if (courseId) enrollmentRoleByCourse.set(courseId, role);
  }

  const enrolledCourseIds = [...enrollmentRoleByCourse.keys()].filter((id) => !courseById.has(id));
  if (enrolledCourseIds.length > 0) {
    const { data: enrolledCourses, error: enrolledCoursesError } = await supabase
      .from("courses")
      .select("id, title, topic, author_id, created_at, updated_at, status, current_version_id, course_type")
      .in("id", enrolledCourseIds);
    if (enrolledCoursesError) return { courses: [], error: safeError(enrolledCoursesError, "Не удалось загрузить назначенные курсы") };
    for (const course of (enrolledCourses ?? []) as CourseRowLite[]) {
      if (!course.id) continue;
      courseById.set(course.id, { ...course, accessRole: enrollmentRoleByCourse.get(course.id) ?? "learner" });
    }
  }

  const courses = [...courseById.values()];
  if (courses.length === 0) return { courses: [], error: null };

  const courseIds = courses.map((course) => course.id).filter(Boolean);

  const { data: moduleRows, error: modulesError } = await supabase
    .from("modules")
    .select("id, course_id, position")
    .in("course_id", courseIds);
  if (modulesError) return { courses: [], error: safeError(modulesError, "Не удалось загрузить структуру курсов") };

  const modules = (moduleRows ?? []) as ModuleRowLite[];
  const moduleIds = modules.map((module) => module.id).filter(Boolean);

  const { data: lessonRows, error: lessonsError } = moduleIds.length > 0
    ? await supabase
        .from("lessons")
        .select("id, module_id, title, position, content_status")
        .in("module_id", moduleIds)
    : { data: [] as LessonRowLite[], error: null };
  if (lessonsError) return { courses: [], error: safeError(lessonsError, "Не удалось загрузить уроки") };

  const lessons = (lessonRows ?? []) as LessonRowLite[];
  const lessonIds = lessons.map((lesson) => lesson.id).filter(Boolean);

  const { data: contentRows, error: contentError } = lessonIds.length > 0
    ? await supabase
        .from("lesson_contents")
        .select("lesson_id, theory_text, examples_text, practice_text, checklist_text")
        .in("lesson_id", lessonIds)
    : { data: [] as unknown[], error: null };
  if (contentError) return { courses: [], error: safeError(contentError, "Не удалось загрузить наполнение уроков") };

  const { data: progressRows, error: progressError } = await supabase
    .from("progress")
    .select("course_id, completed_lessons_count, total_lessons_count, completion_percent, last_opened_lesson_id, next_recommended_lesson_id, updated_at")
    .eq("user_id", authorId)
    .in("course_id", courseIds);
  if (progressError) return { courses: [], error: safeError(progressError, "Не удалось загрузить прогресс") };

  const { data: completionRows, error: completionError } = lessonIds.length > 0
    ? await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", authorId)
        .in("lesson_id", lessonIds)
    : { data: [] as unknown[], error: null };
  if (completionError) return { courses: [], error: safeError(completionError, "Не удалось загрузить завершённые уроки") };

  const { data: qaRows } = await supabase
    .from("qa_reports")
    .select("course_id, total_score, created_at")
    .in("course_id", courseIds)
    .order("created_at", { ascending: false });

  const modulesByCourse = new Map<string, ModuleRowLite[]>();
  for (const module of modules) {
    const arr = modulesByCourse.get(module.course_id) ?? [];
    arr.push(module);
    modulesByCourse.set(module.course_id, arr);
  }

  const lessonsByModule = new Map<string, LessonRowLite[]>();
  const lessonById = new Map<string, LessonRowLite>();
  for (const lesson of lessons) {
    const arr = lessonsByModule.get(lesson.module_id) ?? [];
    arr.push(lesson);
    lessonsByModule.set(lesson.module_id, arr);
    lessonById.set(lesson.id, lesson);
  }

  const contentByLesson = new Map<string, unknown>();
  for (const row of contentRows ?? []) {
    const rr = asRecord(row);
    const lessonId = str(rr?.lesson_id);
    if (lessonId) contentByLesson.set(lessonId, row);
  }

  const completedLessonIds = new Set((completionRows ?? []).map((row: unknown) => str(asRecord(row)?.lesson_id)).filter(Boolean) as string[]);

  const progressByCourse = new Map<string, ProgressRowLite>();
  for (const progress of progressRows ?? []) {
    const row = progress as ProgressRowLite;
    if (row.course_id) progressByCourse.set(row.course_id, row);
  }

  const latestQaByCourse = new Map<string, number>();
  for (const qa of qaRows ?? []) {
    const row = asRecord(qa);
    const courseId = str(row?.course_id);
    if (!courseId || latestQaByCourse.has(courseId)) continue;
    const score = num(row?.total_score);
    if (score != null) latestQaByCourse.set(courseId, Math.round(score));
  }

  const result: MyCourseListItem[] = courses.map((course) => {
    const courseModules = [...(modulesByCourse.get(course.id) ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const courseLessons = courseModules.flatMap((module) => [...(lessonsByModule.get(module.id) ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    const totalLessons = courseLessons.length;
    const filledLessons = courseLessons.filter((lesson) => {
      const status = lesson.content_status;
      return status === "generated" || status === "edited" || lessonContentRowHasContent(contentByLesson.get(lesson.id));
    }).length;
    const completedLessons = courseLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
    const progress = progressByCourse.get(course.id);
    const storedTotal = Math.max(0, Math.round(num(progress?.total_lessons_count) ?? 0));
    const storedCompleted = Math.max(0, Math.round(num(progress?.completed_lessons_count) ?? 0));
    const hasStoredProgress = Boolean(progress && (storedTotal > 0 || progress.completion_percent != null));
    const progressTotal = hasStoredProgress ? storedTotal : totalLessons;
    const progressCompleted = hasStoredProgress ? storedCompleted : completedLessons;
    const progressPercent = hasStoredProgress
      ? clampPercent(progress?.completion_percent)
      : totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    const lastOpenedLessonId = progress?.last_opened_lesson_id && lessonById.has(progress.last_opened_lesson_id) ? progress.last_opened_lesson_id : null;
    const nextRecommendedLessonId = progress?.next_recommended_lesson_id && lessonById.has(progress.next_recommended_lesson_id) ? progress.next_recommended_lesson_id : null;
    const nextFallbackId = courseLessons.find((lesson) => !completedLessonIds.has(lesson.id))?.id ?? courseLessons[0]?.id ?? null;
    const resolvedNextLessonId = nextRecommendedLessonId ?? nextFallbackId;
    const updatedAt = course.updated_at ?? course.created_at ?? null;

    return {
      id: course.id,
      title: course.title?.trim() || "Без названия",
      topic: course.topic?.trim() || "Тема не указана",
      status: normalizeCourseStatus(course.status),
      createdAt: course.created_at ?? null,
      updatedAt,
      createdAtLabel: formatRuDate(course.created_at),
      updatedAtLabel: formatRuDateTime(updatedAt),
      lastOpenedAt: progress?.updated_at ?? null,
      lastOpenedAtLabel: formatRuDateTime(progress?.updated_at),
      progressPercent,
      completedLessons: progressCompleted,
      totalLessons: progressTotal || totalLessons,
      moduleCount: courseModules.length,
      lessonCount: totalLessons,
      filledLessonCount: filledLessons,
      lastOpenedLessonId,
      lastOpenedLessonTitle: lastOpenedLessonId ? lessonById.get(lastOpenedLessonId)?.title?.trim() || "Урок" : null,
      nextRecommendedLessonId: resolvedNextLessonId,
      nextRecommendedLessonTitle: resolvedNextLessonId ? lessonById.get(resolvedNextLessonId)?.title?.trim() || "Урок" : null,
      qaScore: latestQaByCourse.get(course.id) ?? null,
      currentVersionId: course.current_version_id ?? null,
      accessRole: course.accessRole ?? (course.author_id === authorId ? "owner" : "learner"),
      courseType: course.course_type ?? null,
    };
  });

  result.sort((a, b) => compareNullableIsoDesc(a.updatedAt, b.updatedAt));
  return { courses: result, error: null };
}

export async function listDashboardCourses(authorId: string): Promise<{ courses: DashboardCourse[]; error: Error | null }> {
  const { courses, error } = await listMyCourses(authorId);
  if (error) return { courses: [], error };
  return {
    courses: courses.map((course) => ({
      id: course.id,
      title: course.title,
      status: course.status,
      progress: course.lessonCount === 0 ? 0 : Math.round((course.filledLessonCount / course.lessonCount) * 100),
      modules: course.moduleCount,
      lessons: course.lessonCount,
      lastModified: formatRuDate(course.updatedAt),
      qaScore: course.qaScore,
    })),
    error: null,
  };
}

export async function listRecentCourses(authorId: string, limit: number): Promise<{ items: { id: string; title: string }[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, updated_at")
    .eq("author_id", authorId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { items: [], error };
  return {
    items: (data ?? []).map((r: unknown) => {
      const row = asRecord(r);
      return { id: str(row?.id) ?? "", title: str(row?.title) ?? "Без названия" };
    }),
    error: null,
  };
}
