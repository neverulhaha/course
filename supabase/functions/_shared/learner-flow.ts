import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type Action =
  | "generate-lesson-quiz"
  | "generate-course-quiz"
  | "submit-quiz-attempt"
  | "submit-assignment"
  | "complete-lesson"
  | "recalculate-progress";

type Rec = Record<string, unknown>;

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "COURSE_NOT_FOUND"
  | "LESSON_NOT_FOUND"
  | "LESSON_CONTENT_NOT_FOUND"
  | "COURSE_CONTENT_NOT_READY"
  | "QUIZ_NOT_FOUND"
  | "QUIZ_ALREADY_EXISTS"
  | "QUESTION_NOT_FOUND"
  | "INVALID_ANSWERS"
  | "INVALID_INPUT"
  | "SOURCE_REQUIRED"
  | "SOURCE_NOT_FOUND"
  | "EMPTY_SOURCE"
  | "SOURCE_TOO_SHORT"
  | "ONLY_SOURCE_INSUFFICIENT"
  | "AI_RESPONSE_INVALID"
  | "GENERATION_FAILED"
  | "DATABASE_ERROR";

const AI_BASE_URL = Deno.env.get("AI_BASE_URL")?.trim().replace(/\/+$/, "") || "https://api.openai.com/v1";
const AI_API_KEY = Deno.env.get("AI_API_KEY")?.trim() || Deno.env.get("OPENAI_API_KEY")?.trim() || "";
const AI_MODEL = Deno.env.get("AI_MODEL")?.trim() || Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
const AI_PROVIDER = Deno.env.get("AI_PROVIDER")?.trim().toLowerCase() || "openai";
const AI_USE_RESPONSE_FORMAT = Deno.env.get("AI_USE_RESPONSE_FORMAT")?.trim().toLowerCase() !== "false";
const MIN_SOURCE_LENGTH = Number.isFinite(Number(Deno.env.get("MIN_SOURCE_LENGTH"))) ? Math.max(1, Number(Deno.env.get("MIN_SOURCE_LENGTH"))) : 700;
const MAX_SOURCE_CHARS = Number.isFinite(Number(Deno.env.get("MAX_SOURCE_CHARS"))) ? Math.max(MIN_SOURCE_LENGTH, Number(Deno.env.get("MAX_SOURCE_CHARS"))) : 120000;

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
  return jsonResponse({ error: { code: "GENERATION_FAILED", message: "Не удалось выполнить операцию. Попробуйте ещё раз.", details: { message } } }, 500);
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
function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.round(n)) : fallback;
}
function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new AppError("GENERATION_FAILED", `Не задана переменная окружения ${name}`, 500);
  return value;
}
function serviceClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
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
async function readJsonBody(req: Request): Promise<Rec> {
  const raw = await req.text();
  if (!raw.trim()) return {};
  try {
    const obj = JSON.parse(raw);
    const rec = asRecord(obj);
    if (!rec) throw new Error("Body must be a JSON object");
    return rec;
  } catch (error) {
    throw new AppError("INVALID_INPUT", "Тело запроса должно быть корректным JSON-объектом", 400, { error: error instanceof Error ? error.message : String(error) });
  }
}
async function getOwnedCourse(db: SupabaseClient, courseId: string, userId: string): Promise<Rec> {
  const { data, error } = await db.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить курс", 500, { error: error.message });
  const course = asRecord(data);
  if (!course) throw new AppError("COURSE_NOT_FOUND", "Курс не найден", 404);
  if (clean(course.author_id) !== userId) throw new AppError("FORBIDDEN", "Нет доступа к курсу", 403);
  return course;
}
async function getCourseForQuiz(db: SupabaseClient, quizId: string): Promise<{ quiz: Rec; course: Rec; lessonId: string | null }> {
  const { data: quizData, error: quizError } = await db.from("quizzes").select("*").eq("id", quizId).maybeSingle();
  if (quizError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить квиз", 500, { error: quizError.message });
  const quiz = asRecord(quizData);
  if (!quiz) throw new AppError("QUIZ_NOT_FOUND", "Квиз не найден", 404);
  const courseIdDirect = clean(quiz.course_id);
  const lessonId = clean(quiz.lesson_id) || null;
  if (courseIdDirect) {
    const { data: courseData, error } = await db.from("courses").select("*").eq("id", courseIdDirect).maybeSingle();
    if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить курс квиза", 500, { error: error.message });
    const course = asRecord(courseData);
    if (!course) throw new AppError("COURSE_NOT_FOUND", "Курс квиза не найден", 404);
    return { quiz, course, lessonId };
  }
  if (!lessonId) throw new AppError("QUIZ_NOT_FOUND", "Квиз не связан с курсом или уроком", 404);
  const { lesson, module } = await getLessonContext(db, "", lessonId, false);
  const { data: courseData, error } = await db.from("courses").select("*").eq("id", clean(module.course_id)).maybeSingle();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить курс урока", 500, { error: error.message });
  const course = asRecord(courseData);
  if (!course) throw new AppError("COURSE_NOT_FOUND", "Курс урока не найден", 404);
  return { quiz, course, lessonId: clean(lesson.id) };
}
function errorPayload(error: unknown): Rec {
  if (error instanceof AppError) return { error_code: error.code, error_message: error.message, details: error.details };
  return { error_code: "GENERATION_FAILED", error_message: error instanceof Error ? error.message : String(error) };
}
async function audit(db: SupabaseClient, payload: { userId: string; courseId?: string; action: string; entityType: string; entityId?: string; metadata?: Rec }): Promise<void> {
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
  return [generationMode, sourceMode].some((v) => ["source", "sources", "by_source", "text"].includes(v));
}
function normalizeSourceText(value: unknown): string {
  return clean(value).replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
type SourceBundle = { enabled: boolean; only: boolean; text: string; sourceCount: number; sourceLength: number; warnings: string[]; truncated: boolean };
function emptySource(): SourceBundle { return { enabled: false, only: false, text: "", sourceCount: 0, sourceLength: 0, warnings: [], truncated: false }; }
async function loadSources(db: SupabaseClient, course: Rec): Promise<SourceBundle> {
  if (!isSourceMode(course)) return emptySource();
  const { data, error } = await db.from("sources").select("id, source_type, raw_text, only_source_mode, created_at").eq("course_id", clean(course.id)).order("created_at", { ascending: true });
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить источники", 500, { error: error.message });
  const rows = (data ?? []).map(asRecord).filter(Boolean) as Rec[];
  if (rows.length === 0) throw new AppError("SOURCE_REQUIRED", "Для курса по источнику нужно добавить текстовый источник", 400);
  const textSources = rows.filter((row) => clean(row.source_type).toLowerCase() === "text" || hasText(row.raw_text));
  if (textSources.length === 0) throw new AppError("SOURCE_NOT_FOUND", "Текстовый источник не найден", 400);
  const only = rows.some((row) => Boolean(row.only_source_mode));
  let text = textSources.map((row, i) => {
    const normalized = normalizeSourceText(row.raw_text);
    return normalized ? `Источник ${i + 1}:\n${normalized}` : "";
  }).filter(Boolean).join("\n\n---\n\n");
  if (!text.trim()) throw new AppError("EMPTY_SOURCE", "Текст источника пустой", 400);
  const warnings: string[] = [];
  const sourceLength = text.length;
  let truncated = false;
  if (text.length > MAX_SOURCE_CHARS) {
    text = text.slice(0, MAX_SOURCE_CHARS).trim();
    truncated = true;
    warnings.push(`Источник был сокращён до ${MAX_SOURCE_CHARS} символов для стабильной генерации.`);
  }
  if (text.length < MIN_SOURCE_LENGTH) throw new AppError(only ? "ONLY_SOURCE_INSUFFICIENT" : "SOURCE_TOO_SHORT", `Текст источника слишком короткий. Минимум ${MIN_SOURCE_LENGTH} символов.`, 400);
  return { enabled: true, only, text, sourceCount: textSources.length, sourceLength, warnings, truncated };
}
function sourceAuditMetadata(source: SourceBundle): Rec {
  return { source_mode: source.enabled, only_source_mode: source.only, source_count: source.sourceCount, source_length: source.sourceLength, source_warnings: source.warnings, source_truncated: source.truncated };
}

function parseAiJson(raw: string): unknown {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) text = text.slice(first, last + 1);
  try { return JSON.parse(text); } catch (error) {
    throw new AppError("AI_RESPONSE_INVALID", "ИИ вернул некорректный JSON", 502, { error: error instanceof Error ? error.message : String(error), preview: raw.slice(0, 400) });
  }
}
async function callAi(systemPrompt: string, userPrompt: string): Promise<unknown> {
  if (!AI_API_KEY) throw new AppError("GENERATION_FAILED", "AI API ключ не настроен", 500, { missing: "AI_API_KEY" });
  const headers: Record<string, string> = { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" };
  if (AI_PROVIDER === "openrouter") {
    headers["HTTP-Referer"] = Deno.env.get("OPENROUTER_SITE_URL")?.trim() || "https://course-rosy.vercel.app";
    headers["X-Title"] = Deno.env.get("OPENROUTER_APP_NAME")?.trim() || "Diplom Course Generator";
  }
  const body: Rec = { model: AI_MODEL, temperature: 0.2, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] };
  if (AI_USE_RESPONSE_FORMAT) body.response_format = { type: "json_object" };
  const response = await fetch(`${AI_BASE_URL}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const err = asRecord(asRecord(json)?.error);
    throw new AppError("GENERATION_FAILED", "AI API вернул ошибку", 502, { status: response.status, message: clean(err?.message) || "AI API error", type: clean(err?.type) || null });
  }
  const choices = Array.isArray(asRecord(json)?.choices) ? (asRecord(json)?.choices as unknown[]) : [];
  const content = clean(asRecord(asRecord(choices[0])?.message)?.content);
  if (!content) throw new AppError("AI_RESPONSE_INVALID", "AI API вернул пустой ответ", 502);
  return parseAiJson(content);
}
function buildSystemPrompt(course: Rec): string {
  return [
    "Ты — методист образовательной платформы и эксперт по проверочным заданиям.",
    "Верни строго валидный JSON без markdown и пояснений вокруг JSON.",
    `Язык ответа: ${clean(course.language) || "ru"}.`,
    `Тон: ${clean(course.tone) || "neutral"}.`,
    "Вопросы должны проверять содержание материала, а не случайные детали.",
  ].join("\n");
}
function courseContext(course: Rec): string {
  return [`Название: ${clean(course.title)}`, `Тема: ${clean(course.topic)}`, `Уровень: ${clean(course.level)}`, `Цель: ${clean(course.goal) || "не указана"}`, `Формат: ${clean(course.format) || "смешанный"}`, `Тон: ${clean(course.tone) || "neutral"}`].join("\n");
}
function warningsFrom(record: Rec): string[] { return Array.isArray(record.warnings) ? record.warnings.map(clean).filter(Boolean) : []; }

async function buildSnapshot(db: SupabaseClient, courseId: string): Promise<Rec> {
  const { data: course } = await db.from("courses").select("*").eq("id", courseId).maybeSingle();
  const { data: modules } = await db.from("modules").select("*").eq("course_id", courseId).order("position", { ascending: true });
  const moduleIds = (modules ?? []).map((m) => clean(asRecord(m)?.id)).filter(Boolean);
  const { data: lessons } = moduleIds.length ? await db.from("lessons").select("*").in("module_id", moduleIds).order("position", { ascending: true }) : { data: [] as unknown[] };
  const lessonIds = (lessons ?? []).map((l) => clean(asRecord(l)?.id)).filter(Boolean);
  const { data: lessonContents } = lessonIds.length ? await db.from("lesson_contents").select("*").in("lesson_id", lessonIds) : { data: [] as unknown[] };
  const { data: sources } = await db.from("sources").select("*").eq("course_id", courseId).order("created_at", { ascending: true });
  const { data: courseQuizzes } = await db.from("quizzes").select("*").eq("course_id", courseId);
  const { data: lessonQuizzes } = lessonIds.length ? await db.from("quizzes").select("*").in("lesson_id", lessonIds) : { data: [] as unknown[] };
  const quizzes = [...(courseQuizzes ?? []), ...(lessonQuizzes ?? [])];
  const quizIds = quizzes.map((q) => clean(asRecord(q)?.id)).filter(Boolean);
  const { data: questions } = quizIds.length ? await db.from("questions").select("*").in("quiz_id", quizIds).order("position", { ascending: true }) : { data: [] as unknown[] };
  const questionIds = (questions ?? []).map((q) => clean(asRecord(q)?.id)).filter(Boolean);
  const { data: answerOptions } = questionIds.length ? await db.from("answer_options").select("*").in("question_id", questionIds).order("position", { ascending: true }) : { data: [] as unknown[] };
  return { schema_version: 1, captured_at: new Date().toISOString(), course: course ?? null, modules: modules ?? [], lessons: lessons ?? [], lesson_contents: lessonContents ?? [], sources: sources ?? [], quizzes, questions: questions ?? [], answer_options: answerOptions ?? [] };
}
async function createCourseVersion(db: SupabaseClient, courseId: string, userId: string, changeType: string, description: string): Promise<string | null> {
  const { data: latest, error: latestError } = await db.from("course_versions").select("version_number").eq("course_id", courseId).order("version_number", { ascending: false }).limit(1);
  if (latestError) throw new AppError("DATABASE_ERROR", "Не удалось определить номер версии", 500, { error: latestError.message });
  const latestNumber = Number(asRecord((latest ?? [])[0])?.version_number ?? 0);
  const versionNumber = Number.isFinite(latestNumber) ? latestNumber + 1 : 1;
  const snapshot = await buildSnapshot(db, courseId);
  const { data, error } = await db.from("course_versions").insert({ course_id: courseId, version_number: versionNumber, change_type: changeType, change_description: description, qa_score: null, created_by: userId, snapshot_data: snapshot }).select("id").maybeSingle();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось создать версию курса", 500, { error: error.message });
  const versionId = clean(asRecord(data)?.id) || null;
  if (versionId) {
    const { error: updateError } = await db.from("courses").update({ current_version_id: versionId }).eq("id", courseId);
    if (updateError) console.warn("courses.current_version_id update failed", updateError.message);
    await audit(db, { userId, courseId, action: "course_version_created", entityType: "course_version", entityId: versionId, metadata: { change_type: changeType, version_number: versionNumber } });
  }
  return versionId;
}

async function getLessonContext(db: SupabaseClient, courseId: string, lessonId: string, requireCourseMatch = true): Promise<{ lesson: Rec; module: Rec }> {
  const { data: lessonData, error: lessonError } = await db.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (lessonError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить урок", 500, { error: lessonError.message });
  const lesson = asRecord(lessonData);
  if (!lesson) throw new AppError("LESSON_NOT_FOUND", "Урок не найден", 404);
  const { data: moduleData, error: moduleError } = await db.from("modules").select("*").eq("id", clean(lesson.module_id)).maybeSingle();
  if (moduleError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить модуль урока", 500, { error: moduleError.message });
  const module = asRecord(moduleData);
  if (!module) throw new AppError("LESSON_NOT_FOUND", "Модуль урока не найден", 404);
  if (requireCourseMatch && clean(module.course_id) !== courseId) throw new AppError("FORBIDDEN", "Урок не относится к указанному курсу", 403);
  return { lesson, module };
}
async function getLessonContent(db: SupabaseClient, lessonId: string): Promise<Rec> {
  const { data, error } = await db.from("lesson_contents").select("*").eq("lesson_id", lessonId).maybeSingle();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить содержание урока", 500, { error: error.message });
  const row = asRecord(data);
  if (!row) throw new AppError("LESSON_CONTENT_NOT_FOUND", "Содержание урока ещё не создано", 404);
  return row;
}

type QuizAiQuestion = { question_text: string; question_type: "single_choice"; explanation: string; options: { answer_text: string; is_correct: boolean }[] };
type QuizAiResult = { title: string; description: string; warnings: string[]; questions: QuizAiQuestion[] };
function validateQuizResponse(value: unknown, requestedCount: number): QuizAiResult {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.questions) || record.questions.length === 0) throw new AppError("AI_RESPONSE_INVALID", "AI не вернул вопросы квиза", 502);
  const questions = record.questions.slice(0, Math.max(1, requestedCount)).map((raw, index) => {
    const q = asRecord(raw);
    if (!q || !clean(q.question_text) || !clean(q.explanation)) throw new AppError("AI_RESPONSE_INVALID", `Вопрос ${index + 1} заполнен не полностью`, 502);
    const questionType = clean(q.question_type) || "single_choice";
    if (questionType !== "single_choice") throw new AppError("AI_RESPONSE_INVALID", `Вопрос ${index + 1}: поддерживается только single_choice`, 502);
    const options = Array.isArray(q.options) ? q.options.map(asRecord).filter(Boolean) as Rec[] : [];
    if (options.length < 2) throw new AppError("AI_RESPONSE_INVALID", `Вопрос ${index + 1}: должно быть минимум 2 варианта ответа`, 502);
    const normalizedOptions = options.slice(0, 6).map((opt) => ({ answer_text: clean(opt.answer_text), is_correct: Boolean(opt.is_correct) }));
    if (normalizedOptions.some((opt) => !opt.answer_text)) throw new AppError("AI_RESPONSE_INVALID", `Вопрос ${index + 1}: вариант ответа пустой`, 502);
    const correctCount = normalizedOptions.filter((opt) => opt.is_correct).length;
    if (correctCount !== 1) throw new AppError("AI_RESPONSE_INVALID", `Вопрос ${index + 1}: у single_choice должен быть ровно один правильный ответ`, 502);
    return { question_text: clean(q.question_text), question_type: "single_choice" as const, explanation: clean(q.explanation), options: normalizedOptions };
  });
  return { title: clean(record.title) || "Квиз", description: clean(record.description), warnings: warningsFrom(record), questions };
}
async function createQuizGraph(db: SupabaseClient, payload: { courseId: string; lessonId?: string | null; quiz: QuizAiResult }): Promise<string> {
  let quizId = "";
  const insertedQuestionIds: string[] = [];
  try {
    const { data: quizRow, error: quizError } = await db.from("quizzes").insert({ course_id: payload.lessonId ? null : payload.courseId, lesson_id: payload.lessonId ?? null, title: payload.quiz.title, description: payload.quiz.description || null }).select("id").maybeSingle();
    if (quizError) throw new AppError("DATABASE_ERROR", "Не удалось сохранить квиз", 500, { error: quizError.message });
    quizId = clean(asRecord(quizRow)?.id);
    if (!quizId) throw new AppError("DATABASE_ERROR", "База не вернула id квиза", 500);
    for (let i = 0; i < payload.quiz.questions.length; i++) {
      const q = payload.quiz.questions[i]!;
      const { data: questionRow, error: questionError } = await db.from("questions").insert({ quiz_id: quizId, question_text: q.question_text, question_type: q.question_type, explanation: q.explanation, position: i + 1 }).select("id").maybeSingle();
      if (questionError) throw new AppError("DATABASE_ERROR", "Не удалось сохранить вопрос квиза", 500, { error: questionError.message });
      const questionId = clean(asRecord(questionRow)?.id);
      if (!questionId) throw new AppError("DATABASE_ERROR", "База не вернула id вопроса", 500);
      insertedQuestionIds.push(questionId);
      const optionRows = q.options.map((opt, idx) => ({ question_id: questionId, answer_text: opt.answer_text, is_correct: opt.is_correct, position: idx + 1 }));
      const { error: optionsError } = await db.from("answer_options").insert(optionRows);
      if (optionsError) throw new AppError("DATABASE_ERROR", "Не удалось сохранить варианты ответов", 500, { error: optionsError.message });
    }
    return quizId;
  } catch (error) {
    try {
      if (quizId) await db.from("quizzes").delete().eq("id", quizId);
      else if (insertedQuestionIds.length) await db.from("questions").delete().in("id", insertedQuestionIds);
    } catch (cleanupError) {
      console.warn("quiz creation cleanup failed", cleanupError);
    }
    throw error;
  }
}
async function fetchQuizGraph(db: SupabaseClient, quizId: string, includeCorrect: boolean): Promise<Rec> {
  const { data: quiz } = await db.from("quizzes").select("*").eq("id", quizId).maybeSingle();
  const { data: questions } = await db.from("questions").select("*").eq("quiz_id", quizId).order("position", { ascending: true });
  const resultQuestions: Rec[] = [];
  for (const q of questions ?? []) {
    const qr = asRecord(q);
    const qid = clean(qr?.id);
    if (!qid) continue;
    const { data: options } = await db.from("answer_options").select(includeCorrect ? "*" : "id, answer_text, position").eq("question_id", qid).order("position", { ascending: true });
    resultQuestions.push({ ...qr, options: options ?? [] });
  }
  return { quiz, questions: resultQuestions };
}

async function existingQuizWithAttempts(db: SupabaseClient, opts: { courseId: string; lessonId?: string | null }): Promise<{ hasAttempts: boolean; quizIds: string[] }> {
  const query = db.from("quizzes").select("id");
  const { data, error } = opts.lessonId ? await query.eq("lesson_id", opts.lessonId) : await query.eq("course_id", opts.courseId).is("lesson_id", null);
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось проверить существующие квизы", 500, { error: error.message });
  const quizIds = (data ?? []).map((row) => clean(asRecord(row)?.id)).filter(Boolean);
  if (quizIds.length === 0) return { hasAttempts: false, quizIds: [] };
  const { count, error: attemptsError } = await db.from("quiz_attempts").select("*", { count: "exact", head: true }).in("quiz_id", quizIds);
  if (attemptsError) throw new AppError("DATABASE_ERROR", "Не удалось проверить попытки квиза", 500, { error: attemptsError.message });
  return { hasAttempts: (count ?? 0) > 0, quizIds };
}
async function replaceOldQuizzesIfSafe(db: SupabaseClient, opts: { courseId: string; lessonId?: string | null; force: boolean }): Promise<void> {
  const existing = await existingQuizWithAttempts(db, opts);
  if (existing.quizIds.length === 0) return;
  if (!opts.force) throw new AppError("QUIZ_ALREADY_EXISTS", "Для этого урока или курса уже есть квиз. Повторная генерация требует подтверждения.", 409, { quiz_ids: existing.quizIds });
  if (existing.hasAttempts) return;
  const { error } = await db.from("quizzes").delete().in("id", existing.quizIds);
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось заменить старый квиз", 500, { error: error.message });
}

async function generateLessonQuiz(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const body = await readJsonBody(req);
  const courseId = clean(body.course_id ?? body.courseId);
  const lessonId = clean(body.lesson_id ?? body.lessonId);
  const questionsCount = Math.min(20, toInt(body.questions_count ?? body.questionsCount, 5));
  const force = Boolean(body.force);
  if (!courseId || !lessonId) throw new AppError("INVALID_INPUT", "Нужно передать course_id и lesson_id", 400);
  await audit(db, { userId, courseId, action: "generate_lesson_quiz_started", entityType: "lesson", entityId: lessonId, metadata: { lesson_id: lessonId, questions_count: questionsCount, force } });
  try {
    const course = await getOwnedCourse(db, courseId, userId);
    const { lesson, module } = await getLessonContext(db, courseId, lessonId);
    const content = await getLessonContent(db, lessonId);
    await replaceOldQuizzesIfSafe(db, { courseId, lessonId, force });
    const source = await loadSources(db, course);
    const material = [`Теория:\n${clean(content.theory_text)}`, `Примеры:\n${clean(content.examples_text)}`, `Практика:\n${clean(content.practice_text)}`, `Чек-лист:\n${clean(content.checklist_text)}`].join("\n\n");
    const prompt = [
      "Сгенерируй квиз по одному уроку. Верни строго JSON:",
      JSON.stringify({ title: "string", description: "string", warnings: ["string"], questions: [{ question_text: "string", question_type: "single_choice", explanation: "string", options: [{ answer_text: "string", is_correct: true }, { answer_text: "string", is_correct: false }, { answer_text: "string", is_correct: false }, { answer_text: "string", is_correct: false }] }] }),
      `Количество вопросов: ${questionsCount}. У каждого вопроса 4 варианта ответа, ровно один правильный.`,
      `Курс:\n${courseContext(course)}`,
      `Модуль: ${clean(module.title)} — ${clean(module.description)}`,
      `Урок: ${clean(lesson.title)}\nЦель: ${clean(lesson.objective)}\nОписание: ${clean(lesson.summary)}\nРезультат: ${clean(lesson.learning_outcome)}`,
      `Материал урока:\n${material}`,
      source.enabled ? `Источник. only_source_mode=${source.only}. ${source.only ? "Строго не добавляй факты вне источника и материала урока." : "Учитывай источник как контекст."}\n${source.text}` : "Курс без источника.",
    ].join("\n\n");
    const quiz = validateQuizResponse(await callAi(buildSystemPrompt(course), prompt), questionsCount);
    const quizId = await createQuizGraph(db, { courseId, lessonId, quiz });
    const versionId = await createCourseVersion(db, courseId, userId, "lesson_quiz_generated", `Сгенерирован квиз по уроку: ${clean(lesson.title)}`);
    await audit(db, { userId, courseId, action: "generate_lesson_quiz_completed", entityType: "quiz", entityId: quizId, metadata: { lesson_id: lessonId, quiz_id: quizId, questions_count: quiz.questions.length, version_id: versionId, warnings: [...source.warnings, ...quiz.warnings], ...sourceAuditMetadata(source) } });
    return jsonResponse({ quiz_id: quizId, version_id: versionId, warnings: [...source.warnings, ...quiz.warnings], ...(await fetchQuizGraph(db, quizId, true)) });
  } catch (error) {
    await audit(db, { userId, courseId, action: "generate_lesson_quiz_failed", entityType: "lesson", entityId: lessonId, metadata: { lesson_id: lessonId, ...errorPayload(error) } });
    throw error;
  }
}

async function generateCourseQuiz(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const body = await readJsonBody(req);
  const courseId = clean(body.course_id ?? body.courseId);
  const questionsCount = Math.min(30, toInt(body.questions_count ?? body.questionsCount, 10));
  const force = Boolean(body.force);
  if (!courseId) throw new AppError("INVALID_INPUT", "Нужно передать course_id", 400);
  await audit(db, { userId, courseId, action: "generate_course_quiz_started", entityType: "course", entityId: courseId, metadata: { questions_count: questionsCount, force } });
  try {
    const course = await getOwnedCourse(db, courseId, userId);
    await replaceOldQuizzesIfSafe(db, { courseId, lessonId: null, force });
    const { data: modules, error: mErr } = await db.from("modules").select("*").eq("course_id", courseId).order("position", { ascending: true });
    if (mErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить модули курса", 500, { error: mErr.message });
    const moduleIds = (modules ?? []).map((m) => clean(asRecord(m)?.id)).filter(Boolean);
    const { data: lessons, error: lErr } = moduleIds.length ? await db.from("lessons").select("*").in("module_id", moduleIds).order("position", { ascending: true }) : { data: [], error: null };
    if (lErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить уроки курса", 500, { error: lErr.message });
    const lessonIds = (lessons ?? []).map((l) => clean(asRecord(l)?.id)).filter(Boolean);
    const { data: contents, error: cErr } = lessonIds.length ? await db.from("lesson_contents").select("*").in("lesson_id", lessonIds) : { data: [], error: null };
    if (cErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить содержание курса", 500, { error: cErr.message });
    if (!contents || contents.length === 0) throw new AppError("COURSE_CONTENT_NOT_READY", "Для итогового квиза нужно сначала сгенерировать содержание уроков", 400);
    const contentByLesson = new Map((contents ?? []).map((c) => [clean(asRecord(c)?.lesson_id), asRecord(c) ?? {}]));
    const courseMaterial = (lessons ?? []).map((l) => {
      const lr = asRecord(l) ?? {};
      const content = contentByLesson.get(clean(lr.id));
      if (!content) return "";
      return [`Урок: ${clean(lr.title)}`, clean(content.theory_text), clean(content.examples_text), clean(content.practice_text), clean(content.checklist_text)].filter(Boolean).join("\n");
    }).filter(Boolean).join("\n\n---\n\n").slice(0, 50000);
    if (!courseMaterial.trim()) throw new AppError("COURSE_CONTENT_NOT_READY", "В уроках нет текста для генерации итогового квиза", 400);
    const source = await loadSources(db, course);
    const prompt = [
      "Сгенерируй итоговый квиз по всему курсу. Верни строго JSON:",
      JSON.stringify({ title: "string", description: "string", warnings: ["string"], questions: [{ question_text: "string", question_type: "single_choice", explanation: "string", options: [{ answer_text: "string", is_correct: true }, { answer_text: "string", is_correct: false }, { answer_text: "string", is_correct: false }, { answer_text: "string", is_correct: false }] }] }),
      `Количество вопросов: ${questionsCount}. Покрой разные модули, не концентрируйся только на начале курса.`,
      `Курс:\n${courseContext(course)}`,
      `Материал курса:\n${courseMaterial}`,
      source.enabled ? `Источник. only_source_mode=${source.only}. ${source.only ? "Строго не добавляй факты вне источника и материалов курса." : "Учитывай источник как контекст."}\n${source.text}` : "Курс без источника.",
    ].join("\n\n");
    const quiz = validateQuizResponse(await callAi(buildSystemPrompt(course), prompt), questionsCount);
    const quizId = await createQuizGraph(db, { courseId, lessonId: null, quiz });
    const versionId = await createCourseVersion(db, courseId, userId, "course_quiz_generated", "Сгенерирован итоговый квиз курса");
    await audit(db, { userId, courseId, action: "generate_course_quiz_completed", entityType: "quiz", entityId: quizId, metadata: { quiz_id: quizId, questions_count: quiz.questions.length, version_id: versionId, warnings: [...source.warnings, ...quiz.warnings], ...sourceAuditMetadata(source) } });
    return jsonResponse({ quiz_id: quizId, version_id: versionId, warnings: [...source.warnings, ...quiz.warnings], ...(await fetchQuizGraph(db, quizId, true)) });
  } catch (error) {
    await audit(db, { userId, courseId, action: "generate_course_quiz_failed", entityType: "course", entityId: courseId, metadata: errorPayload(error) });
    throw error;
  }
}

async function loadQuizWithQuestions(db: SupabaseClient, quizId: string): Promise<{ quiz: Rec; questions: Rec[]; optionsByQuestion: Map<string, Rec[]> }> {
  const { data: quizData, error: qErr } = await db.from("quizzes").select("*").eq("id", quizId).maybeSingle();
  if (qErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить квиз", 500, { error: qErr.message });
  const quiz = asRecord(quizData);
  if (!quiz) throw new AppError("QUIZ_NOT_FOUND", "Квиз не найден", 404);
  const { data: qs, error: qsErr } = await db.from("questions").select("*").eq("quiz_id", quizId).order("position", { ascending: true });
  if (qsErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить вопросы", 500, { error: qsErr.message });
  const questions = (qs ?? []).map(asRecord).filter(Boolean) as Rec[];
  const qids = questions.map((q) => clean(q.id)).filter(Boolean);
  const { data: options, error: optErr } = qids.length ? await db.from("answer_options").select("*").in("question_id", qids).order("position", { ascending: true }) : { data: [], error: null };
  if (optErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить варианты ответов", 500, { error: optErr.message });
  const map = new Map<string, Rec[]>();
  for (const opt of options ?? []) {
    const or = asRecord(opt);
    const qid = clean(or?.question_id);
    if (!qid || !or) continue;
    const arr = map.get(qid) ?? [];
    arr.push(or);
    map.set(qid, arr);
  }
  return { quiz, questions, optionsByQuestion: map };
}
async function resolveCourseIdForQuiz(db: SupabaseClient, quiz: Rec): Promise<string> {
  const direct = clean(quiz.course_id);
  if (direct) return direct;
  const lessonId = clean(quiz.lesson_id);
  if (!lessonId) throw new AppError("QUIZ_NOT_FOUND", "Квиз не связан с курсом", 404);
  const { module } = await getLessonContext(db, "", lessonId, false);
  return clean(module.course_id);
}
async function submitQuizAttempt(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const body = await readJsonBody(req);
  const quizId = clean(body.quiz_id ?? body.quizId);
  const answersRaw = Array.isArray(body.answers) ? body.answers : [];
  if (!quizId || answersRaw.length === 0) throw new AppError("INVALID_ANSWERS", "Нужно передать ответы на вопросы", 400);
  const { quiz, questions, optionsByQuestion } = await loadQuizWithQuestions(db, quizId);
  const courseId = await resolveCourseIdForQuiz(db, quiz);
  const course = await getOwnedCourse(db, courseId, userId);
  const answerMap = new Map<string, string[]>();
  for (const item of answersRaw) {
    const rec = asRecord(item);
    const questionId = clean(rec?.question_id ?? rec?.questionId);
    const selected = Array.isArray(rec?.selected_option_ids) ? rec?.selected_option_ids : Array.isArray(rec?.selectedOptionIds) ? rec?.selectedOptionIds : [];
    if (!questionId) throw new AppError("INVALID_ANSWERS", "Ответ содержит пустой question_id", 400);
    answerMap.set(questionId, (selected as unknown[]).map(clean).filter(Boolean));
  }
  if (answerMap.size !== questions.length) throw new AppError("INVALID_ANSWERS", "Нужно ответить на все вопросы", 400);
  let correctCount = 0;
  const details: Rec[] = [];
  for (const q of questions) {
    const qid = clean(q.id);
    const options = optionsByQuestion.get(qid) ?? [];
    const correctIds = options.filter((opt) => opt.is_correct === true).map((opt) => clean(opt.id)).filter(Boolean).sort();
    const selectedIds = (answerMap.get(qid) ?? []).sort();
    const validOptionIds = new Set(options.map((opt) => clean(opt.id)).filter(Boolean));
    if (selectedIds.some((id) => !validOptionIds.has(id))) throw new AppError("INVALID_ANSWERS", "Выбран неизвестный вариант ответа", 400, { question_id: qid });
    const isCorrect = correctIds.length === selectedIds.length && correctIds.every((id, idx) => id === selectedIds[idx]);
    if (isCorrect) correctCount += 1;
    details.push({ question_id: qid, question_text: clean(q.question_text), selected_option_ids: selectedIds, correct_option_ids: correctIds, is_correct: isCorrect, explanation: clean(q.explanation), correct_answers: options.filter((opt) => correctIds.includes(clean(opt.id))).map((opt) => ({ id: clean(opt.id), answer_text: clean(opt.answer_text) })) });
  }
  const totalQuestions = questions.length;
  const percent = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);
  const { count, error: countError } = await db.from("quiz_attempts").select("*", { count: "exact", head: true }).eq("quiz_id", quizId).eq("user_id", userId);
  if (countError) throw new AppError("DATABASE_ERROR", "Не удалось определить номер попытки", 500, { error: countError.message });
  const attemptNumber = (count ?? 0) + 1;
  const resultData = { correct_count: correctCount, total_questions: totalQuestions, percent, answers: details };
  const { data: attempt, error: insertError } = await db.from("quiz_attempts").insert({ quiz_id: quizId, user_id: userId, score: percent, attempt_number: attemptNumber, result_data: resultData }).select("*").maybeSingle();
  if (insertError) throw new AppError("DATABASE_ERROR", "Не удалось сохранить попытку квиза", 500, { error: insertError.message });
  let progress: Rec | null = null;
  let progress_warning: string | null = null;
  try { progress = await recalculateProgressInternal(db, courseId, userId, null); } catch (error) { progress_warning = error instanceof Error ? error.message : String(error); console.warn("progress recalc after quiz failed", error); }
  await audit(db, { userId, courseId, action: "quiz_attempt_submitted", entityType: "quiz", entityId: quizId, metadata: { quiz_id: quizId, attempt_number: attemptNumber, score: percent, correct_count: correctCount, total_questions: totalQuestions } });
  return jsonResponse({ quiz_id: quizId, course_id: courseId, attempt, score: percent, correct_count: correctCount, total_questions: totalQuestions, percent, details, progress, progress_warning, course_title: clean(course.title) });
}

async function courseLessonIds(db: SupabaseClient, courseId: string): Promise<string[]> {
  const { data: modules, error: mErr } = await db.from("modules").select("id").eq("course_id", courseId).order("position", { ascending: true });
  if (mErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить модули курса", 500, { error: mErr.message });
  const moduleIds = (modules ?? []).map((m) => clean(asRecord(m)?.id)).filter(Boolean);
  if (moduleIds.length === 0) return [];
  const { data: lessons, error: lErr } = await db.from("lessons").select("id").in("module_id", moduleIds).order("position", { ascending: true });
  if (lErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить уроки курса", 500, { error: lErr.message });
  return (lessons ?? []).map((l) => clean(asRecord(l)?.id)).filter(Boolean);
}
async function verifyLessonAccess(db: SupabaseClient, courseId: string, lessonId: string, userId: string): Promise<Rec> {
  await getOwnedCourse(db, courseId, userId);
  const { lesson } = await getLessonContext(db, courseId, lessonId);
  return lesson;
}
async function recalculateProgressInternal(db: SupabaseClient, courseId: string, userId: string, lastOpenedLessonId?: string | null): Promise<Rec> {
  await getOwnedCourse(db, courseId, userId);
  const lessonIds = await courseLessonIds(db, courseId);
  const total = lessonIds.length;
  const { data: completions, error: cErr } = lessonIds.length ? await db.from("lesson_completions").select("lesson_id, completed_at").eq("user_id", userId).in("lesson_id", lessonIds) : { data: [], error: null };
  if (cErr) throw new AppError("DATABASE_ERROR", "Не удалось загрузить завершённые уроки", 500, { error: cErr.message });
  const completedSet = new Set((completions ?? []).map((c) => clean(asRecord(c)?.lesson_id)).filter(Boolean));
  const completed = completedSet.size;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const nextRecommended = lessonIds.find((id) => !completedSet.has(id)) ?? null;
  const lastCompleted = (completions ?? []).sort((a, b) => clean(asRecord(b)?.completed_at).localeCompare(clean(asRecord(a)?.completed_at)))[0];
  const lastOpened = lastOpenedLessonId || clean(asRecord(lastCompleted)?.lesson_id) || lessonIds[0] || null;
  const payload = { user_id: userId, course_id: courseId, completed_lessons_count: completed, total_lessons_count: total, completion_percent: percent, last_opened_lesson_id: lastOpened, next_recommended_lesson_id: nextRecommended, updated_at: new Date().toISOString() };
  const { data: existing } = await db.from("progress").select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  const existingId = clean(asRecord(existing)?.id);
  const result = existingId ? await db.from("progress").update(payload).eq("id", existingId).select("*").maybeSingle() : await db.from("progress").insert(payload).select("*").maybeSingle();
  if (result.error) throw new AppError("DATABASE_ERROR", "Не удалось сохранить прогресс", 500, { error: result.error.message });
  const progress = asRecord(result.data) ?? payload;
  await audit(db, { userId, courseId, action: "progress_recalculated", entityType: "progress", entityId: clean(progress.id) || undefined, metadata: { completion_percent: percent, completed_lessons_count: completed, total_lessons_count: total, next_recommended_lesson_id: nextRecommended } });
  return progress;
}
async function recalculateProgress(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const body = await readJsonBody(req);
  const courseId = clean(body.course_id ?? body.courseId);
  const lastOpenedLessonId = clean(body.last_opened_lesson_id ?? body.lastOpenedLessonId) || null;
  if (!courseId) throw new AppError("INVALID_INPUT", "Нужно передать course_id", 400);
  const progress = await recalculateProgressInternal(db, courseId, userId, lastOpenedLessonId);
  return jsonResponse({ progress });
}
async function completeLesson(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const body = await readJsonBody(req);
  const courseId = clean(body.course_id ?? body.courseId);
  const lessonId = clean(body.lesson_id ?? body.lessonId);
  if (!courseId || !lessonId) throw new AppError("INVALID_INPUT", "Нужно передать course_id и lesson_id", 400);
  await verifyLessonAccess(db, courseId, lessonId, userId);
  const { data: existing, error: selectError } = await db.from("lesson_completions").select("*").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
  if (selectError) throw new AppError("DATABASE_ERROR", "Не удалось проверить завершение урока", 500, { error: selectError.message });
  let completion = asRecord(existing);
  if (!completion) {
    const { data, error } = await db.from("lesson_completions").insert({ user_id: userId, lesson_id: lessonId }).select("*").maybeSingle();
    if (error) throw new AppError("DATABASE_ERROR", "Не удалось отметить урок завершённым", 500, { error: error.message });
    completion = asRecord(data);
  }
  const progress = await recalculateProgressInternal(db, courseId, userId, lessonId);
  await audit(db, { userId, courseId, action: "lesson_completed", entityType: "lesson", entityId: lessonId, metadata: { lesson_id: lessonId, completion_id: clean(completion?.id), completion_percent: progress.completion_percent } });
  return jsonResponse({ completion, progress });
}
async function submitAssignment(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  const body = await readJsonBody(req);
  const courseId = clean(body.course_id ?? body.courseId);
  const lessonId = clean(body.lesson_id ?? body.lessonId);
  const submissionText = clean(body.submission_text ?? body.submissionText);
  if (!courseId || !lessonId) throw new AppError("INVALID_INPUT", "Нужно передать course_id и lesson_id", 400);
  if (!submissionText) throw new AppError("INVALID_INPUT", "Текст задания не может быть пустым", 400);
  await verifyLessonAccess(db, courseId, lessonId, userId);
  const { data: existingRows } = await db.from("assignment_submissions").select("id").eq("user_id", userId).eq("lesson_id", lessonId).order("created_at", { ascending: false }).limit(1);
  const existingId = clean(asRecord((existingRows ?? [])[0])?.id);
  const payload = { user_id: userId, lesson_id: lessonId, submission_text: submissionText, status: "submitted", updated_at: new Date().toISOString() };
  const result = existingId ? await db.from("assignment_submissions").update(payload).eq("id", existingId).select("*").maybeSingle() : await db.from("assignment_submissions").insert(payload).select("*").maybeSingle();
  if (result.error) throw new AppError("DATABASE_ERROR", "Не удалось сохранить практическое задание", 500, { error: result.error.message });
  let progress: Rec | null = null;
  let progress_warning: string | null = null;
  try { progress = await recalculateProgressInternal(db, courseId, userId, lessonId); } catch (error) { progress_warning = error instanceof Error ? error.message : String(error); console.warn("progress recalc after assignment failed", error); }
  await audit(db, { userId, courseId, action: "assignment_submitted", entityType: "lesson", entityId: lessonId, metadata: { lesson_id: lessonId, submission_id: clean(asRecord(result.data)?.id), progress_warning } });
  return jsonResponse({ submission: result.data, progress, progress_warning });
}

export function serveLearnerAction(action: Action): void {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (req.method !== "POST") return jsonResponse({ error: { code: "INVALID_INPUT", message: "Метод не поддерживается", details: {} } }, 405);
    try {
      const db = serviceClient();
      const userId = await getUserId(req);
      if (action === "generate-lesson-quiz") return await generateLessonQuiz(req, db, userId);
      if (action === "generate-course-quiz") return await generateCourseQuiz(req, db, userId);
      if (action === "submit-quiz-attempt") return await submitQuizAttempt(req, db, userId);
      if (action === "submit-assignment") return await submitAssignment(req, db, userId);
      if (action === "complete-lesson") return await completeLesson(req, db, userId);
      return await recalculateProgress(req, db, userId);
    } catch (error) {
      return errorResponse(error);
    }
  });
}
