import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COURSE_PLAN_PROMPT, LESSON_CONTENT_PROMPT, renderTemplate } from "./prompts/index.ts";

type Action =
  | "generate-course-plan"
  | "generate-lesson-content"
  | "generate-course-content"
  | "regenerate-lesson-block";

type Rec = Record<string, unknown>;

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "COURSE_NOT_FOUND"
  | "LESSON_NOT_FOUND"
  | "LESSON_CONTENT_NOT_FOUND"
  | "INVALID_INPUT"
  | "SOURCE_REQUIRED"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_MODE_INVALID"
  | "EMPTY_SOURCE"
  | "SOURCE_TOO_SHORT"
  | "ONLY_SOURCE_INSUFFICIENT"
  | "PLAN_ALREADY_EXISTS"
  | "PLAN_REGENERATION_BLOCKED"
  | "AI_RESPONSE_INVALID"
  | "BLOCK_EMPTY"
  | "GENERATION_FAILED"
  | "DATABASE_ERROR";

type SourceBundle = {
  enabled: boolean;
  only: boolean;
  text: string;
  sources: Rec[];
  sourceCount: number;
  sourceLength: number;
  warnings: string[];
  truncated: boolean;
};

type CoursePlan = {
  course_title: string;
  course_summary: string;
  warnings: string[];
  modules: Array<{
    title: string;
    description: string;
    estimated_duration: unknown;
    practice_required: boolean;
    lessons: Array<{
      title: string;
      objective: string;
      summary: string;
      estimated_duration: unknown;
      learning_outcome: string;
    }>;
  }>;
};

type LessonContentResult = {
  theory_text: string;
  examples_text: string;
  practice_text: string;
  checklist_text: string;
  warnings: string[];
};

const AI_BASE_URL = Deno.env.get("AI_BASE_URL")?.trim().replace(/\/+$/, "") || "https://api.openai.com/v1";
const AI_API_KEY = Deno.env.get("AI_API_KEY")?.trim() || Deno.env.get("OPENAI_API_KEY")?.trim() || "";
const AI_MODEL = Deno.env.get("AI_MODEL")?.trim() || Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
const AI_PROVIDER = Deno.env.get("AI_PROVIDER")?.trim().toLowerCase() || "openai";
const AI_RESPONSE_FORMAT_SETTING = Deno.env.get("AI_USE_RESPONSE_FORMAT")?.trim().toLowerCase();
const AI_USE_RESPONSE_FORMAT = AI_RESPONSE_FORMAT_SETTING === "true" || (!AI_RESPONSE_FORMAT_SETTING && AI_PROVIDER !== "openrouter");
const MIN_SOURCE_LENGTH = Number.isFinite(Number(Deno.env.get("MIN_SOURCE_LENGTH")))
  ? Math.max(1, Number(Deno.env.get("MIN_SOURCE_LENGTH")))
  : 700;
const MAX_SOURCE_CHARS = Number.isFinite(Number(Deno.env.get("MAX_SOURCE_CHARS")))
  ? Math.max(MIN_SOURCE_LENGTH, Number(Deno.env.get("MAX_SOURCE_CHARS")))
  : 120000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400,
    public details: Rec = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse(
      { error: { code: error.code, message: error.message, details: error.details } },
      error.status,
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return jsonResponse(
    {
      error: {
        code: "GENERATION_FAILED",
        message: "Не удалось выполнить генерацию. Попробуйте ещё раз.",
        details: { message },
      },
    },
    500,
  );
}

function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function clean(value: unknown): string {
  return asString(value).trim();
}

function hasText(value: unknown): boolean {
  return clean(value).length > 0;
}

type AiTrace = {
  sessionId: string;
  stepId: string;
  stepType: string;
};

function traceFromBody(body: Rec): AiTrace | null {
  const sessionId = clean(body.trace_session_id ?? body.traceSessionId);
  const stepId = clean(body.trace_step_id ?? body.traceStepId);
  const stepType = clean(body.trace_step_type ?? body.traceStepType);
  if (!sessionId || !stepId) return null;
  return { sessionId, stepId, stepType };
}

async function saveGenerationMessage(
  db: SupabaseClient,
  trace: AiTrace | null,
  role: string,
  content: unknown,
  metadata: Rec = {},
): Promise<void> {
  if (!trace) return;
  const payload = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  const { error } = await db.from("generation_messages").insert({
    session_id: trace.sessionId,
    step_id: trace.stepId,
    role,
    content: payload,
    metadata: { step_type: trace.stepType, ...metadata },
  });
  if (error) console.warn("generation message insert failed", error.message);
}

function debugErrorPayload(error: unknown): Rec {
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

function safeAsciiHeader(value: unknown, fallback: string): string {
  const raw = clean(value) || fallback;
  const ascii = raw.replace(/[^\x20-\x7E]/g, "").trim();
  return ascii || fallback;
}

function safeReferer(value: unknown): string {
  const ascii = safeAsciiHeader(value, "https://course-rosy.vercel.app");
  try {
    const url = new URL(ascii);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    // ignore invalid custom value
  }
  return "https://course-rosy.vercel.app";
}

async function callAiWithTrace(
  db: SupabaseClient,
  trace: AiTrace | null,
  systemPrompt: string,
  userPrompt: string,
): Promise<unknown> {
  await saveGenerationMessage(db, trace, "prompt", {
    model: AI_MODEL,
    provider: AI_PROVIDER,
    system: systemPrompt,
    user: userPrompt,
  });

  try {
    const parsed = await callAi(systemPrompt, userPrompt);
    await saveGenerationMessage(db, trace, "ai_response", parsed, { model: AI_MODEL, provider: AI_PROVIDER });
    return parsed;
  } catch (error) {
    await saveGenerationMessage(db, trace, "ai_error", debugErrorPayload(error), {
      model: AI_MODEL,
      provider: AI_PROVIDER,
    });
    throw error;
  }
}

function toDurationMinutes(value: unknown, fallback = 45): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, Math.round(value));

  const text = clean(value).toLowerCase();
  const match = text.match(/\d+(?:[,.]\d+)?/);
  if (!match) return fallback;

  const num = Number(match[0].replace(",", "."));
  if (!Number.isFinite(num)) return fallback;

  if (text.includes("час")) return Math.max(1, Math.round(num * 60));
  if (text.includes("нед")) return Math.max(1, Math.round(num * 60));
  if (text.includes("мес")) return Math.max(1, Math.round(num * 4 * 60));
  return Math.max(1, Math.round(num));
}

function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new AppError("GENERATION_FAILED", `Не задана переменная окружения ${name}`, 500);
  }
  return value;
}

function serviceClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extractBearerAuthorization(req: Request): string {
  const raw = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const first = raw.split(",").map((part) => part.trim()).find((part) => part.toLowerCase().startsWith("bearer ")) ?? "";
  if (!first) throw new AppError("UNAUTHORIZED", "Нужно войти в систему", 401);
  return first;
}

async function getUserId(req: Request): Promise<string> {
  const authorization = extractBearerAuthorization(req);

  const authClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    throw new AppError("UNAUTHORIZED", "Сессия недействительна", 401);
  }

  return data.user.id;
}

