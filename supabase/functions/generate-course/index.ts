import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type Rec = Record<string, unknown>;
type GenerationDepth = "plan" | "plan_lessons" | "full";

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "COURSE_NOT_FOUND"
  | "INVALID_INPUT"
  | "GENERATION_DEPTH_INCOMPLETE"
  | "GENERATION_FAILED"
  | "DATABASE_ERROR";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class AppError extends Error {
  constructor(public code: ErrorCode, message: string, public status = 400, public details: Rec = {}) {
    super(message);
    this.name = "AppError";
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
  }
  const message = error instanceof Error ? error.message : String(error);
  return jsonResponse(
    { error: { code: "GENERATION_FAILED", message: "Не удалось завершить генерацию курса. Попробуйте ещё раз.", details: { message } } },
    500,
  );
}

function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Rec : null;
}
function clean(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}
function hasText(value: unknown): boolean {
  return clean(value).length > 0;
}
function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new AppError("GENERATION_FAILED", "Сервис временно недоступен", 500, { missing: name });
  return value;
}
function serviceClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function readJsonBody(req: Request): Promise<Rec> {
  const raw = await req.text();
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    const body = asRecord(parsed);
    if (!body) throw new Error("Body must be a JSON object");
    return body;
  } catch (error) {
    throw new AppError("INVALID_INPUT", "Некорректный запрос", 400, { message: error instanceof Error ? error.message : String(error) });
  }
}
async function getUserId(req: Request): Promise<string> {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) throw new AppError("UNAUTHORIZED", "Нужно войти в систему", 401);
  const authClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) throw new AppError("UNAUTHORIZED", "Сессия недействительна", 401);
  return data.user.id;
}
async function writeAuditLog(db: SupabaseClient, payload: { userId: string; courseId: string; action: string; metadata?: Rec }): Promise<void> {
  try {
    const { error } = await db.from("audit_logs").insert({
      actor_user_id: payload.userId,
      course_id: payload.courseId,
      entity_type: "course",
      entity_id: payload.courseId,
      action: payload.action,
      payload: payload.metadata ?? {},
    });
    if (error) console.warn("audit_logs insert failed", error.message);
  } catch (error) {
    console.warn("audit_logs insert failed", error);
  }
}
async function getOwnedCourse(db: SupabaseClient, courseId: string, userId: string): Promise<Rec> {
  const { data, error } = await db.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить курс", 500, { message: error.message });
  const course = asRecord(data);
  if (!course) throw new AppError("COURSE_NOT_FOUND", "Курс не найден", 404);
  if (clean(course.author_id) !== userId) throw new AppError("FORBIDDEN", "Нет доступа к курсу", 403);
  return course;
}
function normalizeDepth(value: unknown, fallback: unknown): GenerationDepth {
  const raw = clean(value) || clean(fallback) || "plan";
  if (raw === "plan" || raw === "plan_only") return "plan";
  if (raw === "plan_lessons" || raw === "lessons") return "plan_lessons";
  if (raw === "full" || raw === "full_course") return "full";
  throw new AppError("INVALID_INPUT", "Неизвестная глубина генерации", 400, { generation_depth: raw });
}
async function invokeInternal(req: Request, functionName: string, body: Rec): Promise<Rec> {
  const baseUrl = env("SUPABASE_URL").replace(/\/+$/, "");
  const authorization = req.headers.get("Authorization") ?? "";
  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      apikey: env("SUPABASE_ANON_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  const err = asRecord(asRecord(payload)?.error);
  if (!response.ok || err) {
    const code = (clean(err?.code) || "GENERATION_FAILED") as ErrorCode;
    throw new AppError(
      code,
      clean(err?.message) || "Не удалось выполнить этап генерации",
      response.ok ? 500 : response.status,
      { step: functionName, details: asRecord(err?.details) ?? {} },
    );
  }
  return asRecord(payload) ?? {};
}
async function loadMetrics(db: SupabaseClient, courseId: string): Promise<{
  moduleCount: number;
  lessonCount: number;
  filledLessonCount: number;
  courseQuizCount: number;
  qaReportCount: number;
  versionCount: number;
}> {
  const { data: modules, error: moduleError } = await db.from("modules").select("id").eq("course_id", courseId);
  if (moduleError) throw new AppError("DATABASE_ERROR", "Не удалось проверить структуру курса", 500, { message: moduleError.message });
  const moduleIds = (modules ?? []).map((row) => clean(asRecord(row)?.id)).filter(Boolean);
  const { data: lessons, error: lessonsError } = moduleIds.length
    ? await db.from("lessons").select("id").in("module_id", moduleIds)
    : { data: [] as unknown[], error: null };
  if (lessonsError) throw new AppError("DATABASE_ERROR", "Не удалось проверить уроки курса", 500, { message: lessonsError.message });
  const lessonIds = (lessons ?? []).map((row) => clean(asRecord(row)?.id)).filter(Boolean);
  const { data: contents, error: contentError } = lessonIds.length
    ? await db.from("lesson_contents").select("lesson_id, theory_text, examples_text, practice_text, checklist_text").in("lesson_id", lessonIds)
    : { data: [] as unknown[], error: null };
  if (contentError) throw new AppError("DATABASE_ERROR", "Не удалось проверить материалы уроков", 500, { message: contentError.message });
  const filledLessonIds = new Set((contents ?? []).filter((row) => {
    const rec = asRecord(row);
    return rec && (hasText(rec.theory_text) || hasText(rec.examples_text) || hasText(rec.practice_text) || hasText(rec.checklist_text));
  }).map((row) => clean(asRecord(row)?.lesson_id)).filter(Boolean));
  const { count: courseQuizCount, error: quizError } = await db.from("quizzes").select("*", { count: "exact", head: true }).eq("course_id", courseId).is("lesson_id", null);
  if (quizError) throw new AppError("DATABASE_ERROR", "Не удалось проверить тесты курса", 500, { message: quizError.message });
  const { count: qaReportCount, error: qaError } = await db.from("qa_reports").select("*", { count: "exact", head: true }).eq("course_id", courseId);
  if (qaError) throw new AppError("DATABASE_ERROR", "Не удалось проверить отчёт качества", 500, { message: qaError.message });
  const { count: versionCount, error: versionError } = await db.from("course_versions").select("*", { count: "exact", head: true }).eq("course_id", courseId);
  if (versionError) throw new AppError("DATABASE_ERROR", "Не удалось проверить версии курса", 500, { message: versionError.message });
  return {
    moduleCount: moduleIds.length,
    lessonCount: lessonIds.length,
    filledLessonCount: filledLessonIds.size,
    courseQuizCount: courseQuizCount ?? 0,
    qaReportCount: qaReportCount ?? 0,
    versionCount: versionCount ?? 0,
  };
}
function validateDepthResult(depth: GenerationDepth, metrics: Awaited<ReturnType<typeof loadMetrics>>): void {
  if (metrics.moduleCount < 1 || metrics.lessonCount < 1) {
    throw new AppError("GENERATION_DEPTH_INCOMPLETE", "Не удалось создать структуру курса", 500, { depth, metrics });
  }
  if ((depth === "plan_lessons" || depth === "full") && metrics.filledLessonCount < metrics.lessonCount) {
    throw new AppError("GENERATION_DEPTH_INCOMPLETE", "Курс создан частично: не все уроки получили материалы", 500, { depth, metrics });
  }
  if (depth === "full" && (metrics.courseQuizCount < 1 || metrics.qaReportCount < 1 || metrics.versionCount < 1)) {
    throw new AppError("GENERATION_DEPTH_INCOMPLETE", "Курс создан частично: не все этапы полного курса завершены", 500, { depth, metrics });
  }
}
async function setStatus(db: SupabaseClient, courseId: string, status: "plan" | "partial" | "ready"): Promise<void> {
  const { error } = await db.from("courses").update({ status }).eq("id", courseId);
  if (error) console.warn("course status update failed", error.message);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: { code: "INVALID_INPUT", message: "Метод не поддерживается", details: {} } }, 405);

  const db = serviceClient();
  let userId = "";
  let courseId = "";

  try {
    const body = await readJsonBody(req);
    userId = await getUserId(req);
    courseId = clean(body.course_id ?? body.courseId);
    if (!courseId) throw new AppError("INVALID_INPUT", "Нужно передать course_id", 400);

    const course = await getOwnedCourse(db, courseId, userId);
    const depth = normalizeDepth(body.generation_depth ?? body.generationDepth, course.generation_depth);
    const force = Boolean(body.force);
    const progress: Rec[] = [];

    await writeAuditLog(db, { userId, courseId, action: "generate_course_started", metadata: { generation_depth: depth, force } });

    let metrics = await loadMetrics(db, courseId);
    if (metrics.moduleCount === 0 || force) {
      progress.push({ step: "plan", status: "started" });
      const plan = await invokeInternal(req, "generate-course-plan", { course_id: courseId, force });
      progress.push({ step: "plan", status: "completed", version_id: clean(plan.version_id) || null });
    } else {
      progress.push({ step: "plan", status: "skipped" });
    }

    if (depth === "plan_lessons" || depth === "full") {
      progress.push({ step: "lessons", status: "started" });
      const content = await invokeInternal(req, "generate-course-content", { course_id: courseId, force, retry_count: 2 });
      progress.push({
        step: "lessons",
        status: Array.isArray(content.failed_lessons) && content.failed_lessons.length > 0 ? "partial" : "completed",
        generated_lessons: content.generated_lessons ?? [],
        skipped_lessons: content.skipped_lessons ?? [],
        failed_lessons: content.failed_lessons ?? [],
        version_id: clean(content.version_id) || null,
      });
    }

    if (depth === "full") {
      metrics = await loadMetrics(db, courseId);
      if (metrics.courseQuizCount === 0 || force) {
        progress.push({ step: "quiz", status: "started" });
        const quiz = await invokeInternal(req, "generate-course-quiz", { course_id: courseId, force, questions_count: 10 });
        progress.push({ step: "quiz", status: "completed", quiz_id: clean(quiz.quiz_id) || null, version_id: clean(quiz.version_id) || null });
      } else {
        progress.push({ step: "quiz", status: "skipped" });
      }

      progress.push({ step: "qa", status: "started" });
      const qa = await invokeInternal(req, "run-course-qa", { course_id: courseId });
      const report = asRecord(qa.report);
      progress.push({ step: "qa", status: "completed", report_id: clean(report?.id) || null });
    }

    const finalMetrics = await loadMetrics(db, courseId);
    try {
      validateDepthResult(depth, finalMetrics);
    } catch (error) {
      await setStatus(db, courseId, depth === "plan" ? "plan" : "partial");
      throw error;
    }

    await setStatus(db, courseId, depth === "plan" ? "plan" : "ready");
    await writeAuditLog(db, { userId, courseId, action: "generate_course_completed", metadata: { generation_depth: depth, metrics: finalMetrics, progress } });

    return jsonResponse({ course_id: courseId, generation_depth: depth, status: depth === "plan" ? "plan" : "ready", metrics: finalMetrics, progress });
  } catch (error) {
    if (courseId && userId) {
      await writeAuditLog(db, {
        userId,
        courseId,
        action: "generate_course_failed",
        metadata: { error_code: error instanceof AppError ? error.code : "GENERATION_FAILED", error_message: error instanceof Error ? error.message : "Unknown error" },
      });
    }
    return errorResponse(error);
  }
});
