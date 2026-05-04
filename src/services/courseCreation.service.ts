/**
 * Создание курса: единственная точка RPC `create_course_draft`.
 */
import { supabase } from "@/lib/supabase/client";
import type { CreateCourseDraftInput } from "@/entities/course/createCourseDraft";
import { mapCreateCourseDraftInputToRpcPayload } from "@/entities/course/createCourseDraft";

function parseCreateCourseDraftRpcResult(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string" && data.length > 0) return data;
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    if (typeof o.id === "string") return o.id;
    if (typeof o.course_id === "string") return o.course_id;
    if (typeof o.create_course_draft === "string") return o.create_course_draft;
  }
  return null;
}

/**
 * Вход — канонический `CreateCourseDraftInput` (форма маппится в UI-слое).
 * Прямой insert в `courses` не используется; автор — `auth.uid()` в БД.
 */
export async function createCourseDraft(
  input: CreateCourseDraftInput
): Promise<{ id: string | null; error: Error | null }> {
  const payload = mapCreateCourseDraftInputToRpcPayload(input);
  const { data, error } = await supabase.rpc("create_course_draft", payload);
  if (error) return { id: null, error };
  const id = parseCreateCourseDraftRpcResult(data);
  if (!id) return { id: null, error: new Error("create_course_draft: пустой ответ") };
  return { id, error: null };
}
