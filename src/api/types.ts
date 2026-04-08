/** DTOs aligned with a typical course-generation backend */

export type CourseId = string;
export type LessonId = string;
export type ModuleId = string;
export type VersionId = string;

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  emailVerifiedAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface CourseSummary {
  id: CourseId;
  title: string;
  status: string;
  progressPercent: number;
  moduleCount: number;
  lessonCount: number;
  lastModified: string;
  qaScore: number | null;
}

export interface GenerationJob {
  id: string;
  courseId: CourseId;
  status: "queued" | "running" | "succeeded" | "failed";
  progressPercent: number;
  currentStepLabel?: string;
  errorMessage?: string;
}

export interface QaIssueDto {
  id: string;
  severity: "low" | "medium" | "high";
  category: string;
  lessonId: LessonId;
  blockId?: string;
  description: string;
  suggestion: string;
  status: "active" | "fixing" | "fixed" | "needs-recheck";
}

export interface QaReportDto {
  courseId: CourseId;
  overallScore: number;
  lastCheckAt: string;
  issues: QaIssueDto[];
}

export interface CourseVersionDto {
  id: VersionId;
  courseId: CourseId;
  label: string;
  createdAt: string;
  author: string;
  changelog?: string;
}
