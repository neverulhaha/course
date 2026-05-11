import type { CourseStatus } from "@/entities/course/courseStatus";
import type { CourseAudienceType, GenerationDepth } from "@/entities/course/types";

export interface ProfileRow {
  id: string;
  email?: string | null;
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  provider?: "email" | "google" | "unknown" | string | null;
  app_role?: "student" | "teacher" | "author" | "learner" | "admin" | string | null;
  hide_learning_navigation?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface CourseRow {
  id: string;
  author_id: string;
  title: string;
  topic: string;
  level: string;
  goal: string | null;
  duration: number | null;
  format: string;
  generation_mode: string;
  source_mode: string | null;
  language: string | null;
  tone: string | null;
  status: CourseStatus;
  generation_depth: GenerationDepth;
  course_type?: CourseAudienceType | string | null;
  current_version_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ModuleRow {
  id: string;
  course_id: string;
  title: string;
  position: number;
  description: string | null;
  practice_required: boolean;
  estimated_duration: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  position: number;
  objective: string | null;
  summary: string | null;
  estimated_duration: number | null;
  learning_outcome: string | null;
  content_status: "empty" | "generated" | "edited" | string;
  created_at?: string;
  updated_at?: string;
}

export interface LessonContentRow {
  id: string;
  lesson_id: string;
  theory_text: string | null;
  examples_text: string | null;
  practice_text: string | null;
  checklist_text: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface QuizRow {
  id: string;
  course_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  created_at?: string;
}

export interface QuestionRow {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  explanation: string | null;
  position: number;
}

export interface AnswerOptionRow {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  position: number;
}

export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number | null;
  attempt_number: number;
  result_data: Record<string, unknown> | null;
  created_at?: string;
}

export interface LessonCompletionRow {
  id: string;
  lesson_id: string;
  user_id: string;
  completed_at?: string;
}

export interface AssignmentSubmissionRow {
  id: string;
  lesson_id: string;
  user_id: string;
  submission_text: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProgressRow {
  id: string;
  user_id: string;
  course_id: string;
  completed_lessons_count: number;
  total_lessons_count: number;
  completion_percent: number;
  last_opened_lesson_id: string | null;
  next_recommended_lesson_id: string | null;
  updated_at?: string;
}


export interface CourseEnrollmentRow {
  id: string;
  course_id: string;
  user_id: string;
  role: "owner" | "learner" | string;
  status: "active" | "invited" | "removed" | string;
  invited_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface QaReportRow {
  id: string;
  course_id: string;
  version_id: string | null;
  structure_score: number | null;
  coherence_score: number | null;
  level_match_score: number | null;
  source_alignment_score: number | null;
  total_score: number | null;
  issues_json: Record<string, unknown> | unknown[] | string | null;
  recommendations_json: Record<string, unknown> | unknown[] | string | null;
  created_at?: string;
}

export interface CourseVersionRow {
  id: string;
  course_id: string;
  version_number: number;
  change_type: string;
  change_description: string | null;
  qa_score: number | null;
  created_at?: string;
  created_by: string | null;
  snapshot_data: Record<string, unknown> | null;
}

export interface CourseListRow {
  id: string;
  author_id: string;
  title: string;
  topic: string | null;
  status: CourseStatus | "error" | "failed" | string;
  current_version_id?: string | null;
  course_type?: CourseAudienceType | string | null;
  created_at?: string;
  updated_at?: string;
}

export type AccessStatusRow = "ok" | "forbidden" | "not_found" | "unauthorized" | "error";
