/**
 * Central domain model for the course generation platform.
 * All pages and features reference these types; do not define
 * parallel copies in page or feature files.
 *
 * Статус жизненного цикла курса (`public.courses.status`) — только из `./courseStatus`,
 * здесь не дублировать union и не реэкспортировать `CourseStatus` (импорт типа курса — из `courseStatus.ts`).
 *
 * Read-модели для экранов (дашборд, версии, QA, прогресс) — `./readModels`, не дублировать.
 */

/** Соответствует `public.courses.generation_depth` в Supabase. */
export type GenerationDepth = "plan" | "plan_lessons" | "full";

export const GENERATION_DEPTH_VALUES = ["plan", "plan_lessons", "full"] as const satisfies readonly GenerationDepth[];

/** Параметры экрана создания курса и подписи для обзора — одна точка правды. */
export const GENERATION_DEPTH_OPTIONS: ReadonlyArray<{
  value: GenerationDepth;
  label: string;
  description: string;
  badge?: string;
}> = [
  {
    value: "plan",
    label: "Только план",
    description: "Структура с модулями и уроками без материалов",
  },
  {
    value: "plan_lessons",
    label: "План и уроки",
    description: "Структура и материалы всех уроков",
  },
  {
    value: "full",
    label: "Полный курс",
    description: "Материалы уроков, задания, тест и проверка качества",
    badge: "Рекомендуется",
  },
];

export function generationDepthLabel(d: GenerationDepth): string {
  const opt = GENERATION_DEPTH_OPTIONS.find((o) => o.value === d);
  return opt?.label ?? d;
}

export function isGenerationDepth(v: unknown): v is GenerationDepth {
  return typeof v === "string" && (GENERATION_DEPTH_VALUES as readonly string[]).includes(v);
}

export type LessonStatus = "ready" | "has-issues" | "generated" | "draft" | "empty" | "edited";
export type BlockType = "text" | "example" | "practice" | "code";
export type QaSeverity = "low" | "medium" | "high";
export type VersionChangeType = "structure" | "content" | "quiz" | "rollback" | "creation";

/** ---- Course ---- */
export interface CourseMeta {
  id: string;
  title: string;
  status: import("./courseStatus").CourseStatus;
  progressPercent: number;
  moduleCount: number;
  lessonCount: number;
  lastModified: string;
  qaScore: number | null;
}

export interface CourseEditorMeta {
  title: string;
  topic?: string | null;
  level?: string | null;
  goal?: string | null;
  duration?: number | null;
  format?: string | null;
  language?: string | null;
  tone?: string | null;
  lastSaved: string;
  qaScore: number | null;
  /** Подпись текущей версии или `null`, пока версий нет. */
  version: string | null;
  generationMode?: string | null;
  sourceMode?: string | null;
  isSourceCourse?: boolean;
  onlySourceMode?: boolean;
}

/** ---- Module / Lesson ---- */
export interface LessonSummary {
  id: string;
  title: string;
  status: LessonStatus;
  hasIssues: boolean;
  qaScore: number | null;
  position?: number | null;
  moduleId?: string;
  objective?: string | null;
  summary?: string | null;
  estimatedDuration?: number | null;
  learningOutcome?: string | null;
}

export interface ModuleSummary {
  id: string;
  title: string;
  progressPercent: number;
  lessons: LessonSummary[];
  position?: number | null;
  description?: string | null;
  estimatedDuration?: number | null;
  practiceRequired?: boolean;
}

/** ---- Content blocks ---- */
export interface QaIssueOnBlock {
  severity: QaSeverity;
  message: string;
  suggestion: string;
}

export interface LessonBlock {
  id: string;
  type: BlockType;
  label: string;
  content: string;
  description?: string;
  aiGenerated: boolean;
  hasSource: boolean;
  qaIssue: QaIssueOnBlock | null;
}

export interface LessonContent {
  /** ID строки lesson_contents, нужен для перехода из QA-замечаний к уроку. */
  id?: string | null;
  goal: string | null;
  blocks: LessonBlock[];
}

/** ---- Plan ---- */
export interface PlanLesson {
  id: string;
  title: string;
  goal: string;
  duration: string;
}

export interface PlanModule {
  id: string;
  title: string;
  lessons: PlanLesson[];
}

export interface CoursePlan {
  title: string;
  level: string;
  duration: string;
  goal: string;
  modules: PlanModule[];
}

/** ---- Versions ---- */
export interface VersionEntry {
  id: string;
  date: string;
  type: VersionChangeType;
  typeLabel: string;
  description: string;
  author: string;
  changes: { added: number; modified: number; deleted: number };
  qaScore: number;
  isCurrent?: boolean;
}

/** ---- QA ---- */
export interface QaIssue {
  id: string;
  severity: QaSeverity;
  category: string;
  lesson: string;
  lessonId: string;
  blockId?: string;
  module: string;
  moduleId: string;
  description: string;
  suggestion: string;
  status: "active" | "fixing" | "fixed" | "needs-recheck";
}

export interface QaReport {
  overallScore: number;
  lastCheck: string;
  categories: Array<{
    name: string;
    score: number;
    status: string;
    risk: "low" | "medium" | "high";
  }>;
  issues: QaIssue[];
  recommendations: string[];
}

/** ---- Player ---- */
export interface PlayerLesson {
  id: string;
  title: string;
  completed: boolean;
  current?: boolean;
}

export interface PlayerModule {
  id: string;
  title: string;
  lessons: PlayerLesson[];
}

export interface PlayerCourse {
  title: string;
  currentLessonId: string;
  modules: PlayerModule[];
}
