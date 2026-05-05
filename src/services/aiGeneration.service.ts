import { supabase } from "@/lib/supabase/client";
import { toUserErrorMessage } from "@/lib/errorMessages";

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
      if (backendCode) return toUserErrorMessage({ error: { code: backendCode, message: backendMessage } }, "Не удалось выполнить генерацию. Попробуйте ещё раз.");
      if (backendMessage) return toUserErrorMessage(backendMessage, "Не удалось выполнить генерацию. Попробуйте ещё раз.");
    } catch {
      // ignore and fall through to generic message
    }
  }

  if (typeof e?.message === "string" && e.message.trim()) return toUserErrorMessage(e.message, "Не удалось выполнить действие. Попробуйте ещё раз.");
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<AiServiceResult<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return { data: null, error: "Войдите в систему." };
  }

  const { data, error } = await supabase.functions.invoke<T | { error: unknown }>(name, {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) return { data: null, error: await errorMessage(error) };

  const backendMessage = extractBackendMessage(data);
  const backendCode = extractBackendErrorCode(data);
  if (backendMessage || backendCode) return { data: null, error: toUserErrorMessage({ error: { code: backendCode, message: backendMessage } }, "Не удалось выполнить действие. Попробуйте ещё раз.") };

  return { data: (data as T) ?? null, error: null };
}


export type GenerationSessionStatus = "pending" | "running" | "completed" | "partially_completed" | "failed" | "cancelled";

export interface GenerationSessionProgress {
  current_step: string;
  message: string;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  percent: number;
}

export interface GenerationSessionSummary {
  session_id: string;
  course_id: string;
  status: GenerationSessionStatus;
  generation_depth: string;
  progress: GenerationSessionProgress;
  result?: unknown;
  last_error_message: string | null;
  steps?: unknown[];
}

export const startGenerationSession = (courseId: string, options: { depth?: string; force?: boolean } = {}) =>
  invoke<GenerationSessionSummary>("start-generation-session", {
    course_id: courseId,
    generation_depth: "plan",
    force: Boolean(options.force),
  });

export const processGenerationStep = (sessionId: string) =>
  invoke<GenerationSessionSummary>("process-generation-step", { session_id: sessionId });

export const getGenerationSessionStatus = (sessionId: string) =>
  invoke<GenerationSessionSummary>("get-generation-session-status", { session_id: sessionId });

export const cancelGenerationSession = (sessionId: string) =>
  invoke<GenerationSessionSummary>("cancel-generation-session", { session_id: sessionId });

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function runCourseGenerationSession(
  courseId: string,
  options: { depth?: string; force?: boolean; delayMs?: number; maxIterations?: number } = {},
  onProgress?: (summary: GenerationSessionSummary) => void,
): Promise<AiServiceResult<GenerationSessionSummary>> {
  const started = await startGenerationSession(courseId, options);
  if (started.error || !started.data) return { data: null, error: toUserErrorMessage(started.error, "Не удалось начать создание курса. Попробуйте ещё раз.") };

  let summary = started.data;
  onProgress?.(summary);

  const maxIterations = options.maxIterations ?? 80;
  const delayMs = options.delayMs ?? 650;

  for (let i = 0; i < maxIterations; i += 1) {
    if (["completed", "partially_completed", "failed", "cancelled"].includes(summary.status)) {
      return { data: summary, error: summary.status === "failed" ? toUserErrorMessage(summary.last_error_message, "Не удалось завершить создание курса. Попробуйте ещё раз.") : null };
    }

    const processed = await processGenerationStep(summary.session_id);
    if (processed.error || !processed.data) {
      return { data: summary, error: toUserErrorMessage(processed.error, "Не удалось продолжить создание курса. Попробуйте ещё раз.") };
    }

    summary = processed.data;
    onProgress?.(summary);

    if (["completed", "partially_completed", "failed", "cancelled"].includes(summary.status)) {
      return { data: summary, error: summary.status === "failed" ? toUserErrorMessage(summary.last_error_message, "Не удалось завершить создание курса. Попробуйте ещё раз.") : null };
    }

    await wait(delayMs);
  }

  return { data: summary, error: "Создание курса занимает больше времени, чем ожидалось. Проверьте результат в списке курсов." };
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

export const generateCourse = (courseId: string, options: { depth?: string; force?: boolean } = {}) =>
  runCourseGenerationSession(courseId, options);

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
