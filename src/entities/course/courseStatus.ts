/**
 * Единственный источник истины для статуса курса (`public.courses.status`).
 * Не определяйте параллельные union/enum для курса в других модулях — импортируйте отсюда.
 *
 * Жизненный цикл курса: `public.courses.status` (Supabase).
 *
 * Канонические переходы (бизнес-правила):
 * — создание записи курса → `draft`
 * — сгенерирован только план (есть структура, контент уроков пуст) → `plan`
 * — часть уроков с контентом, не все → `partial`
 * — все уроки с контентом → `ready`
 * — архивирование (явное действие) → `archived` (автоматически не снимается)
 *
 * Примечание: фактическое обновление строки в БД делается в сервисах курса
 * (`courseCreation.service`, `courseEditor.service` — sync/archive).
 */

export type CourseStatus = "draft" | "generating_plan" | "generating_lessons" | "generating_quizzes" | "qa_checking" | "plan" | "partial" | "ready" | "failed" | "archived";

export const COURSE_STATUS_VALUES = ["draft", "generating_plan", "generating_lessons", "generating_quizzes", "qa_checking", "plan", "partial", "ready", "failed", "archived"] as const satisfies readonly CourseStatus[];

export function isCourseStatus(v: string): v is CourseStatus {
  return (COURSE_STATUS_VALUES as readonly string[]).includes(v);
}

/** Подписи для списков курсов и карточек (авторский UI). */
export const COURSE_STATUS_UI: Record<
  CourseStatus,
  { label: string; dot: string; color: string; bg: string }
> = {
  draft: {
    label: "Новый",
    dot: "#8E9BAB",
    color: "#5C6B7A",
    bg: "rgba(142,155,171,0.08)",
  },
  generating_plan: {
    label: "Создаём план",
    dot: "#4A90E2",
    color: "#4A90E2",
    bg: "rgba(74,144,226,0.07)",
  },
  generating_lessons: {
    label: "Готовим уроки",
    dot: "#4A90E2",
    color: "#4A90E2",
    bg: "rgba(74,144,226,0.07)",
  },
  generating_quizzes: {
    label: "Создаём тест",
    dot: "#4A90E2",
    color: "#4A90E2",
    bg: "rgba(74,144,226,0.07)",
  },
  qa_checking: {
    label: "Проверяем качество",
    dot: "#4A90E2",
    color: "#4A90E2",
    bg: "rgba(74,144,226,0.07)",
  },
  plan: {
    label: "План готов",
    dot: "#4A90E2",
    color: "#4A90E2",
    bg: "rgba(74,144,226,0.07)",
  },
  partial: {
    label: "Создан частично",
    dot: "#F1C40F",
    color: "#D4A017",
    bg: "rgba(241,196,15,0.08)",
  },
  ready: {
    label: "Курс готов",
    dot: "#2ECC71",
    color: "#2ECC71",
    bg: "rgba(46,204,113,0.07)",
  },
  failed: {
    label: "Ошибка создания",
    dot: "#EF4444",
    color: "#B91C1C",
    bg: "rgba(239,68,68,0.08)",
  },
  archived: {
    label: "Архив",
    dot: "#9CA3AF",
    color: "#6B7280",
    bg: "rgba(156,163,175,0.1)",
  },
};

const LEGACY_STATUS_MAP: Record<string, CourseStatus> = {
  generated: "partial",
  "needs-review": "partial",
  "has-issues": "partial",
  empty: "draft",
};

/**
 * Приводит значение из БД или старых экранов к `CourseStatus`.
 * Неизвестные строки → `draft` (безопасный дефолт).
 */
export function normalizeCourseStatus(raw: unknown): CourseStatus {
  if (typeof raw !== "string" || raw.trim() === "") return "draft";
  const s = raw.trim();
  if (isCourseStatus(s)) return s;
  return LEGACY_STATUS_MAP[s] ?? "draft";
}

export interface CourseContentMetrics {
  moduleCount: number;
  lessonCount: number;
  filledCount: number;
}

/**
 * Выводит статус по наполненности (без учёта `archived`).
 * Используется в `syncCourseStatusFromContent` для выравнивания БД с фактом; не подменяет собой `courses.status` в UI.
 */
export function inferCourseStatusFromMetrics(m: CourseContentMetrics): Exclude<CourseStatus, "archived" | "generating_plan" | "generating_lessons" | "generating_quizzes" | "qa_checking" | "failed"> {
  if (m.moduleCount === 0 && m.lessonCount === 0) return "draft";
  if (m.lessonCount === 0) return "plan";
  if (m.filledCount === 0) return "plan";
  if (m.filledCount < m.lessonCount) return "partial";
  return "ready";
}
