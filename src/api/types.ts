/**
 * DTO для HTTP-клиента к бэкенду курсов. Идентичность пользователя — Supabase Auth (`auth.users.id`).
 * Не путать с удалённой таблицей public.users (legacy).
 */

import type { CourseStatus } from "@/entities/course/courseStatus";

export type CourseId = string;
export type LessonId = string;
export type ModuleId = string;
export type VersionId = string;

/** Ответ старого REST API (если подключат бэкенд); для UI использовать Supabase User + public.profiles. */
export interface ApiUserDto {
  id: string;
  email: string;
  name: string;
  role?: string;
  emailVerifiedAt?: string | null;
}

/** @deprecated Используйте ApiUserDto; имя User конфликтует с Supabase User. */
export type User = ApiUserDto;

/** Legacy: кастомные JWT; актуальная сессия — Supabase session. */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface CourseSummary {
  id: CourseId;
  title: string;
  status: CourseStatus;
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
