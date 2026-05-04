import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type Rec = Record<string, unknown>;
export type GenerationDepth = "plan" | "plan_lessons" | "full";
export type SessionStatus = "pending" | "running" | "completed" | "partially_completed" | "failed" | "cancelled";
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled";

export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public details: Rec = {}) {
    super(message);
    this.name = "AppError";
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse({ error: { code: error.code, message: error.message, details: error.details ?? {} } }, error.status);
  }
  console.error(error);
  return jsonResponse({ error: { code: "GENERATION_FAILED", message: "Не удалось выполнить действие. Попробуйте ещё раз.", details: {} } }, 500);
}

export function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : null;
}

export function clean(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

export function hasText(value: unknown): boolean {
  return clean(value).length > 0;
}

export function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new AppError("SERVICE_UNAVAILABLE", "Сервис временно недоступен", 500, { missing: name });
  return value;
}

export function createAdminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readJson(req: Request): Promise<Rec> {
  if (req.method === "OPTIONS") return {};
  if (req.method !== "POST") throw new AppError("INVALID_INPUT", "Метод не поддерживается", 405);
  const raw = await req.text();
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    const body = asRecord(parsed);
    if (!body) throw new Error("Body must be a JSON object");
    return body;
  } catch {
    throw new AppError("INVALID_INPUT", "Некорректный запрос", 400);
  }
}

export function extractBearerToken(req: Request): string {
  const raw = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const first = raw.split(",").map((part) => part.trim()).find((part) => part.toLowerCase().startsWith("bearer ")) ?? "";
  const token = first.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new AppError("UNAUTHORIZED", "Нужно войти в систему", 401);
  return token;
}

export async function getAuthUser(req: Request, db: SupabaseClient): Promise<{ id: string }> {
  const token = extractBearerToken(req);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new AppError("UNAUTHORIZED", "Сессия недействительна", 401);
  return { id: data.user.id };
}

export function normalizeDepth(value: unknown, fallback: unknown = null): GenerationDepth {
  const raw = clean(value) || clean(fallback) || "plan";
  if (raw === "plan" || raw === "plan_only") return "plan";
  if (raw === "plan_lessons" || raw === "lessons") return "plan_lessons";
  if (raw === "full" || raw === "full_course") return "full";
  throw new AppError("INVALID_INPUT", "Неизвестная глубина создания курса", 400);
}

export async function loadOwnedCourse(db: SupabaseClient, courseId: string, userId: string): Promise<Rec> {
  if (!courseId) throw new AppError("INVALID_INPUT", "Не выбран курс", 400);
  const { data, error } = await db.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить курс", 500, { message: error.message });
  const course = asRecord(data);
  if (!course) throw new AppError("COURSE_NOT_FOUND", "Курс не найден", 404);
  if (clean(course.author_id) !== userId) throw new AppError("FORBIDDEN", "Нет доступа к курсу", 403);
  return course;
}

export async function writeAuditLog(db: SupabaseClient, input: { userId?: string; courseId?: string; action: string; entityType?: string; entityId?: string | null; metadata?: Rec }): Promise<void> {
  try {
    await db.from("audit_logs").insert({
      actor_user_id: input.userId ?? null,
      course_id: input.courseId ?? null,
      entity_type: input.entityType ?? "course",
      entity_id: input.entityId ?? input.courseId ?? null,
      action: input.action,
      payload: sanitizePayload(input.metadata ?? {}),
    });
  } catch (error) {
    console.warn("audit log skipped", error);
  }
}

function sanitizePayload(value: Rec): Rec {
  const blocked = new Set(["raw_text", "source_text", "stack", "SUPABASE_SERVICE_ROLE_KEY", "AI_API_KEY", "OPENAI_API_KEY"]);
  const out: Rec = {};
  for (const [key, raw] of Object.entries(value)) {
    if (blocked.has(key)) continue;
    if (typeof raw === "string" && raw.length > 4000) out[key] = `${raw.slice(0, 4000)}…`;
    else out[key] = raw;
  }
  return out;
}

export function stepTitle(stepType: string): string {
  switch (stepType) {
    case "prepare_source": return "Готовим материалы источника";
    case "generate_plan": return "Создаём план курса";
    case "generate_lesson_content": return "Готовим материалы уроков";
    case "generate_course_quiz": return "Создаём проверочные вопросы";
    case "run_course_qa": return "Проверяем качество курса";
    case "validate_plan":
    case "validate_lessons":
    case "validate_full": return "Сохраняем результат";
    default: return "Создаём курс";
  }
}

export async function updateCourseStatus(db: SupabaseClient, courseId: string, status: string): Promise<void> {
  const { error } = await db.from("courses").update({ status }).eq("id", courseId);
  if (error) console.warn("course status update skipped", error.message);
}