async function readJsonBody(req: Request): Promise<Rec> {
  const raw = await req.text();
  if (!raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw);
    const obj = asRecord(parsed);
    if (!obj) throw new Error("Body must be a JSON object");
    return obj;
  } catch (error) {
    throw new AppError("INVALID_INPUT", "Тело запроса должно быть корректным JSON-объектом", 400, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getOwnedCourse(db: SupabaseClient, courseId: string, userId: string): Promise<Rec> {
  const { data, error } = await db.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (error) {
    throw new AppError("DATABASE_ERROR", "Не удалось загрузить курс", 500, { error: error.message });
  }

  const course = asRecord(data);
  if (!course) throw new AppError("COURSE_NOT_FOUND", "Курс не найден", 404);
  if (clean(course.author_id) !== userId) {
    throw new AppError("FORBIDDEN", "Нет доступа к курсу", 403);
  }

  return course;
}

function errorPayload(error: unknown): Rec {
  if (error instanceof AppError) return { error_code: error.code, error_message: error.message, details: error.details };
  return { error_code: "GENERATION_FAILED", error_message: error instanceof Error ? error.message : String(error) };
}

async function audit(
  db: SupabaseClient,
  payload: {
    userId: string;
    courseId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Rec;
  },
): Promise<void> {
  try {
    const { error } = await db.from("audit_logs").insert({
      actor_user_id: payload.userId,
      course_id: payload.courseId ?? null,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      action: payload.action,
      payload: payload.metadata ?? {},
    });

    if (error) console.warn("audit_logs insert failed", error.message);
  } catch (error) {
    console.warn("audit_logs insert failed", error);
  }
}

function isSourceMode(course: Rec): boolean {
  const generationMode = clean(course.generation_mode).toLowerCase();
  const sourceMode = clean(course.source_mode).toLowerCase();
  return (
    generationMode === "source" ||
    generationMode === "sources" ||
    generationMode === "by_source" ||
    sourceMode === "source" ||
    sourceMode === "sources" ||
    sourceMode === "by_source" ||
    sourceMode === "text"
  );
}

function normalizeSourceText(value: unknown): string {
  return clean(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sourceAuditMetadata(source: SourceBundle): Rec {
  return {
    source_mode: source.enabled,
    only_source_mode: source.only,
    source_count: source.sourceCount,
    source_length: source.sourceLength,
    source_warnings: source.warnings,
    source_truncated: source.truncated,
  };
}

async function loadSources(db: SupabaseClient, course: Rec): Promise<SourceBundle> {
  const empty = { enabled: false, only: false, text: "", sources: [], sourceCount: 0, sourceLength: 0, warnings: [], truncated: false };
  if (!isSourceMode(course)) return empty;

  const { data, error } = await db
    .from("sources")
    .select("id, course_id, source_type, raw_text, source_url, file_ref, only_source_mode, created_at")
    .eq("course_id", clean(course.id))
    .order("created_at", { ascending: true });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Не удалось загрузить источники", 500, { error: error.message });
  }

  const rows = (data ?? []).map(asRecord).filter(Boolean) as Rec[];
  if (rows.length === 0) {
    throw new AppError("SOURCE_REQUIRED", "Для курса по источнику нужно добавить текстовый источник", 400);
  }

  const textSources = rows.filter((row) => clean(row.source_type).toLowerCase() === "text" || hasText(row.raw_text));
  if (textSources.length === 0) {
    throw new AppError("SOURCE_NOT_FOUND", "Поддерживается только текстовый источник. Текст источника не найден.", 400);
  }

  const warnings: string[] = [];
  const normalizedParts = textSources
    .map((row, index) => {
      const normalized = normalizeSourceText(row.raw_text);
      return normalized ? `Источник ${index + 1}:\n${normalized}` : "";
    })
    .filter(Boolean);

  let text = normalizedParts.join("\n\n---\n\n").trim();
  const only = rows.some((row) => Boolean(row.only_source_mode));

  if (!text) throw new AppError("EMPTY_SOURCE", "Текст источника пустой", 400);

  const originalLength = text.length;
  let truncated = false;
  if (text.length > MAX_SOURCE_CHARS) {
    text = text.slice(0, MAX_SOURCE_CHARS).trim();
    truncated = true;
    warnings.push(`Источник был сокращён до ${MAX_SOURCE_CHARS} символов для стабильной генерации.`);
  }

  if (text.length < MIN_SOURCE_LENGTH) {
    throw new AppError(only ? "ONLY_SOURCE_INSUFFICIENT" : "SOURCE_TOO_SHORT", `Текст источника слишком короткий для генерации курса. Минимум ${MIN_SOURCE_LENGTH} символов.`, 400, {
      min_length: MIN_SOURCE_LENGTH,
      actual_length: text.length,
      only_source_mode: only,
    });
  }

  return {
    enabled: true,
    only,
    text,
    sources: rows,
    sourceCount: textSources.length,
    sourceLength: originalLength,
    warnings,
    truncated,
  };
}

function parseAiJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AppError("AI_RESPONSE_INVALID", "ИИ вернул некорректный JSON", 502, {
      error: error instanceof Error ? error.message : String(error),
      preview: raw.slice(0, 400),
    });
  }
}

async function callAi(systemPrompt: string, userPrompt: string): Promise<unknown> {
  if (!AI_API_KEY) {
    throw new AppError("GENERATION_FAILED", "AI API ключ не настроен", 500, {
      missing: "AI_API_KEY",
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${AI_API_KEY}`,
    "Content-Type": "application/json",
  };

  if (AI_PROVIDER === "openrouter") {
    headers["HTTP-Referer"] = safeReferer(Deno.env.get("OPENROUTER_SITE_URL"));
    headers["X-Title"] = safeAsciiHeader(Deno.env.get("OPENROUTER_APP_NAME"), "CourseGenerator");
  }

  async function requestJson(useResponseFormat: boolean): Promise<unknown> {
    const body: Rec = {
      model: AI_MODEL,
      temperature: 0.25,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    if (useResponseFormat) body.response_format = { type: "json_object" };

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const rawResponse = await response.text();
    let json: unknown = null;
    try {
      json = rawResponse ? JSON.parse(rawResponse) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const payload = asRecord(json);
      const err = asRecord(payload?.error);
      const providerMessage = clean(err?.message) || clean(payload?.message) || rawResponse.slice(0, 1000) || "AI API error";
      throw new AppError("GENERATION_FAILED", "AI API вернул ошибку", 502, {
        status: response.status,
        status_text: response.statusText,
        provider_message: providerMessage,
        provider_code: clean(err?.code) || clean(payload?.code) || null,
        provider_type: clean(err?.type) || clean(payload?.type) || null,
        provider_param: clean(err?.param) || null,
        used_response_format: useResponseFormat,
        model: AI_MODEL,
        provider: AI_PROVIDER,
        base_url: AI_BASE_URL,
        response_preview: rawResponse.slice(0, 2000),
      });
    }

    const choices = Array.isArray(asRecord(json)?.choices) ? (asRecord(json)?.choices as unknown[]) : [];
    const content = clean(asRecord(asRecord(choices[0])?.message)?.content);
    if (!content) {
      throw new AppError("AI_RESPONSE_INVALID", "AI API вернул пустой ответ", 502, { used_response_format: useResponseFormat });
    }

    return parseAiJson(content);
  }

  if (!AI_USE_RESPONSE_FORMAT) return await requestJson(false);

  try {
    return await requestJson(true);
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    const detailsText = JSON.stringify(appError?.details ?? {}).toLowerCase();
    const canRetryWithoutJsonMode = appError?.code === "GENERATION_FAILED" && (
      detailsText.includes("response_format") ||
      detailsText.includes("json_object") ||
      detailsText.includes("structured") ||
      detailsText.includes("unsupported")
    );
    if (!canRetryWithoutJsonMode) throw error;
    console.warn("AI response_format is not supported by provider/model, retrying without it");
    return await requestJson(false);
  }
}

function buildSystemPrompt(course: Rec): string {
  return [
    "Ты — методист и архитектор учебных курсов.",
    "Верни строго валидный JSON без markdown и без пояснений вокруг JSON.",
    `Язык ответа: ${clean(course.language) || "ru"}.`,
    `Тон: ${clean(course.tone) || "neutral"}.`,
    "Учитывай уровень, цель, длительность и формат курса.",
    "Если информации недостаточно, добавь warnings и не выдумывай непроверенные факты.",
  ].join("\n");
}

function courseContext(course: Rec): string {
  return [
    `Название: ${clean(course.title)}`,
    `Тема: ${clean(course.topic)}`,
    `Уровень: ${clean(course.level)}`,
    `Цель: ${clean(course.goal) || "не указана"}`,
    `Длительность: ${clean(course.duration) || "не указана"}`,
    `Формат: ${clean(course.format) || "смешанный"}`,
    `Тон: ${clean(course.tone) || "neutral"}`,
  ].join("\n");
}

function warningsFrom(record: Rec): string[] {
  return Array.isArray(record.warnings) ? record.warnings.map(clean).filter(Boolean) : [];
}

function validatePlanResponse(value: unknown): CoursePlan {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.modules) || record.modules.length === 0) {
    throw new AppError("AI_RESPONSE_INVALID", "В ответе AI нет массива modules", 502);
  }

  const courseRecord = asRecord(record.course);

  return {
    course_title: clean(record.course_title) || clean(courseRecord?.title),
    course_summary: clean(record.course_summary) || clean(courseRecord?.description),
    warnings: [...warningsFrom(record), ...(Array.isArray(record.qa_notes) ? record.qa_notes.map(clean).filter(Boolean) : [])],
    modules: record.modules.map((moduleRaw, moduleIndex) => {
      const module = asRecord(moduleRaw);
      if (!module) {
        throw new AppError("AI_RESPONSE_INVALID", `Модуль ${moduleIndex + 1} имеет неверный формат`, 502);
      }

      const lessons = Array.isArray(module.lessons) ? module.lessons : [];
      if (!clean(module.title) || lessons.length === 0) {
        throw new AppError("AI_RESPONSE_INVALID", `Модуль ${moduleIndex + 1} заполнен не полностью`, 502);
      }

      return {
        title: clean(module.title),
        description: clean(module.description) || clean(module.summary) || clean(module.objective) || `Модуль посвящён теме: ${clean(module.title)}`,
        estimated_duration: module.estimated_duration ?? module.estimated_duration_minutes ?? module.duration,
        practice_required: Boolean(module.practice_required),
        lessons: lessons.map((lessonRaw, lessonIndex) => {
          const lesson = asRecord(lessonRaw);
          if (!lesson || !clean(lesson.title)) {
            throw new AppError(
              "AI_RESPONSE_INVALID",
              `Урок ${lessonIndex + 1} в модуле ${moduleIndex + 1} заполнен не полностью`,
              502,
            );
          }

          const title = clean(lesson.title);
          const objective = clean(lesson.objective) || clean(lesson.goal) || clean(lesson.learning_goal) || `Разобраться с темой «${title}»`;
          const summary = clean(lesson.summary) || clean(lesson.description) || clean(lesson.short_description) || objective;
          const outcome = clean(lesson.learning_outcome) || clean(lesson.outcome) || clean(lesson.result) || clean((Array.isArray(lesson.learning_outcomes) ? lesson.learning_outcomes : [])[0]) || `Пользователь сможет применить материал урока «${title}».`;

          return {
            title,
            objective,
            summary,
            estimated_duration: lesson.estimated_duration ?? lesson.estimated_duration_minutes ?? lesson.duration,
            learning_outcome: outcome,
          };
        }),
      };
    }),
  };
}

const FLEXIBLE_LESSON_BLOCK_TYPES = [
  "introduction",
  "explanation",
  "example",
  "case_study",
  "step_by_step",
  "practice",
  "checklist",
  "common_mistakes",
  "reflection",
  "summary",
] as const;

function pushJoined(target: string[], title: string, body: string): void {
  const text = [title, body].map(clean).filter(Boolean).join("\n").trim();
  if (text) target.push(text);
}

function mapFlexibleLessonBlocks(record: Rec): LessonContentResult {
  const lessonRecord = asRecord(record.lesson);
  const blocksRaw = Array.isArray(record.blocks)
    ? record.blocks
    : Array.isArray(lessonRecord?.blocks)
      ? lessonRecord?.blocks as unknown[]
      : Array.isArray(record.sections)
        ? record.sections
        : Array.isArray(record.content_blocks)
          ? record.content_blocks
          : Array.isArray(record.lesson_sections)
            ? record.lesson_sections
            : [];

  const theoryParts: string[] = [];
  const exampleParts: string[] = [];
  const practiceParts: string[] = [];
  const checklistParts: string[] = [];

  for (const raw of blocksRaw) {
    const block = asRecord(raw);
    if (!block) continue;
    const rawType = clean(block.type ?? block.kind ?? block.block_type ?? block.name).toLowerCase();
    const type = rawType
      .replace("теория", "explanation")
      .replace("объяснение", "explanation")
      .replace("пример", "example")
      .replace("кейс", "case_study")
      .replace("практика", "practice")
      .replace("задание", "practice")
      .replace("чек-лист", "checklist")
      .replace("чеклист", "checklist")
      .replace("итог", "summary");
    const title = clean(block.title ?? block.label);
    const body = clean(block.body ?? block.content ?? block.text);
    if (!body) continue;

    if (["introduction", "explanation", "step_by_step", "summary"].includes(type)) {
      pushJoined(theoryParts, title, body);
    } else if (["example", "case_study"].includes(type)) {
      pushJoined(exampleParts, title, body);
    } else if (["practice", "reflection"].includes(type)) {
      pushJoined(practiceParts, title, body);
    } else if (["checklist", "common_mistakes"].includes(type)) {
      pushJoined(checklistParts, title, body);
    } else if ((FLEXIBLE_LESSON_BLOCK_TYPES as readonly string[]).includes(type)) {
      pushJoined(theoryParts, title, body);
    }
  }

  return {
    theory_text: theoryParts.join("\n\n"),
    examples_text: exampleParts.join("\n\n"),
    practice_text: practiceParts.join("\n\n"),
    checklist_text: checklistParts.join("\n\n"),
    warnings: warningsFrom(record),
  };
}

function validateLessonContentResponse(value: unknown): LessonContentResult {
  const record = asRecord(value);
  if (!record) throw new AppError("AI_RESPONSE_INVALID", "AI вернул не JSON-объект", 502);

  const fromFlexibleBlocks = mapFlexibleLessonBlocks(record);
  const result = {
    theory_text: clean(record.theory_text ?? record.theory ?? record.explanation_text ?? record.content ?? record.main_text) || fromFlexibleBlocks.theory_text,
    examples_text: clean(record.examples_text ?? record.examples ?? record.example_text) || fromFlexibleBlocks.examples_text,
    practice_text: clean(record.practice_text ?? record.practice ?? record.assignment_text ?? record.task_text) || fromFlexibleBlocks.practice_text,
    checklist_text: clean(record.checklist_text ?? record.checklist ?? record.criteria_text ?? record.summary_text) || fromFlexibleBlocks.checklist_text,
    warnings: [...warningsFrom(record), ...fromFlexibleBlocks.warnings].filter(Boolean),
  };

  const filledBlocks = [result.theory_text, result.examples_text, result.practice_text, result.checklist_text].filter((text) => text.trim().length > 0);
  if (filledBlocks.length === 0) {
    throw new AppError("AI_RESPONSE_INVALID", "AI не вернул полезное содержание урока", 502, {
      accepted: ["blocks", "theory_text", "examples_text", "practice_text", "checklist_text"],
    });
  }

  const totalLength = filledBlocks.join("\n").length;
  if (totalLength < 120) {
    throw new AppError("AI_RESPONSE_INVALID", "AI вернул слишком короткое содержание урока", 502, { length: totalLength });
  }

  return result;
}

async function buildSnapshot(db: SupabaseClient, courseId: string): Promise<Rec> {
  const { data: course } = await db.from("courses").select("*").eq("id", courseId).maybeSingle();
  const { data: modules } = await db.from("modules").select("*").eq("course_id", courseId).order("position", { ascending: true });

  const moduleIds = (modules ?? []).map((m) => clean(asRecord(m)?.id)).filter(Boolean);
  const { data: lessons } = moduleIds.length
    ? await db.from("lessons").select("*").in("module_id", moduleIds).order("position", { ascending: true })
    : { data: [] as unknown[] };

  const lessonIds = (lessons ?? []).map((l) => clean(asRecord(l)?.id)).filter(Boolean);
  const { data: lessonContents } = lessonIds.length
    ? await db.from("lesson_contents").select("*").in("lesson_id", lessonIds)
    : { data: [] as unknown[] };

  const { data: sources } = await db.from("sources").select("*").eq("course_id", courseId).order("created_at", { ascending: true });

  const { data: courseQuizzes } = await db.from("quizzes").select("*").eq("course_id", courseId);
  const { data: lessonQuizzes } = lessonIds.length
    ? await db.from("quizzes").select("*").in("lesson_id", lessonIds)
    : { data: [] as unknown[] };
  const quizzes = [...(courseQuizzes ?? []), ...(lessonQuizzes ?? [])];

  const quizIds = quizzes.map((q) => clean(asRecord(q)?.id)).filter(Boolean);
  const { data: questions } = quizIds.length
    ? await db.from("questions").select("*").in("quiz_id", quizIds).order("position", { ascending: true })
    : { data: [] as unknown[] };

  const questionIds = (questions ?? []).map((q) => clean(asRecord(q)?.id)).filter(Boolean);
  const { data: answerOptions } = questionIds.length
    ? await db.from("answer_options").select("*").in("question_id", questionIds).order("position", { ascending: true })
    : { data: [] as unknown[] };

  return {
    schema_version: 1,
    captured_at: new Date().toISOString(),
    course: course ?? null,
    modules: modules ?? [],
    lessons: lessons ?? [],
    lesson_contents: lessonContents ?? [],
    sources: sources ?? [],
    quizzes,
    questions: questions ?? [],
    answer_options: answerOptions ?? [],
  };
}

async function createCourseVersion(
  db: SupabaseClient,
  courseId: string,
  userId: string,
  changeType: string,
  description: string,
): Promise<string | null> {
  const { data: latest, error: latestError } = await db
    .from("course_versions")
    .select("version_number")
    .eq("course_id", courseId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (latestError) {
    throw new AppError("DATABASE_ERROR", "Не удалось определить номер версии", 500, { error: latestError.message });
  }

  const latestNumber = Number(asRecord((latest ?? [])[0])?.version_number ?? 0);
  const versionNumber = Number.isFinite(latestNumber) ? latestNumber + 1 : 1;
  const snapshot = await buildSnapshot(db, courseId);

  const { data, error } = await db
    .from("course_versions")
    .insert({
      course_id: courseId,
      version_number: versionNumber,
      change_type: changeType,
      change_description: description,
      qa_score: null,
      created_by: userId,
      snapshot_data: snapshot,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new AppError("DATABASE_ERROR", "Не удалось создать версию курса", 500, { error: error.message });
  }

  const versionId = clean(asRecord(data)?.id) || null;
  if (versionId) {
    const { error: updateError } = await db.from("courses").update({ current_version_id: versionId }).eq("id", courseId);
    if (updateError) console.warn("courses.current_version_id update failed", updateError.message);

    await audit(db, {
      userId,
      courseId,
      action: "course_version_created",
      entityType: "course_version",
      entityId: versionId,
      metadata: { change_type: changeType, version_number: versionNumber },
    });
  }

  return versionId;
}

async function lessonContentsHaveGeneratedData(db: SupabaseClient, lessonIds: string[]): Promise<boolean> {
  if (lessonIds.length === 0) return false;

  const { data, error } = await db
    .from("lesson_contents")
    .select("lesson_id, theory_text, examples_text, practice_text, checklist_text")
    .in("lesson_id", lessonIds);

  if (error) {
    throw new AppError("DATABASE_ERROR", "Не удалось проверить содержание уроков", 500, { error: error.message });
  }

  return (data ?? []).some((row) => {
    const record = asRecord(row);
    return Boolean(record) && (hasText(record?.theory_text) || hasText(record?.examples_text) || hasText(record?.practice_text) || hasText(record?.checklist_text));
  });
}

async function preparePlanGeneration(db: SupabaseClient, courseId: string, force: boolean): Promise<void> {
  const { data: modules, error: modulesError } = await db.from("modules").select("id").eq("course_id", courseId);
  if (modulesError) {
    throw new AppError("DATABASE_ERROR", "Не удалось проверить существующий план", 500, { error: modulesError.message });
  }

  const moduleIds = (modules ?? []).map((m) => clean(asRecord(m)?.id)).filter(Boolean);
  if (moduleIds.length === 0) return;

  if (!force) {
    throw new AppError("PLAN_ALREADY_EXISTS", "У курса уже есть план. Повторная генерация требует явного подтверждения.", 409);
  }

  const { data: lessons, error: lessonsError } = await db.from("lessons").select("id").in("module_id", moduleIds);
  if (lessonsError) {
    throw new AppError("DATABASE_ERROR", "Не удалось проверить уроки существующего плана", 500, { error: lessonsError.message });
  }

  const lessonIds = (lessons ?? []).map((l) => clean(asRecord(l)?.id)).filter(Boolean);
  const hasGeneratedContent = await lessonContentsHaveGeneratedData(db, lessonIds);
  if (hasGeneratedContent) {
    throw new AppError(
      "PLAN_REGENERATION_BLOCKED",
      "План нельзя заменить автоматически: у уроков уже есть сгенерированное содержание.",
      409,
    );
  }

  const { error: deleteError } = await db.from("modules").delete().eq("course_id", courseId);
  if (deleteError) {
    throw new AppError("DATABASE_ERROR", "Не удалось безопасно заменить существующий план", 500, { error: deleteError.message });
  }
}

async function getCourseGraph(db: SupabaseClient, courseId: string): Promise<Rec> {
  const { data: course } = await db.from("courses").select("*").eq("id", courseId).maybeSingle();
  const { data: moduleRows } = await db.from("modules").select("*").eq("course_id", courseId).order("position", { ascending: true });

  const modules = (moduleRows ?? []).map((module) => ({ ...(asRecord(module) ?? {}) }));
  for (const module of modules) {
    const { data: lessons } = await db
      .from("lessons")
      .select("*")
      .eq("module_id", clean(module.id))
      .order("position", { ascending: true });
    module.lessons = lessons ?? [];
  }

  return { course, modules };
}

async function generatePlan(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const requestBody = await readJsonBody(req);
  const trace = traceFromBody(requestBody);
  const courseId = clean(requestBody.course_id ?? requestBody.courseId);
  const force = Boolean(requestBody.force);
  if (!courseId) throw new AppError("INVALID_INPUT", "Не передан course_id", 400);

  await audit(db, {
    userId,
    courseId,
    action: "generate_course_plan_started",
    entityType: "course",
    entityId: courseId,
    metadata: { force, generation_target: "plan" },
  });

  const insertedModuleIds: string[] = [];
  let cleanupInsertedPlan = true;

  try {
    const course = await getOwnedCourse(db, courseId, userId);
    await preparePlanGeneration(db, courseId, force);
    const source = await loadSources(db, course);

    const prompt = renderTemplate(COURSE_PLAN_PROMPT, {
      topic: clean(course.topic),
      level: clean(course.level),
      goal: clean(course.goal) || "не указана",
      duration: clean(course.duration) || "не указана",
      format: clean(course.format) || "смешанный",
      language: clean(course.language) || "ru",
      tone: clean(course.tone) || "neutral",
      source_mode: source.enabled ? "да" : "нет",
      only_source_mode: source.only ? "да" : "нет",
      source_text: source.enabled ? source.text : "Источник не используется.",
    });

    const plan = validatePlanResponse(await callAiWithTrace(db, trace, buildSystemPrompt(course), prompt));

    for (let moduleIndex = 0; moduleIndex < plan.modules.length; moduleIndex += 1) {
      const module = plan.modules[moduleIndex];
      const { data: insertedModule, error: moduleError } = await db
        .from("modules")
        .insert({
          course_id: courseId,
          title: module.title,
          position: moduleIndex + 1,
          description: module.description,
          practice_required: module.practice_required,
          estimated_duration: toDurationMinutes(module.estimated_duration, 60),
        })
        .select("id")
        .maybeSingle();

      if (moduleError) {
        throw new AppError("DATABASE_ERROR", "Не удалось сохранить модуль курса", 500, { error: moduleError.message });
      }

      const moduleId = clean(asRecord(insertedModule)?.id);
      if (!moduleId) throw new AppError("DATABASE_ERROR", "База не вернула id модуля", 500);
      insertedModuleIds.push(moduleId);

      const lessonRows = module.lessons.map((lesson, lessonIndex) => ({
        module_id: moduleId,
        title: lesson.title,
        position: lessonIndex + 1,
        objective: lesson.objective,
        summary: lesson.summary,
        estimated_duration: toDurationMinutes(lesson.estimated_duration, 45),
        learning_outcome: lesson.learning_outcome,
        content_status: "empty",
      }));

      const { error: lessonError } = await db.from("lessons").insert(lessonRows);
      if (lessonError) {
        throw new AppError("DATABASE_ERROR", "Не удалось сохранить уроки курса", 500, { error: lessonError.message });
      }
    }

    const { error: statusError } = await db.from("courses").update({ status: "plan" }).eq("id", courseId);
    if (statusError) {
      throw new AppError("DATABASE_ERROR", "Не удалось обновить статус курса", 500, { error: statusError.message });
    }

    cleanupInsertedPlan = false;
    const versionId = await createCourseVersion(db, courseId, userId, "plan_generated", "Сгенерирован план курса");

    await audit(db, {
      userId,
      courseId,
      action: "generate_course_plan_completed",
      entityType: "course",
      entityId: courseId,
      metadata: { version_id: versionId, modules_count: plan.modules.length, warnings: [...source.warnings, ...plan.warnings], generation_target: "plan", ...sourceAuditMetadata(source) },
    });

    const graph = await getCourseGraph(db, courseId);
    return jsonResponse({ course_id: courseId, version_id: versionId, source_mode: source.enabled, only_source_mode: source.only, source_warnings: source.warnings, warnings: [...source.warnings, ...plan.warnings], ...graph });
  } catch (error) {
    if (cleanupInsertedPlan && insertedModuleIds.length > 0) {
      const { error: cleanupError } = await db.from("modules").delete().in("id", insertedModuleIds);
      if (cleanupError) console.warn("generate-course-plan cleanup failed", cleanupError.message);
    }

    await audit(db, {
      userId,
      courseId,
      action: "generate_course_plan_failed",
      entityType: "course",
      entityId: courseId,
      metadata: errorPayload(error),
    });
    throw error;
  }
}

async function getLessonContext(
  db: SupabaseClient,
  courseId: string,
  lessonId: string,
): Promise<{ lesson: Rec; module: Rec; neighbors: unknown[] }> {
  const { data: lessonData, error: lessonError } = await db.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (lessonError) {
    throw new AppError("DATABASE_ERROR", "Не удалось загрузить урок", 500, { error: lessonError.message });
  }

  const lesson = asRecord(lessonData);
  if (!lesson) throw new AppError("LESSON_NOT_FOUND", "Урок не найден", 404);

  const { data: moduleData, error: moduleError } = await db.from("modules").select("*").eq("id", clean(lesson.module_id)).maybeSingle();
  if (moduleError) {
    throw new AppError("DATABASE_ERROR", "Не удалось загрузить модуль урока", 500, { error: moduleError.message });
  }

  const module = asRecord(moduleData);
  if (!module || clean(module.course_id) !== courseId) {
    throw new AppError("FORBIDDEN", "Урок не относится к указанному курсу", 403);
  }

  const { data: neighbors } = await db
    .from("lessons")
    .select("id, title, position, objective, summary")
    .eq("module_id", clean(lesson.module_id))
    .order("position", { ascending: true });

  return { lesson, module, neighbors: neighbors ?? [] };
}

async function updateCourseStatusFromLessons(db: SupabaseClient, courseId: string): Promise<string> {
  const { data: modules, error: moduleError } = await db.from("modules").select("id").eq("course_id", courseId);
  if (moduleError) {
    throw new AppError("DATABASE_ERROR", "Не удалось загрузить модули курса", 500, { error: moduleError.message });
  }

  const moduleIds = (modules ?? []).map((m) => clean(asRecord(m)?.id)).filter(Boolean);
  if (moduleIds.length === 0) return "draft";

  const { data: lessons, error: lessonsError } = await db.from("lessons").select("id, content_status").in("module_id", moduleIds);
  if (lessonsError) {
    throw new AppError("DATABASE_ERROR", "Не удалось загрузить уроки курса", 500, { error: lessonsError.message });
  }

  const rows = lessons ?? [];
  if (rows.length === 0) return "plan";

  const filled = rows.filter((row) => {
    const status = clean(asRecord(row)?.content_status);
    return status === "generated" || status === "edited";
  }).length;

  const nextStatus = filled === 0 ? "plan" : filled < rows.length ? "partial" : "ready";
  const { error } = await db.from("courses").update({ status: nextStatus }).eq("id", courseId);
  if (error) {
    throw new AppError("DATABASE_ERROR", "Не удалось обновить статус курса", 500, { error: error.message });
  }

  return nextStatus;
}

async function upsertLessonContent(db: SupabaseClient, lessonId: string, content: LessonContentResult): Promise<void> {
  const payload = {
    lesson_id: lessonId,
    theory_text: content.theory_text,
    examples_text: content.examples_text,
    practice_text: content.practice_text,
    checklist_text: content.checklist_text,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: selectError } = await db
    .from("lesson_contents")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (selectError) {
    throw new AppError("DATABASE_ERROR", "Не удалось проверить существующее содержание урока", 500, { error: selectError.message });
  }

  const existingId = clean(asRecord(existing)?.id);
  const result = existingId
    ? await db.from("lesson_contents").update(payload).eq("id", existingId)
    : await db.from("lesson_contents").insert(payload);

  if (result.error) {
    throw new AppError("DATABASE_ERROR", "Не удалось сохранить содержание урока", 500, { error: result.error.message });
  }
}

async function generateLessonContentOnly(
  db: SupabaseClient,
  course: Rec,
  courseId: string,
  lessonId: string,
  sourceContext?: SourceBundle,
  trace?: AiTrace | null,
): Promise<LessonContentResult> {
  const source = sourceContext ?? await loadSources(db, course);
  const { lesson, module, neighbors } = await getLessonContext(db, courseId, lessonId);

  const orderedNeighbors = (neighbors ?? []).map(asRecord).filter(Boolean) as Rec[];
  const currentPosition = Number(lesson.position ?? 0);
  const previousLesson = orderedNeighbors
    .filter((row) => Number(row.position ?? 0) < currentPosition)
    .sort((a, b) => Number(b.position ?? 0) - Number(a.position ?? 0))[0];
  const nextLesson = orderedNeighbors
    .filter((row) => Number(row.position ?? 0) > currentPosition)
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))[0];

  const prompt = renderTemplate(LESSON_CONTENT_PROMPT, {
    course_title: clean(course.title),
    course_topic: clean(course.topic),
    level: clean(course.level),
    course_goal: clean(course.goal) || "не указана",
    format: clean(course.format) || "смешанный",
    language: clean(course.language) || "ru",
    tone: clean(course.tone) || "neutral",
    module_title: clean(module.title),
    module_description: clean(module.description),
    lesson_title: clean(lesson.title),
    lesson_objective: clean(lesson.objective),
    lesson_summary: clean(lesson.summary),
    learning_outcome: clean(lesson.learning_outcome),
    estimated_duration: clean(lesson.estimated_duration) || "не указана",
    previous_lesson_title: clean(previousLesson?.title) || "нет",
    next_lesson_title: clean(nextLesson?.title) || "нет",
    source_mode: source.enabled ? "да" : "нет",
    only_source_mode: source.only ? "да" : "нет",
    source_text: source.enabled ? source.text : "Источник не используется.",
  });

  const content = validateLessonContentResponse(await callAiWithTrace(db, trace ?? null, buildSystemPrompt(course), prompt));
  await upsertLessonContent(db, lessonId, content);

  const { error } = await db.from("lessons").update({ content_status: "generated" }).eq("id", lessonId);
  if (error) {
    throw new AppError("DATABASE_ERROR", "Не удалось обновить статус урока", 500, { error: error.message });
  }

  return content;
}

async function generateLesson(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const requestBody = await readJsonBody(req);
  const trace = traceFromBody(requestBody);
  const courseId = clean(requestBody.course_id ?? requestBody.courseId);
  const lessonId = clean(requestBody.lesson_id ?? requestBody.lessonId);
  if (!courseId || !lessonId) {
    throw new AppError("INVALID_INPUT", "Нужно передать course_id и lesson_id", 400);
  }

  await audit(db, {
    userId,
    courseId,
    action: "generate_lesson_content_started",
    entityType: "lesson",
    entityId: lessonId,
    metadata: { lesson_id: lessonId },
  });

  try {
    const course = await getOwnedCourse(db, courseId, userId);
    const source = await loadSources(db, course);
    const content = await generateLessonContentOnly(db, course, courseId, lessonId, source, trace);
    const courseStatus = await updateCourseStatusFromLessons(db, courseId);
    const versionId = await createCourseVersion(
      db,
      courseId,
      userId,
      "lesson_content_generated",
      "Сгенерировано содержание урока",
    );

    await audit(db, {
      userId,
      courseId,
      action: "generate_lesson_content_completed",
      entityType: "lesson",
      entityId: lessonId,
      metadata: { version_id: versionId, course_status: courseStatus, warnings: [...source.warnings, ...content.warnings], generation_target: "lesson", ...sourceAuditMetadata(source) },
    });

    const { data: lessonContent } = await db.from("lesson_contents").select("*").eq("lesson_id", lessonId).maybeSingle();
    return jsonResponse({
      lesson_id: lessonId,
      lesson_content: lessonContent,
      course_status: courseStatus,
      version_id: versionId,
      source_mode: source.enabled,
      only_source_mode: source.only,
      source_warnings: source.warnings,
      warnings: [...source.warnings, ...content.warnings],
    });
  } catch (error) {
    await audit(db, {
      userId,
      courseId,
      action: "generate_lesson_content_failed",
      entityType: "lesson",
      entityId: lessonId,
      metadata: { lesson_id: lessonId, ...errorPayload(error) },
    });
    throw error;
  }
}

async function lessonHasContent(db: SupabaseClient, lessonId: string): Promise<boolean> {
  const { data, error } = await db
    .from("lesson_contents")
    .select("theory_text, examples_text, practice_text, checklist_text")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) {
    throw new AppError("DATABASE_ERROR", "Не удалось проверить содержание урока", 500, { error: error.message });
  }

  const record = asRecord(data);
  return Boolean(record) && (hasText(record?.theory_text) || hasText(record?.examples_text) || hasText(record?.practice_text) || hasText(record?.checklist_text));
}

async function resolveModuleIdsForContent(db: SupabaseClient, courseId: string, moduleId: string): Promise<string[]> {
  if (moduleId) {
    const { data, error } = await db.from("modules").select("id, course_id").eq("id", moduleId).maybeSingle();
    if (error) throw new AppError("DATABASE_ERROR", "Не удалось проверить модуль", 500, { error: error.message });

    const module = asRecord(data);
    if (!module || clean(module.course_id) !== courseId) {
      throw new AppError("FORBIDDEN", "Модуль не относится к указанному курсу", 403);
    }

    return [moduleId];
  }

  const { data, error } = await db.from("modules").select("id").eq("course_id", courseId).order("position", { ascending: true });
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить модули курса", 500, { error: error.message });

  return (data ?? []).map((module) => clean(asRecord(module)?.id)).filter(Boolean);
}

async function generateCourseContent(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const requestBody = await readJsonBody(req);
  const courseId = clean(requestBody.course_id ?? requestBody.courseId);
  const moduleId = clean(requestBody.module_id ?? requestBody.moduleId);
  const force = Boolean(requestBody.force);
  const retryCount = Math.min(2, Math.max(0, Number(requestBody.retry_count ?? requestBody.retryCount ?? 2) || 0));
  if (!courseId) throw new AppError("INVALID_INPUT", "Нужно передать course_id", 400);

  await audit(db, {
    userId,
    courseId,
    action: "generate_course_content_started",
    entityType: moduleId ? "module" : "course",
    entityId: moduleId || courseId,
    metadata: { module_id: moduleId || null, force, retry_count: retryCount },
  });

  try {
    const course = await getOwnedCourse(db, courseId, userId);
    const source = await loadSources(db, course);
    const moduleIds = await resolveModuleIdsForContent(db, courseId, moduleId);

    const { data: lessons, error: lessonsError } = moduleIds.length
      ? await db.from("lessons").select("id").in("module_id", moduleIds).order("position", { ascending: true })
      : { data: [] as unknown[], error: null };

    if (lessonsError) {
      throw new AppError("DATABASE_ERROR", "Не удалось загрузить уроки для генерации", 500, { error: lessonsError.message });
    }

    const lessonIds = (lessons ?? []).map((lesson) => clean(asRecord(lesson)?.id)).filter(Boolean);
    const generated_lessons: string[] = [];
    const skipped_lessons: string[] = [];
    const failed_lessons: Rec[] = [];

    for (const lessonId of lessonIds) {
      if (!force && (await lessonHasContent(db, lessonId))) {
        skipped_lessons.push(lessonId);
        continue;
      }

      let lastError: unknown = null;
      for (let attempt = 0; attempt <= retryCount; attempt += 1) {
        try {
          await generateLessonContentOnly(db, course, courseId, lessonId, source);
          generated_lessons.push(lessonId);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < retryCount) {
            console.warn("lesson content generation retry", { courseId, lessonId, attempt: attempt + 1 });
          }
        }
      }

      if (lastError) {
        failed_lessons.push({ lesson_id: lessonId, ...errorPayload(lastError) });
      }
    }

    const courseStatus = await updateCourseStatusFromLessons(db, courseId);
    const versionId = generated_lessons.length
      ? await createCourseVersion(
          db,
          courseId,
          userId,
          moduleId ? "module_content_generated" : "course_content_generated",
          moduleId ? "Сгенерировано содержание модуля" : "Сгенерировано содержание курса",
        )
      : null;

    await audit(db, {
      userId,
      courseId,
      action: "generate_course_content_completed",
      entityType: moduleId ? "module" : "course",
      entityId: moduleId || courseId,
      metadata: { generated_lessons, skipped_lessons, failed_lessons, version_id: versionId, course_status: courseStatus, retry_count: retryCount, generation_target: moduleId ? "module" : "course", ...sourceAuditMetadata(source) },
    });

    return jsonResponse({
      course_id: courseId,
      source_mode: source.enabled,
      only_source_mode: source.only,
      source_warnings: source.warnings,
      generated_lessons,
      skipped_lessons,
      failed_lessons,
      course_status: courseStatus,
      version_id: versionId,
    });
  } catch (error) {
    await audit(db, {
      userId,
      courseId,
      action: "generate_course_content_failed",
      entityType: moduleId ? "module" : "course",
      entityId: moduleId || courseId,
      metadata: { module_id: moduleId || null, ...errorPayload(error) },
    });
    throw error;
  }
}

const BLOCK_TYPES = ["theory_text", "examples_text", "practice_text", "checklist_text"] as const;
const COMMANDS = ["shorten", "simplify", "add_examples", "add_practice", "expand", "improve_clarity", "custom"] as const;

type BlockType = typeof BLOCK_TYPES[number];
type BlockCommand = typeof COMMANDS[number];

const COMMAND_DESCRIPTIONS: Record<BlockCommand, string> = {
  shorten: "Сократи текст: убери повторы и второстепенные детали, сохрани ключевые идеи.",
  simplify: "Упрости объяснение: сделай формулировки понятнее для выбранного уровня курса, сохрани смысл.",
  add_examples: "Добавь или усили примеры. Не превращай блок целиком в теорию.",
  add_practice: "Добавь прикладные действия или тренировочные шаги, сохрани связь с целью урока.",
  expand: "Сделай блок подробнее за счёт релевантных пояснений. Не уходи в нерелевантные темы.",
  improve_clarity: "Улучши ясность и структуру: убери неоднозначность, сделай текст более связным.",
  custom: "Выполни пользовательскую инструкцию, не нарушая ограничений курса, источника и формата.",
};

function isBlockType(value: string): value is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(value);
}

function isBlockCommand(value: string): value is BlockCommand {
  return (COMMANDS as readonly string[]).includes(value);
}

function blockLabel(blockType: BlockType): string {
  if (blockType === "theory_text") return "теоретический блок";
  if (blockType === "examples_text") return "блок примеров";
  if (blockType === "practice_text") return "практический блок";
  return "чек-лист";
}

function commandLabel(command: BlockCommand): string {
  if (command === "shorten") return "Сокращён";
  if (command === "simplify") return "Упрощён";
  if (command === "add_examples") return "Добавлены примеры в";
  if (command === "add_practice") return "Добавлена практика в";
  if (command === "expand") return "Расширен";
  if (command === "improve_clarity") return "Улучшен";
  return "Изменён";
}

function validateRegeneratedBlockResponse(value: unknown): { updatedText: string; changeSummary: string; warnings: string[]; cannotApply: boolean } {
  const record = asRecord(value);
  if (!record) throw new AppError("AI_RESPONSE_INVALID", "AI вернул не JSON-объект", 502);

  const cannotApply = Boolean(record.cannot_apply);
  const updatedText = clean(record.updated_text ?? record.text ?? record.block_text);
  const warnings = warningsFrom(record);

  if (cannotApply) {
    return {
      updatedText,
      changeSummary: clean(record.change_summary) || "Команду нельзя выполнить с учётом ограничений.",
      warnings,
      cannotApply: true,
    };
  }

  if (!updatedText) throw new AppError("AI_RESPONSE_INVALID", "AI вернул пустой текст блока", 502);
  if (updatedText.length < 20) {
    throw new AppError("AI_RESPONSE_INVALID", "AI вернул слишком короткий текст блока", 502, { length: updatedText.length });
  }

  const normalized = updatedText.toLowerCase();
  const technicalErrorMarkers = ["i can't", "i cannot", "as an ai", "ошибка", "не могу выполнить", "недостаточно данных"];
  if (technicalErrorMarkers.some((marker) => normalized.includes(marker)) && updatedText.length < 180) {
    throw new AppError("AI_RESPONSE_INVALID", "AI вернул техническое сообщение вместо блока урока", 502, {
      preview: updatedText.slice(0, 180),
    });
  }

  return {
    updatedText,
    changeSummary: clean(record.change_summary) || "Блок обновлён локальной AI-перегенерацией.",
    warnings,
    cannotApply: false,
  };
}

async function setLessonEditedStatus(db: SupabaseClient, lessonId: string): Promise<void> {
  const edited = await db.from("lessons").update({ content_status: "edited" }).eq("id", lessonId);
  if (!edited.error) return;

  const generated = await db.from("lessons").update({ content_status: "generated" }).eq("id", lessonId);
  if (generated.error) {
    throw new AppError("DATABASE_ERROR", "Не удалось обновить статус урока", 500, { error: generated.error.message });
  }
}

async function regenerateBlock(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const requestBody = await readJsonBody(req);
  const courseId = clean(requestBody.course_id ?? requestBody.courseId);
  const lessonId = clean(requestBody.lesson_id ?? requestBody.lessonId);
  const rawBlockType = clean(requestBody.block_type ?? requestBody.blockType);
  const rawCommand = clean(requestBody.command);
  const customInstruction = clean(requestBody.custom_instruction ?? requestBody.customInstruction);

  if (!courseId || !lessonId) {
    throw new AppError("INVALID_INPUT", "Нужно передать course_id и lesson_id", 400);
  }

  if (!isBlockType(rawBlockType)) {
    throw new AppError("INVALID_INPUT", "Неизвестный тип блока для перегенерации", 400, {
      block_type: rawBlockType,
      allowed_block_types: [...BLOCK_TYPES],
    });
  }

  if (!isBlockCommand(rawCommand)) {
    throw new AppError("INVALID_INPUT", "Неизвестная AI-команда для блока", 400, {
      command: rawCommand,
      allowed_commands: [...COMMANDS],
    });
  }

  const blockType = rawBlockType;
  const command = rawCommand;

  if (command === "custom" && !customInstruction) {
    throw new AppError("INVALID_INPUT", "Для пользовательской команды нужно передать custom_instruction", 400);
  }

  await audit(db, {
    userId,
    courseId,
    action: "regenerate_lesson_block_started",
    entityType: "lesson",
    entityId: lessonId,
    metadata: {
      lesson_id: lessonId,
      block_type: blockType,
      command,
      custom_instruction: customInstruction || null,
      generation_target: "block",
    },
  });

  let sourceForFailure: SourceBundle | null = null;

  try {
    const course = await getOwnedCourse(db, courseId, userId);
    const { lesson, module, neighbors } = await getLessonContext(db, courseId, lessonId);

    const { data: contentData, error: contentError } = await db
      .from("lesson_contents")
      .select("*")
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (contentError) {
      throw new AppError("DATABASE_ERROR", "Не удалось загрузить содержание урока", 500, { error: contentError.message });
    }

    const contentRow = asRecord(contentData);
    if (!contentRow) {
      throw new AppError("LESSON_CONTENT_NOT_FOUND", "Содержание урока ещё не создано. Сначала сгенерируйте урок целиком.", 404);
    }

    const currentText = clean(contentRow[blockType]);
    if (!currentText) {
      throw new AppError("BLOCK_EMPTY", "Выбранный блок пустой. Сначала заполните или сгенерируйте этот блок.", 400, {
        block_type: blockType,
      });
    }

    const source = await loadSources(db, course);
    sourceForFailure = source;

    const otherBlocks = BLOCK_TYPES
      .filter((type) => type !== blockType)
      .map((type) => `${type}:\n${clean(contentRow[type]) || "[пусто]"}`)
      .join("\n\n---\n\n");

    const neighborLines = (neighbors ?? [])
      .map((row) => {
        const rec = asRecord(row);
        if (!rec) return "";
        const marker = clean(rec.id) === lessonId ? "текущий" : "соседний";
        return `- ${marker} урок ${clean(rec.position)}: ${clean(rec.title)}. ${clean(rec.summary)}`;
      })
      .filter(Boolean)
      .join("\n") || "нет соседних уроков";

    const responseSchema = {
      updated_text: "string",
      change_summary: "string",
      warnings: ["string"],
      cannot_apply: false,
    };

    const prompt = [
      "Локально перегенерируй только один выбранный блок урока. Верни строго JSON без markdown и без пояснений вокруг JSON.",
      "Схема ответа:",
      JSON.stringify(responseSchema),
      "Критически важно: не возвращай весь урок и не меняй остальные блоки. Новый текст должен относиться только к выбранному block_type.",
      `Команда: ${command}`,
      `Интерпретация команды: ${COMMAND_DESCRIPTIONS[command]}`,
      customInstruction ? `Пользовательская инструкция: ${customInstruction}` : "Пользовательская инструкция: нет",
      `Выбранный блок: ${blockType} (${blockLabel(blockType)})`,
      `Курс:\n${courseContext(course)}`,
      `Модуль: ${clean(module.title)}\nОписание модуля: ${clean(module.description)}\nПозиция модуля: ${clean(module.position)}`,
      `Урок: ${clean(lesson.title)}\nПозиция урока: ${clean(lesson.position)}\nЦель: ${clean(lesson.objective)}\nОписание: ${clean(lesson.summary)}\nОжидаемый результат: ${clean(lesson.learning_outcome)}\nДлительность: ${clean(lesson.estimated_duration) || "не указана"}`,
      `Соседние уроки:\n${neighborLines}`,
      `Текущий текст выбранного блока:\n${currentText}`,
      `Остальные блоки только как контекст, их нельзя переписывать:\n${otherBlocks}`,
      source.enabled
        ? `Источники курса. only_source_mode=${source.only}. ${source.only ? "Строгий режим: обновлённый блок должен оставаться в рамках источника. Не добавляй неподтверждённые внешние факты, даты, цифры, имена, термины или примеры. Если источника недостаточно для команды, верни cannot_apply=true и warnings, а updated_text оставь пустым." : "Используй источник как основу и не противоречь ему."}\n${source.text}`
        : "Курс создаётся без источника.",
      "Правила качества: сохраняй язык курса, уровень сложности и образовательную цель урока; не добавляй воду; не противоречь соседним блокам; не включай служебные комментарии в updated_text.",
    ].join("\n\n");

    const aiResult = validateRegeneratedBlockResponse(await callAi(buildSystemPrompt(course), prompt));

    if (source.only && aiResult.cannotApply) {
      throw new AppError("ONLY_SOURCE_INSUFFICIENT", "Источник не содержит достаточно данных для такой перегенерации блока.", 400, {
        warnings: aiResult.warnings,
      });
    }

    if (aiResult.cannotApply) {
      throw new AppError("AI_RESPONSE_INVALID", "AI не смог применить команду к выбранному блоку", 502, {
        warnings: aiResult.warnings,
      });
    }

    const oldTextLength = currentText.length;
    const newTextLength = aiResult.updatedText.length;

    const { data: updatedContent, error: updateError } = await db
      .from("lesson_contents")
      .update({ [blockType]: aiResult.updatedText, updated_at: new Date().toISOString() })
      .eq("lesson_id", lessonId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      throw new AppError("DATABASE_ERROR", "Не удалось обновить выбранный блок урока", 500, { error: updateError.message });
    }

    const updatedRecord = asRecord(updatedContent);
    if (!updatedRecord) {
      throw new AppError("DATABASE_ERROR", "Блок был обновлён, но новое содержимое не удалось прочитать", 500);
    }

    const changedOtherBlocks = BLOCK_TYPES.filter((type) => type !== blockType).filter((type) => clean(contentRow[type]) !== clean(updatedRecord[type]));
    if (changedOtherBlocks.length > 0) {
      console.warn("Unexpected non-target lesson_contents fields changed", changedOtherBlocks);
    }

    await setLessonEditedStatus(db, lessonId);

    const versionWarnings: string[] = [];
    let versionId: string | null = null;
    try {
      versionId = await createCourseVersion(
        db,
        courseId,
        userId,
        "lesson_block_regenerated",
        `${commandLabel(command)} ${blockLabel(blockType)} урока: ${clean(lesson.title)}`,
      );
    } catch (versionError) {
      console.warn("lesson block regenerated, but course version creation failed", versionError);
      versionWarnings.push("Блок обновлён, но версию курса создать не удалось. Проверьте историю версий позже.");
    }

    const warnings = [...source.warnings, ...aiResult.warnings, ...versionWarnings];

    await audit(db, {
      userId,
      courseId,
      action: "regenerate_lesson_block_completed",
      entityType: "lesson",
      entityId: lessonId,
      metadata: {
        lesson_id: lessonId,
        block_type: blockType,
        command,
        custom_instruction: customInstruction || null,
        version_id: versionId,
        generation_target: "block",
        old_text_length: oldTextLength,
        new_text_length: newTextLength,
        change_summary: aiResult.changeSummary,
        warnings,
        ...sourceAuditMetadata(source),
      },
    });

    return jsonResponse({
      lesson_id: lessonId,
      block_type: blockType,
      command,
      updated_text: aiResult.updatedText,
      change_summary: aiResult.changeSummary,
      lesson_content: updatedContent,
      version_id: versionId,
      source_mode: source.enabled,
      only_source_mode: source.only,
      source_warnings: source.warnings,
      warnings,
    });
  } catch (error) {
    await audit(db, {
      userId,
      courseId,
      action: "regenerate_lesson_block_failed",
      entityType: "lesson",
      entityId: lessonId,
      metadata: {
        lesson_id: lessonId,
        block_type: blockType,
        command,
        custom_instruction: customInstruction || null,
        generation_target: "block",
        ...(sourceForFailure ? sourceAuditMetadata(sourceForFailure) : {}),
        ...errorPayload(error),
      },
    });
    throw error;
  }
}

export function serveAction(action: Action): void {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: { code: "INVALID_INPUT", message: "Метод не поддерживается", details: {} } }, 405);
    }

    try {
      const db = serviceClient();
      const userId = await getUserId(req);

      if (action === "generate-course-plan") return await generatePlan(req, db, userId);
      if (action === "generate-lesson-content") return await generateLesson(req, db, userId);
      if (action === "generate-course-content") return await generateCourseContent(req, db, userId);
      return await regenerateBlock(req, db, userId);
    } catch (error) {
      return errorResponse(error);
    }
  });
}
