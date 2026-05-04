/**
 * Read-модели для UI (не сырые строки БД). Канонические имена для экранов.
 */
import type { CourseStatus } from "./courseStatus";
import type { CourseEditorMeta, LessonContent, ModuleSummary } from "./types";

/** Список курсов на дашборде автора. */
export interface DashboardCourse {
  id: string;
  title: string;
  status: CourseStatus;
  progress: number;
  modules: number;
  lessons: number;
  lastModified: string;
  qaScore: number | null;
}

/** Источник курса, отображаемый в редакторе. */
export interface CourseSourceSummary {
  id: string;
  sourceType: "text" | "url" | "file" | string;
  label: string;
  description: string;
  onlySourceMode: boolean;
  rawTextLength: number;
  isTooShort?: boolean;
  warnings?: string[];
}

/** Бандл редактора: мета + дерево + контент по урокам. */
export interface CourseEditorBundle {
  meta: CourseEditorMeta;
  modules: ModuleSummary[];
  lessonContentByLessonId: Map<string, LessonContent>;
  sources: CourseSourceSummary[];
}

export interface PlanLessonRow {
  id: string;
  title: string;
  goal: string;
  duration: string;
}

export interface PlanModuleRow {
  id: string;
  title: string;
  lessons: PlanLessonRow[];
}

export interface QaCategoryView {
  name: string;
  score: number;
}

export interface QaIssueView {
  id: string;
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  lesson: string;
  module: string;
  courseId: string;
  description: string;
  suggestion: string;
}

/** Элемент списка версий (экран VersionHistory). */
export type VersionChangeTypeUi =
  | "creation"
  | "content"
  | "structure"
  | "quiz"
  | "qa"
  | "rollback"
  | "generation";

export interface VersionListItem {
  id: string;
  date: string;
  type: VersionChangeTypeUi;
  description: string;
  author: string;
  changes: { added: number; modified: number; deleted: number };
  qaScore: number | null;
  isCurrent?: boolean;
}

export interface CourseProgressView {
  id: string;
  title: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastActivity: string;
  quizScores: number[];
  completed?: boolean;
  nextLesson?: string;
}

export interface ActivityView {
  type: "lesson" | "quiz" | "assignment";
  title: string;
  course: string;
  score?: number;
  date: string;
}

export interface PlayerCourseData {
  title: string;
  currentLessonId: string;
  modules: { id: string; title: string; lessons: { id: string; title: string; completed: boolean; current?: boolean }[] }[];
}

export interface QuizQuestionView {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}