export async function loadCourseMetrics(db: SupabaseClient, courseId: string): Promise<Rec> {
  const { data: modules, error: moduleError } = await db.from("modules").select("id").eq("course_id", courseId);
  if (moduleError) throw new AppError("DATABASE_ERROR", "Не удалось проверить структуру курса", 500, { message: moduleError.message });
  const moduleIds = (modules ?? []).map((row) => clean(asRecord(row)?.id)).filter(Boolean);

  const { data: lessons, error: lessonError } = moduleIds.length
    ? await db.from("lessons").select("id").in("module_id", moduleIds)
    : { data: [] as unknown[], error: null };
  if (lessonError) throw new AppError("DATABASE_ERROR", "Не удалось проверить уроки курса", 500, { message: lessonError.message });
  const lessonIds = (lessons ?? []).map((row) => clean(asRecord(row)?.id)).filter(Boolean);

  const { data: contents, error: contentError } = lessonIds.length
    ? await db.from("lesson_contents").select("lesson_id, theory_text, examples_text, practice_text, checklist_text").in("lesson_id", lessonIds)
    : { data: [] as unknown[], error: null };
  if (contentError) throw new AppError("DATABASE_ERROR", "Не удалось проверить материалы уроков", 500, { message: contentError.message });
  const filledLessonIds = new Set((contents ?? [])
    .filter((row) => {
      const rec = asRecord(row);
      return rec && (hasText(rec.theory_text) || hasText(rec.examples_text) || hasText(rec.practice_text) || hasText(rec.checklist_text));
    })
    .map((row) => clean(asRecord(row)?.lesson_id))
    .filter(Boolean));

  const { count: courseQuizCount, error: quizError } = await db.from("quizzes").select("*", { count: "exact", head: true }).eq("course_id", courseId).is("lesson_id", null);
  if (quizError) throw new AppError("DATABASE_ERROR", "Не удалось проверить тесты курса", 500, { message: quizError.message });
  const { count: qaReportCount, error: qaError } = await db.from("qa_reports").select("*", { count: "exact", head: true }).eq("course_id", courseId);
  if (qaError) throw new AppError("DATABASE_ERROR", "Не удалось проверить проверку качества", 500, { message: qaError.message });
  const { count: versionCount, error: versionError } = await db.from("course_versions").select("*", { count: "exact", head: true }).eq("course_id", courseId);
  if (versionError) throw new AppError("DATABASE_ERROR", "Не удалось проверить версии", 500, { message: versionError.message });

  return {
    module_count: moduleIds.length,
    lesson_count: lessonIds.length,
    filled_lesson_count: filledLessonIds.size,
    empty_lesson_count: Math.max(0, lessonIds.length - filledLessonIds.size),
    course_quiz_count: courseQuizCount ?? 0,
    qa_report_count: qaReportCount ?? 0,
    version_count: versionCount ?? 0,
  };
}

export function validateMetrics(depth: GenerationDepth, metrics: Rec): { ok: boolean; message: string; courseStatus: string; sessionStatus: SessionStatus } {
  const moduleCount = Number(metrics.module_count ?? 0);
  const lessonCount = Number(metrics.lesson_count ?? 0);
  const filledCount = Number(metrics.filled_lesson_count ?? 0);
  const quizCount = Number(metrics.course_quiz_count ?? 0);
  const qaCount = Number(metrics.qa_report_count ?? 0);
  const versionCount = Number(metrics.version_count ?? 0);

  if (moduleCount < 1 || lessonCount < 1) {
    return { ok: false, message: "Не удалось создать структуру курса", courseStatus: "failed", sessionStatus: "failed" };
  }
  if (depth === "plan") {
    return { ok: true, message: "План готов", courseStatus: "plan", sessionStatus: "completed" };
  }
  if (filledCount < lessonCount) {
    return { ok: false, message: "Курс создан частично: не все уроки получили материалы", courseStatus: "partial", sessionStatus: "partially_completed" };
  }
  if (depth === "plan_lessons") {
    return { ok: true, message: "Материалы готовы", courseStatus: "ready", sessionStatus: "completed" };
  }
  if (quizCount < 1 || qaCount < 1 || versionCount < 1) {
    return { ok: false, message: "Курс создан частично: не все этапы завершены", courseStatus: "partial", sessionStatus: "partially_completed" };
  }
  return { ok: true, message: "Курс готов", courseStatus: "ready", sessionStatus: "completed" };
}

