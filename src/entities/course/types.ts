/**
 * Central domain model for the course generation platform.
 * All pages and features reference these types; do not define
 * parallel copies in page or feature files.
 */

export type CourseStatus = "ready" | "generated" | "needs-review" | "has-issues" | "draft" | "empty";
export type LessonStatus = "ready" | "has-issues" | "generated" | "draft" | "empty";
export type BlockType = "text" | "example" | "practice" | "code";
export type QaSeverity = "low" | "medium" | "high";
export type VersionChangeType = "structure" | "content" | "quiz" | "rollback" | "creation";

/** ---- Course ---- */
export interface CourseMeta {
  id: string;
  title: string;
  status: CourseStatus;
  progressPercent: number;
  moduleCount: number;
  lessonCount: number;
  lastModified: string;
  qaScore: number | null;
}

export interface CourseEditorMeta {
  title: string;
  lastSaved: string;
  qaScore: number;
  version: string;
}

/** ---- Module / Lesson ---- */
export interface LessonSummary {
  id: string;
  title: string;
  status: LessonStatus;
  hasIssues: boolean;
  qaScore: number | null;
}

export interface ModuleSummary {
  id: string;
  title: string;
  progressPercent: number;
  lessons: LessonSummary[];
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
