/**
 * Правила первой версии курса (`public.course_versions`).
 * Курс создаётся без версии; первая версия — только после содержательного состояния.
 */
import type { CourseContentMetrics } from "@/entities/course/courseStatus";

/** Хранится в `course_versions.change_type` для первой версии. */
export type FirstVersionChangeKind = "initial_generation_plan" | "initial_generation_content";

export const FIRST_VERSION_DESCRIPTIONS: Record<FirstVersionChangeKind, string> = {
  initial_generation_plan: "Первая версия после генерации плана",
  initial_generation_content: "Первая версия после первичной генерации контента",
};

/**
 * Курс «достоин» первой версии: есть хотя бы один урок в структуре или заполненный контент урока.
 * Модуль без уроков или только метаданные без структуры — не создаём версию.
 */
export function isCourseVersionable(metrics: CourseContentMetrics): boolean {
  if (metrics.lessonCount >= 1) return true;
  if (metrics.filledCount >= 1) return true;
  return false;
}

/**
 * Тип первой версии по факту наполненности (после синка с БД).
 * Ручные сохранения в редакторе без отдельного persist-слоя пока не различаются:
 * при появлении структуры/контента в БД сработает тот же sync и эта эвристика.
 */
export function resolveFirstVersionChangeKind(metrics: CourseContentMetrics): FirstVersionChangeKind | null {
  if (!isCourseVersionable(metrics)) return null;
  if (metrics.filledCount > 0) return "initial_generation_content";
  return "initial_generation_plan";
}
