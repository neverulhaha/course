import { supabase } from "@/lib/supabase/client";

type Rec = Record<string, unknown>;

function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : null;
}
function messageFromBackend(value: unknown): string | null {
  const error = asRecord(asRecord(value)?.error);
  const message = error?.message;
  const code = error?.code;
  if (typeof message === "string" && message.trim()) return typeof code === "string" && code.trim() ? `${message} (${code})` : message;
  return null;
}
async function invoke<T>(name: string, body: Rec): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<T | { error: unknown }>(name, { body });
  if (error) {
    if (error.context instanceof Response) {
      try {
        const payload = await error.context.clone().json();
        const message = messageFromBackend(payload);
        if (message) return { data: null, error: message };
      } catch {}
    }
    return { data: null, error: error.message || "Не удалось выполнить действие" };
  }
  const backendMessage = messageFromBackend(data);
  if (backendMessage) return { data: null, error: backendMessage };
  return { data: data as T, error: null };
}

export const completeLesson = (courseId: string, lessonId: string) =>
  invoke<{ completion: unknown; progress: unknown }>("complete-lesson", { course_id: courseId, lesson_id: lessonId });

export const submitAssignment = (courseId: string, lessonId: string, submissionText: string) =>
  invoke<{ submission: unknown; progress: unknown; progress_warning?: string | null }>("submit-assignment", {
    course_id: courseId,
    lesson_id: lessonId,
    submission_text: submissionText,
  });

export const recalculateProgress = (courseId: string, lastOpenedLessonId?: string | null) =>
  invoke<{ progress: unknown }>("recalculate-progress", { course_id: courseId, last_opened_lesson_id: lastOpenedLessonId ?? null });
