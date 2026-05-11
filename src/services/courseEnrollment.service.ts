import { supabase } from "@/lib/supabase/client";
import { toUserErrorMessage } from "@/lib/errorMessages";

type Rec = Record<string, unknown>;

type InvokeResult<T> = { data: T | null; error: string | null };

export type CourseEnrollmentRole = "owner" | "learner";
export type CourseEnrollmentStatus = "active" | "invited" | "removed";

export type CourseLearner = {
  enrollmentId: string;
  userId: string;
  email: string;
  name: string;
  role: CourseEnrollmentRole;
  status: CourseEnrollmentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  progress: {
    completedLessonsCount: number;
    totalLessonsCount: number;
    completionPercent: number;
    updatedAt: string | null;
  } | null;
};

export type CourseLearnersPayload = {
  course: { id: string; title: string };
  learners: CourseLearner[];
};

function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function backendErrorMessage(value: unknown): string | null {
  const error = asRecord(asRecord(value)?.error);
  const message = error?.message;
  const code = error?.code;
  if (typeof message === "string" && message.trim()) return toUserErrorMessage({ error: { code, message } }, "Не удалось выполнить действие. Попробуйте ещё раз.");
  if (typeof code === "string" && code.trim()) return toUserErrorMessage({ error: { code } }, "Не удалось выполнить действие. Попробуйте ещё раз.");
  return null;
}

async function functionErrorMessage(error: unknown): Promise<string> {
  const e = error as { message?: string; context?: Response } | null;
  if (e?.context instanceof Response) {
    try {
      const payload = await e.context.clone().json();
      const message = backendErrorMessage(payload);
      if (message) return message;
    } catch {}
  }
  return toUserErrorMessage(e?.message ?? error, "Не удалось выполнить действие. Попробуйте ещё раз.");
}

async function invoke<T>(name: string, body: Rec): Promise<InvokeResult<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { data: null, error: "Войдите в систему." };

  const { data, error } = await supabase.functions.invoke<T | { error: unknown }>(name, {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) return { data: null, error: await functionErrorMessage(error) };
  const backendMessage = backendErrorMessage(data);
  if (backendMessage) return { data: null, error: backendMessage };
  return { data: (data as T) ?? null, error: null };
}

function mapLearner(raw: unknown): CourseLearner | null {
  const row = asRecord(raw);
  if (!row) return null;
  const progress = asRecord(row.progress);
  const userId = str(row.user_id);
  const email = str(row.email) ?? "email не указан";
  if (!userId) return null;
  return {
    enrollmentId: str(row.enrollment_id) ?? userId,
    userId,
    email,
    name: str(row.name) ?? email.split("@")[0],
    role: (str(row.role) as CourseEnrollmentRole | null) ?? "learner",
    status: (str(row.status) as CourseEnrollmentStatus | null) ?? "active",
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    progress: progress
      ? {
          completedLessonsCount: Math.max(0, Math.round(num(progress.completed_lessons_count))),
          totalLessonsCount: Math.max(0, Math.round(num(progress.total_lessons_count))),
          completionPercent: Math.max(0, Math.min(100, Math.round(num(progress.completion_percent)))),
          updatedAt: str(progress.updated_at),
        }
      : null,
  };
}

export async function listCourseLearners(courseId: string): Promise<InvokeResult<CourseLearnersPayload>> {
  const result = await invoke<{ course?: unknown; learners?: unknown[] }>("list-course-learners", { course_id: courseId });
  if (result.error || !result.data) return { data: null, error: result.error };
  const course = asRecord(result.data.course) ?? {};
  return {
    data: {
      course: { id: str(course.id) ?? courseId, title: str(course.title) ?? "Курс" },
      learners: (result.data.learners ?? []).map(mapLearner).filter(Boolean) as CourseLearner[],
    },
    error: null,
  };
}

export async function addCourseLearner(courseId: string, email: string): Promise<InvokeResult<CourseLearner>> {
  const result = await invoke<{ enrollment?: unknown; learner?: unknown }>("add-course-learner", { course_id: courseId, email });
  if (result.error || !result.data) return { data: null, error: result.error };
  const learner = asRecord(result.data.learner) ?? {};
  const enrollment = asRecord(result.data.enrollment) ?? {};
  const mapped = mapLearner({
    enrollment_id: enrollment.id,
    user_id: learner.id ?? enrollment.user_id,
    email: learner.email,
    name: learner.name,
    role: enrollment.role,
    status: enrollment.status,
    created_at: enrollment.created_at,
    updated_at: enrollment.updated_at,
    progress: null,
  });
  return { data: mapped, error: mapped ? null : "Не удалось прочитать добавленного обучающегося." };
}

export async function removeCourseLearner(courseId: string, userId: string): Promise<InvokeResult<{ removed: boolean }>> {
  const result = await invoke("remove-course-learner", { course_id: courseId, user_id: userId });
  if (result.error) return { data: null, error: result.error };
  return { data: { removed: true }, error: null };
}