export async function insertStep(db: SupabaseClient, input: {
  sessionId: string;
  courseId: string;
  stepType: string;
  stepOrder: number;
  entityType?: string | null;
  entityId?: string | null;
  inputJson?: Rec;
  maxAttempts?: number;
}): Promise<void> {
  const { error } = await db.from("generation_steps").insert({
    session_id: input.sessionId,
    course_id: input.courseId,
    step_type: input.stepType,
    step_order: input.stepOrder,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    status: "pending",
    attempt_count: 0,
    max_attempts: input.maxAttempts ?? 1,
    input_json: input.inputJson ?? {},
  });
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось подготовить создание курса", 500, { message: error.message });
}

export async function addMessage(db: SupabaseClient, input: { sessionId: string; stepId?: string | null; role: string; content: unknown; metadata?: Rec }): Promise<void> {
  try {
    await db.from("generation_messages").insert({
      session_id: input.sessionId,
      step_id: input.stepId ?? null,
      role: input.role,
      content: typeof input.content === "string" ? input.content : JSON.stringify(input.content, null, 2),
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.warn("generation message skipped", error);
  }
}

export async function summarizeSession(db: SupabaseClient, sessionId: string): Promise<Rec> {
  const { data: session, error: sessionError } = await db.from("generation_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (sessionError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить создание курса", 500, { message: sessionError.message });
  const sessionRec = asRecord(session);
  if (!sessionRec) throw new AppError("SESSION_NOT_FOUND", "Создание курса не найдено", 404);

  const { data: steps, error: stepsError } = await db.from("generation_steps").select("*").eq("session_id", sessionId).order("step_order", { ascending: true });
  if (stepsError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить этапы создания курса", 500, { message: stepsError.message });
  const stepRows = (steps ?? []).map((row) => asRecord(row)).filter(Boolean) as Rec[];
  const total = stepRows.length;
  const completed = stepRows.filter((s) => ["completed", "skipped"].includes(clean(s.status))).length;
  const failed = stepRows.filter((s) => clean(s.status) === "failed").length;
  const running = stepRows.find((s) => clean(s.status) === "running");
  const next = running ?? stepRows.find((s) => clean(s.status) === "pending") ?? stepRows.find((s) => clean(s.status) === "failed" && Number(s.attempt_count ?? 0) < Number(s.max_attempts ?? 1));
  const currentStep = clean(next?.step_type) || clean(sessionRec.current_step) || "";

  return {
    session_id: clean(sessionRec.id),
    course_id: clean(sessionRec.course_id),
    status: clean(sessionRec.status),
    generation_depth: clean(sessionRec.generation_depth),
    progress: {
      current_step: currentStep,
      message: userMessageForSession(clean(sessionRec.status), currentStep),
      total_steps: total,
      completed_steps: completed,
      failed_steps: failed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    result: asRecord(sessionRec.result_json) ?? {},
    last_error_message: clean(sessionRec.last_error_message) || null,
    steps: stepRows.map((s) => ({
      id: clean(s.id),
      type: clean(s.step_type),
      title: stepTitle(clean(s.step_type)),
      status: clean(s.status),
      attempt_count: Number(s.attempt_count ?? 0),
      max_attempts: Number(s.max_attempts ?? 1),
      error_message: clean(s.error_message) || null,
      entity_type: clean(s.entity_type) || null,
      entity_id: clean(s.entity_id) || null,
    })),
  };
}

export function userMessageForSession(status: string, currentStep: string): string {
  if (status === "completed") return "Курс готов";
  if (status === "partially_completed") return "Курс создан частично";
  if (status === "failed") return "Не удалось завершить создание курса";
  if (status === "cancelled") return "Создание курса остановлено";
  return stepTitle(currentStep);
}

export function debugErrorPayload(error: unknown): Rec {
  if (error instanceof AppError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details ?? {},
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { message: String(error) };
}

export async function invokeFunction(req: Request, functionName: string, body: Rec): Promise<Rec> {
  const baseUrl = env("SUPABASE_URL").replace(/\/+$/, "");
  const authorization = `Bearer ${extractBearerToken(req)}`;
  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      apikey: env("SUPABASE_ANON_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawPayload = await response.text();
  let payload: unknown = {};
  try {
    payload = rawPayload ? JSON.parse(rawPayload) : {};
  } catch {
    payload = {};
  }

  const error = asRecord(asRecord(payload)?.error);
  if (!response.ok || error) {
    throw new AppError(
      clean(error?.code) || "GENERATION_FAILED",
      clean(error?.message) || "Не удалось выполнить этап создания курса",
      response.ok ? 500 : response.status,
      {
        function_name: functionName,
        status: response.status,
        status_text: response.statusText,
        details: asRecord(error?.details) ?? {},
        response_preview: rawPayload.slice(0, 2000),
      },
    );
  }
  return asRecord(payload) ?? {};
}
