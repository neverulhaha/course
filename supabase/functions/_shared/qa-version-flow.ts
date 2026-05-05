import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "COURSE_NOT_FOUND"
  | "INVALID_INPUT"
  | "DATABASE_ERROR"
  | "AI_RESPONSE_INVALID"
  | "GENERATION_FAILED"
  | "QA_FAILED"
  | "QA_RESPONSE_INVALID"
  | "VERSION_NOT_FOUND"
  | "VERSION_SNAPSHOT_INVALID"
  | "VERSION_RESTORE_FAILED"
  | "RESTORE_BLOCKED";

export class AppError extends Error {
  code: AppErrorCode;
  status: number;
  details: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, status = 400, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return jsonResponse({ error: { code: error.code, message: error.message, details: error.details ?? {} } }, error.status);
  }
  console.error(error);
  return jsonResponse({ error: { code: "DATABASE_ERROR", message: "Внутренняя ошибка сервера", details: {} } }, 500);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function clean(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

export async function readJson(req: Request) {
  if (req.method === "OPTIONS") return null;
  if (req.method !== "POST") throw new AppError("INVALID_INPUT", "Метод не поддерживается", 405);
  const raw = await req.text();
  if (!raw.trim()) throw new AppError("INVALID_INPUT", "Пустое тело запроса", 400);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("INVALID_INPUT", "Некорректный JSON в теле запроса", 400);
  }
}

export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new AppError("DATABASE_ERROR", "Не настроены переменные Supabase", 500);
  return createClient(url, key, { auth: { persistSession: false } });
}

export function extractBearerToken(req: Request): string {
  const raw = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const firstBearer = raw
    .split(",")
    .map((part) => part.trim())
    .find((part) => /^Bearer\s+/i.test(part));

  const token = (firstBearer ?? raw).replace(/^Bearer\s+/i, "").trim();
  if (!token || token.includes(",")) {
    throw new AppError("UNAUTHORIZED", "Требуется авторизация", 401);
  }
  return token;
}

export async function getAuthUser(req: Request, supabaseAdmin: any) {
  const token = extractBearerToken(req);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new AppError("UNAUTHORIZED", "Сессия недействительна", 401);
  return data.user;
}

export function asUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError("INVALID_INPUT", `Некорректный ${field}`, 400);
  }
  return value;
}

export async function loadOwnedCourse(supabaseAdmin: any, courseId: string, userId: string) {
  const { data: course, error } = await supabaseAdmin.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить курс", 500, { message: error.message });
  if (!course) throw new AppError("COURSE_NOT_FOUND", "Курс не найден", 404);
  if (course.author_id !== userId) throw new AppError("FORBIDDEN", "Нет доступа к курсу", 403);
  return course;
}

export async function writeAuditLog(input: {
  supabaseAdmin: any;
  userId?: string | null;
  courseId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const payload = sanitizeMetadata(input.metadata ?? {});
    await input.supabaseAdmin.from("audit_logs").insert({
      actor_user_id: input.userId ?? null,
      course_id: input.courseId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      action: input.action,
      payload,
    });
  } catch (error) {
    console.warn("audit_log_insert_failed", error);
  }
}

