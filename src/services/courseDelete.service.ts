import { supabase } from "@/lib/supabase/client";
import { toUserErrorMessage } from "@/lib/errorMessages";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

async function extractErrorMessage(error: unknown): Promise<string> {
  const e = error as { message?: string; context?: Response } | null;
  if (e?.context instanceof Response) {
    try {
      const payload = await e.context.clone().json();
      const backendError = asRecord(asRecord(payload)?.error);
      const message = backendError?.message;
      const code = backendError?.code;
      if ((typeof message === "string" && message.trim()) || typeof code === "string") return toUserErrorMessage({ error: { code, message } }, "Не удалось удалить курс. Попробуйте ещё раз.");
    } catch {
      // keep fallback
    }
  }
  if (typeof e?.message === "string" && e.message.trim()) return toUserErrorMessage(e.message, "Не удалось удалить курс. Попробуйте ещё раз.");
  return "Не удалось удалить курс. Попробуйте ещё раз.";
}

export async function deleteCourse(courseId: string): Promise<{ error: Error | null }> {
  const { data, error } = await supabase.functions.invoke<{ deleted_course_id?: string } | { error?: unknown }>("delete-course", {
    body: { course_id: courseId },
  });

  if (error) return { error: new Error(await extractErrorMessage(error)) };

  const backendError = asRecord(asRecord(data)?.error);
  const message = backendError?.message;
  const code = backendError?.code;
  if ((typeof message === "string" && message.trim()) || typeof code === "string") return { error: new Error(toUserErrorMessage({ error: { code, message } }, "Не удалось удалить курс. Попробуйте ещё раз.")) };

  return { error: null };
}
