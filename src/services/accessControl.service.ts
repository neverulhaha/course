import { supabase } from "@/lib/supabase/client";
import { toUserErrorMessage } from "@/lib/errorMessages";

export type AccessStatus = "ok" | "forbidden" | "not_found" | "unauthorized" | "error";

function normalizeStatus(value: unknown): AccessStatus {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "ok" || raw === "forbidden" || raw === "not_found" || raw === "unauthorized") return raw;
  return "error";
}

function accessErrorMessage(status: AccessStatus, fallback = "Не удалось проверить доступ.") {
  if (status === "unauthorized") return "Войдите в систему.";
  if (status === "forbidden") return "У вас нет доступа к этому разделу.";
  if (status === "not_found") return "Данные не найдены.";
  return fallback;
}

export function isAccessDeniedStatus(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return raw === "forbidden" || raw === "нет доступа" || raw.includes("forbidden") || raw.includes("нет доступа");
}

export function isNotFoundStatus(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return raw === "not_found" || raw === "404" || raw.includes("not_found") || raw.includes("не найден");
}

export function accessStatusToPageError(status: AccessStatus): "forbidden" | "not_found" | "auth" | "error" | null {
  if (status === "ok") return null;
  if (status === "forbidden") return "forbidden";
  if (status === "not_found") return "not_found";
  if (status === "unauthorized") return "auth";
  return "error";
}

export async function getCourseAccessStatus(courseId: string): Promise<{ status: AccessStatus; error: string | null }> {
  const { data, error } = await supabase.rpc("get_course_access_status", { p_course_id: courseId });
  if (error) return { status: "error", error: toUserErrorMessage(error, "Не удалось проверить доступ к курсу.") };
  const status = normalizeStatus(data);
  return { status, error: status === "error" ? accessErrorMessage(status) : null };
}

export async function getLessonAccessStatus(lessonId: string, courseId?: string | null): Promise<{ status: AccessStatus; error: string | null }> {
  const { data, error } = await supabase.rpc("get_lesson_access_status", {
    p_lesson_id: lessonId,
    p_course_id: courseId || null,
  });
  if (error) return { status: "error", error: toUserErrorMessage(error, "Не удалось проверить доступ к уроку.") };
  const status = normalizeStatus(data);
  return { status, error: status === "error" ? accessErrorMessage(status) : null };
}

export async function getModuleAccessStatus(moduleId: string, courseId?: string | null): Promise<{ status: AccessStatus; error: string | null }> {
  const { data, error } = await supabase.rpc("get_module_access_status", {
    p_module_id: moduleId,
    p_course_id: courseId || null,
  });
  if (error) return { status: "error", error: toUserErrorMessage(error, "Не удалось проверить доступ к модулю.") };
  const status = normalizeStatus(data);
  return { status, error: status === "error" ? accessErrorMessage(status) : null };
}

export async function getQuizAccessStatus(quizId: string, courseId?: string | null): Promise<{ status: AccessStatus; error: string | null }> {
  const { data, error } = await supabase.rpc("get_quiz_access_status", {
    p_quiz_id: quizId,
    p_course_id: courseId || null,
  });
  if (error) return { status: "error", error: toUserErrorMessage(error, "Не удалось проверить доступ к квизу.") };
  const status = normalizeStatus(data);
  return { status, error: status === "error" ? accessErrorMessage(status) : null };
}

export async function getVersionAccessStatus(versionId: string, courseId?: string | null): Promise<{ status: AccessStatus; error: string | null }> {
  const { data, error } = await supabase.rpc("get_version_access_status", {
    p_version_id: versionId,
    p_course_id: courseId || null,
  });
  if (error) return { status: "error", error: toUserErrorMessage(error, "Не удалось проверить доступ к версии.") };
  const status = normalizeStatus(data);
  return { status, error: status === "error" ? accessErrorMessage(status) : null };
}