function sanitizeMetadata(value: Record<string, unknown>) {
  const blocked = new Set(["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "JWT", "raw_text", "snapshot_data", "stack"]);
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (blocked.has(key)) continue;
    if (typeof val === "string" && val.length > 4000) out[key] = `${val.slice(0, 4000)}…`;
    else out[key] = val;
  }
  return out;
}

export async function loadCourseSnapshot(supabaseAdmin: any, courseId: string) {
  const { data: course, error: courseError } = await supabaseAdmin.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (courseError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить курс", 500, { message: courseError.message });
  if (!course) throw new AppError("COURSE_NOT_FOUND", "Курс не найден", 404);

  const { data: modules } = await supabaseAdmin.from("modules").select("*").eq("course_id", courseId).order("position", { ascending: true });
  const moduleIds = (modules ?? []).map((m: any) => m.id);

  const { data: lessons } = moduleIds.length
    ? await supabaseAdmin.from("lessons").select("*").in("module_id", moduleIds).order("position", { ascending: true })
    : { data: [] };
  const lessonIds = (lessons ?? []).map((l: any) => l.id);

  const { data: lessonContents } = lessonIds.length
    ? await supabaseAdmin.from("lesson_contents").select("*").in("lesson_id", lessonIds)
    : { data: [] };

  const { data: sources } = await supabaseAdmin.from("sources").select("*").eq("course_id", courseId);

  const { data: courseQuizzes } = await supabaseAdmin.from("quizzes").select("*").eq("course_id", courseId);
  const { data: lessonQuizzes } = lessonIds.length
    ? await supabaseAdmin.from("quizzes").select("*").in("lesson_id", lessonIds)
    : { data: [] };
  const quizMap = new Map<string, any>();
  for (const q of [...(courseQuizzes ?? []), ...(lessonQuizzes ?? [])]) quizMap.set(q.id, q);
  const quizzes = [...quizMap.values()];
  const quizIds = quizzes.map((q: any) => q.id);

  const { data: questions } = quizIds.length
    ? await supabaseAdmin.from("questions").select("*").in("quiz_id", quizIds).order("position", { ascending: true })
    : { data: [] };
  const questionIds = (questions ?? []).map((q: any) => q.id);

  const { data: answerOptions } = questionIds.length
    ? await supabaseAdmin.from("answer_options").select("*").in("question_id", questionIds).order("position", { ascending: true })
    : { data: [] };

  const { data: qaReports } = await supabaseAdmin.from("qa_reports").select("*").eq("course_id", courseId).order("created_at", { ascending: false }).limit(10);

  return {
    schema_version: 1,
    captured_at: new Date().toISOString(),
    course,
    modules: modules ?? [],
    lessons: lessons ?? [],
    lesson_contents: lessonContents ?? [],
    sources: sources ?? [],
    quizzes,
    questions: questions ?? [],
    answer_options: answerOptions ?? [],
    qa_reports: qaReports ?? [],
  };
}

export async function createCourseVersion(input: {
  supabaseAdmin: any;
  courseId: string;
  userId: string;
  changeType: string;
  changeDescription: string;
  qaScore?: number | null;
  auditMetadata?: Record<string, unknown>;
}) {
  const snapshot = await loadCourseSnapshot(input.supabaseAdmin, input.courseId);
  const { data: maxRows, error: maxError } = await input.supabaseAdmin
    .from("course_versions")
    .select("version_number")
    .eq("course_id", input.courseId)
    .order("version_number", { ascending: false })
    .limit(1);
  if (maxError) throw new AppError("DATABASE_ERROR", "Не удалось определить номер версии", 500, { message: maxError.message });
  const nextNumber = ((maxRows?.[0]?.version_number as number | undefined) ?? 0) + 1;
  const { data: version, error } = await input.supabaseAdmin
    .from("course_versions")
    .insert({
      course_id: input.courseId,
      version_number: nextNumber,
      change_type: input.changeType,
      change_description: input.changeDescription,
      qa_score: input.qaScore ?? null,
      created_by: input.userId,
      snapshot_data: snapshot,
    })
    .select("*")
    .single();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось создать версию курса", 500, { message: error.message });
  await input.supabaseAdmin.from("courses").update({ current_version_id: version.id }).eq("id", input.courseId);
  await writeAuditLog({
    supabaseAdmin: input.supabaseAdmin,
    userId: input.userId,
    courseId: input.courseId,
    action: "course_version_created",
    entityType: "course_version",
    entityId: version.id,
    metadata: { change_type: input.changeType, version_number: nextNumber, ...(input.auditMetadata ?? {}) },
  });
  return version;
}

export function clampScore(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function buildRuleBasedQa(snapshot: any, qaScope: "plan" | "course" = "course") {
  const modules = snapshot.modules ?? [];
  const lessons = snapshot.lessons ?? [];
  const contents = snapshot.lesson_contents ?? [];
  const quizzes = snapshot.quizzes ?? [];
  const sources = snapshot.sources ?? [];
  const issues: any[] = [];
  const recommendations: any[] = [];
  const isPlanScope = qaScope === "plan" || ["plan", "partial"].includes(String(snapshot.course?.status ?? ""));

  if (!modules.length) issues.push(issue("critical", "structure", "Нет модулей", "Курс не содержит модулей.", "course", snapshot.course?.id, "Сгенерируйте или добавьте модули."));
  if (!lessons.length) issues.push(issue("critical", "structure", "Нет уроков", "Курс не содержит уроков.", "course", snapshot.course?.id, "Сгенерируйте или добавьте уроки."));

  for (const lesson of lessons) {
    if (!String(lesson.objective ?? "").trim()) issues.push(issue("medium", "completeness", "У урока нет цели", `Урок «${lesson.title ?? "Без названия"}» не содержит objective.`, "lesson", lesson.id, "Добавьте цель урока."));
    if (!String(lesson.summary ?? "").trim()) issues.push(issue("medium", "completeness", "У урока нет описания", `Урок «${lesson.title ?? "Без названия"}» не содержит summary.`, "lesson", lesson.id, "Добавьте краткое описание."));
    if (!String(lesson.learning_outcome ?? "").trim()) issues.push(issue("medium", "completeness", "У урока нет результата обучения", `Урок «${lesson.title ?? "Без названия"}» не содержит learning_outcome.`, "lesson", lesson.id, "Добавьте ожидаемый результат."));
    const lc = contents.find((c: any) => c.lesson_id === lesson.id);
    if (!lc) {
      if (!isPlanScope) issues.push(issue("high", "content", "Нет содержимого урока", `Урок «${lesson.title ?? "Без названия"}» не имеет lesson_contents.`, "lesson", lesson.id, "Сгенерируйте или заполните содержимое урока."));
    } else {
      for (const field of ["theory_text", "examples_text", "practice_text", "checklist_text"]) {
        if (!String(lc[field] ?? "").trim() && !isPlanScope) issues.push(issue("medium", "content", "Пустой блок урока", `В уроке «${lesson.title ?? "Без названия"}» пустой блок ${field}.`, "lesson_content", lc.id, "Заполните блок."));
      }
    }
  }

  if (!quizzes.length && !isPlanScope) recommendations.push(rec("medium", "Добавить квизы", "В курсе нет квизов. Добавьте квиз к ключевым урокам или итоговый квиз.", "quizzes"));
  const sourceMode = String(snapshot.course?.generation_mode ?? "").includes("source") || String(snapshot.course?.source_mode ?? "").includes("source") || sources.length > 0;
  const onlySourceMode = sources.some((s: any) => s.only_source_mode);
  if (sourceMode && !sources.length) issues.push(issue("high", "source", "Нет источника", "Курс выглядит созданным по источнику, но sources пустой.", "course", snapshot.course?.id, "Добавьте источник или отключите source mode."));

  const completenessPenalty = Math.min(45, issues.filter((x) => x.severity === "high" || x.severity === "critical").length * 12 + issues.filter((x) => x.severity === "medium").length * 4);
  const structureScore = modules.length && lessons.length ? 85 : 30;
  const coherenceScore = isPlanScope ? 86 : Math.max(40, 90 - Math.max(0, lessons.length - contents.length) * 5);
  const levelScore = 80;
  const sourceScore = sourceMode ? (sources.length ? 82 : 25) : 100;
  const total = Math.max(0, Math.round((structureScore + coherenceScore + levelScore + sourceScore) / 4 - completenessPenalty));

  return {
    structure_score: clampScore(structureScore - completenessPenalty / 2),
    coherence_score: clampScore(coherenceScore - completenessPenalty / 3),
    level_match_score: clampScore(levelScore),
    source_alignment_score: clampScore(sourceScore),
    total_score: clampScore(total),
    summary: isPlanScope ? "Выполнена QA-проверка структуры курса. Отсутствие содержания уроков не считается ошибкой для плана." : "AI-проверка недоступна или не дала валидный ответ, выполнена базовая проверка правил.",
    issues,
    recommendations,
    suspicious_facts: [],
    source_alignment: { enabled: sourceMode, only_source_mode: onlySourceMode, summary: sourceMode ? "Проверено наличие источника и режима only_source_mode." : "Source mode не включён.", unsupported_claims: [] },
    fallback: true,
  };
}

function issue(severity: string, type: string, title: string, description: string, entity_type: string, entity_id: string | null, recommendation: string) {
  return { severity, type, title, description, entity_type, entity_id: entity_id ?? null, recommendation };
}
function rec(priority: string, title: string, description: string, target: string) {
  return { priority, title, description, target };
}

export function stripMarkdownJson(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function runAiQa(snapshot: any, qaScope: "plan" | "course" = "course") {
  const apiKey = Deno.env.get("AI_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  const baseUrl = Deno.env.get("AI_BASE_URL") ?? "https://api.openai.com/v1";
  const model = Deno.env.get("AI_MODEL") ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
  const compactSnapshot = compactForQa(snapshot);
  const body: any = {
    model,
    messages: [
      { role: "system", content: "Ты QA-эксперт образовательных курсов. Верни только валидный JSON без markdown." },
      { role: "user", content: `Режим QA: ${qaScope === "plan" ? "проверка только структуры/плана; отсутствие lesson_contents и квизов НЕ является ошибкой" : "проверка курса"}. Проверь качество курса. Оцени структуру, связность, уровень, соответствие источнику, квизы и подозрительные факты. Верни JSON со схемой: {"structure_score":0,"coherence_score":0,"level_match_score":0,"source_alignment_score":0,"total_score":0,"summary":"","issues":[],"recommendations":[],"suspicious_facts":[],"source_alignment":{"enabled":false,"only_source_mode":false,"summary":"","unsupported_claims":[]}}. Данные курса:\n${JSON.stringify(compactSnapshot)}` },
    ],
    temperature: 0.2,
  };
  const provider = Deno.env.get("AI_PROVIDER")?.trim().toLowerCase() || "openai";
  const responseFormatSetting = Deno.env.get("AI_USE_RESPONSE_FORMAT")?.trim().toLowerCase();
  const useResponseFormatByDefault = responseFormatSetting === "true" || (!responseFormatSetting && provider !== "openrouter");

  async function requestQa(useResponseFormat: boolean) {
    const requestBody = { ...body };
    if (useResponseFormat) requestBody.response_format = { type: "json_object" };
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new AppError("GENERATION_FAILED", "AI API вернул ошибку", 502, { status: response.status, message: clean(asRecord(asRecord(json)?.error)?.message), used_response_format: useResponseFormat });
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    try {
      const parsed = JSON.parse(stripMarkdownJson(content));
      if (!Array.isArray(parsed.issues) || !Array.isArray(parsed.recommendations)) return null;
      return {
        ...parsed,
        structure_score: clampScore(parsed.structure_score),
        coherence_score: clampScore(parsed.coherence_score),
        level_match_score: clampScore(parsed.level_match_score),
        source_alignment_score: clampScore(parsed.source_alignment_score),
        total_score: clampScore(parsed.total_score),
        fallback: false,
      };
    } catch {
      return null;
    }
  }

  if (!useResponseFormatByDefault) return await requestQa(false);
  try {
    return await requestQa(true);
  } catch (error) {
    const detailsText = JSON.stringify(error instanceof AppError ? error.details : {}).toLowerCase();
    if (!detailsText.includes("response_format") && !detailsText.includes("json_object") && !detailsText.includes("structured") && !detailsText.includes("unsupported")) throw error;
    console.warn("AI response_format is not supported by provider/model, retrying without it");
    return await requestQa(false);
  }
}

function compactForQa(snapshot: any) {
  const maxSourceChars = Number(Deno.env.get("QA_MAX_SOURCE_CHARS") ?? 12000);
  return {
    course: snapshot.course,
    modules: snapshot.modules,
    lessons: snapshot.lessons,
    lesson_contents: (snapshot.lesson_contents ?? []).map((c: any) => ({
      ...c,
      theory_text: truncate(c.theory_text, 1500),
      examples_text: truncate(c.examples_text, 800),
      practice_text: truncate(c.practice_text, 800),
      checklist_text: truncate(c.checklist_text, 800),
    })),
    sources: (snapshot.sources ?? []).map((s: any) => ({ ...s, raw_text: truncate(s.raw_text, maxSourceChars) })),
    quizzes: snapshot.quizzes,
    questions: snapshot.questions,
    answer_options: snapshot.answer_options?.map((o: any) => ({ ...o, is_correct: undefined })),
  };
}
function truncate(value: unknown, max = 1000) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
