import { supabase } from "@/lib/supabase/client";

export type AiBlockType = "theory_text" | "examples_text" | "practice_text" | "checklist_text";
export type AiBlockCommand = "shorten" | "simplify" | "add_examples" | "add_practice" | "expand" | "improve_clarity" | "custom";

export interface AiServiceResult<T> {
  data: T | null;
  error: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function extractBackendMessage(value: unknown): string | null {
  const root = asRecord(value);
  const error = asRecord(root?.error);
  const message = error?.message;
  return typeof message === "string" && message.trim() ? message : null;
}

function extractBackendErrorCode(value: unknown): string | null {
  const root = asRecord(value);
  const error = asRecord(root?.error);
  const code = error?.code;
  return typeof code === "string" && code.trim() ? code : null;
}

async function errorMessage(error: unknown): Promise<string> {
  const e = error as { message?: string; context?: Response } | null;

  if (e?.context instanceof Response) {
    try {
      const payload = await e.context.clone().json();
      const backendMessage = extractBackendMessage(payload);
      const backendCode = extractBackendErrorCode(payload);
      if (backendMessage && backendCode) return `${backendMessage} (${backendCode})`;
      if (backendMessage) return backendMessage;
    } catch {
      // ignore and fall through to generic message
    }
  }

  if (typeof e?.message === "string" && e.message.trim()) return e.message;
  return "Ошибка backend-функции";
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<AiServiceResult<T>> {
  const { data, error } = await supabase.functions.invoke<T | { error: unknown }>(name, { body });

  if (error) return { data: null, error: await errorMessage(error) };

  const backendMessage = extractBackendMessage(data);
  if (backendMessage) return { data: null, error: backendMessage };

  return { data: (data as T) ?? null, error: null };
}

export const generateCoursePlan = (courseId: string, options: { force?: boolean } = {}) =>
  invoke<{ course_id: string; modules: unknown[]; source_mode?: boolean; only_source_mode?: boolean; source_warnings?: string[]; warnings?: string[] }>("generate-course-plan", {
    course_id: courseId,
    force: Boolean(options.force),
  });

export const generateLessonContent = (courseId: string, lessonId: string) =>
  invoke<{ lesson_content: unknown; version_id: string | null; source_mode?: boolean; only_source_mode?: boolean; source_warnings?: string[]; warnings?: string[] }>("generate-lesson-content", {
    course_id: courseId,
    lesson_id: lessonId,
  });

export const generateCourseContent = (courseId: string, options: { moduleId?: string; force?: boolean } = {}) =>
  invoke<{
    course_id: string;
    generated_lessons: string[];
    skipped_lessons: string[];
    failed_lessons: unknown[];
    course_status: string;
    version_id: string | null;
    source_mode?: boolean;
    only_source_mode?: boolean;
    source_warnings?: string[];
  }>("generate-course-content", {
    course_id: courseId,
    module_id: options.moduleId ?? null,
    force: Boolean(options.force),
  });

export type RegenerateLessonBlockPayload = {
  courseId: string;
  lessonId: string;
  blockType: AiBlockType;
  command: AiBlockCommand;
  customInstruction?: string;
};

export type RegenerateLessonBlockResult = {
  lesson_id: string;
  block_type: AiBlockType;
  command: AiBlockCommand;
  updated_text: string;
  change_summary: string;
  lesson_content: unknown;
  version_id: string | null;
  source_mode?: boolean;
  only_source_mode?: boolean;
  source_warnings?: string[];
  warnings?: string[];
};

export const regenerateLessonBlock = ({
  courseId,
  lessonId,
  blockType,
  command,
  customInstruction,
}: RegenerateLessonBlockPayload) =>
  invoke<RegenerateLessonBlockResult>("regenerate-lesson-block", {
    course_id: courseId,
    lesson_id: lessonId,
    block_type: blockType,
    command,
    custom_instruction: customInstruction?.trim() || undefined,
  });
