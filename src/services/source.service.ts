import { supabase } from "@/lib/supabase/client";

export interface CourseSourceRow {
  id: string;
  course_id: string;
  source_type: "text" | "url" | "file" | string;
  raw_text: string | null;
  source_url: string | null;
  file_ref: string | null;
  only_source_mode: boolean;
  created_at: string;
}

function readableError(error: { message?: string } | null | undefined, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function createTextSource(
  courseId: string,
  rawText: string,
  onlySourceMode: boolean,
): Promise<{ source: CourseSourceRow | null; error: Error | null }> {
  const text = rawText.trim();
  const { data, error } = await supabase
    .from("sources")
    .insert({
      course_id: courseId,
      source_type: "text",
      raw_text: text,
      source_url: null,
      file_ref: null,
      only_source_mode: onlySourceMode,
    })
    .select("*")
    .maybeSingle();

  if (error) return { source: null, error: readableError(error, "Не удалось сохранить источник") };
  return { source: (data as CourseSourceRow | null) ?? null, error: null };
}

export async function getCourseSources(courseId: string): Promise<{ sources: CourseSourceRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (error) return { sources: [], error: readableError(error, "Не удалось загрузить источники") };
  return { sources: (data as CourseSourceRow[]) ?? [], error: null };
}

export async function updateTextSource(
  sourceId: string,
  rawText: string,
  onlySourceMode: boolean,
): Promise<{ source: CourseSourceRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("sources")
    .update({
      raw_text: rawText.trim(),
      only_source_mode: onlySourceMode,
    })
    .eq("id", sourceId)
    .eq("source_type", "text")
    .select("*")
    .maybeSingle();

  if (error) return { source: null, error: readableError(error, "Не удалось обновить источник") };
  return { source: (data as CourseSourceRow | null) ?? null, error: null };
}

export async function deleteSource(sourceId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("sources").delete().eq("id", sourceId);
  return { error: error ? readableError(error, "Не удалось удалить источник") : null };
}
