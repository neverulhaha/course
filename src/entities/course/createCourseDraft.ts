/**
 * Единственный источник истины для создания черновика курса (п. 6 плана).
 *
 * Цепочка submit в UI:
 *   `CreateCourseFormValues` → `validateCreateCourseFormForSubmit` → `mapCreateCourseFormToDraftInput`
 *   → `CreateCourseDraftInput` → `createCourseDraft(input)` в `courseCreation.service.ts`
 *   → `mapCreateCourseDraftInputToRpcPayload` → `supabase.rpc("create_course_draft", { p_* })`.
 *
 * Контракт `public.create_course_draft(...)` (Supabase RPC): автор через `auth.uid()`, клиент шлёт только `p_*`.
 */
import type { GenerationDepth } from "./types";

export type CreateCourseGenerationMode = "scratch" | "source";

export type CreateCourseSourceType = "text" | "link" | "file";

/** Состояние мастера создания курса (CreateCourse / CreateFromSource — один flow). */
export interface CreateCourseFormValues {
  type: CreateCourseGenerationMode | null;
  topic: string;
  level: string;
  goal: string;
  duration: string;
  format: string;
  generationDepth: GenerationDepth;
  sourceType: CreateCourseSourceType;
  sourceContent: string;
  sourceUrl: string;
  useOnlySource: boolean;
}

export const CREATE_COURSE_FORM_DEFAULT: CreateCourseFormValues = {
  type: null,
  topic: "",
  level: "Начальный",
  goal: "",
  duration: "4–6 нед.",
  generationDepth: "full",
  format: "Смешанный",
  sourceType: "text",
  sourceContent: "",
  sourceUrl: "",
  useOnlySource: true,
};

export const DEFAULT_COURSE_LANGUAGE = "ru";
export const DEFAULT_COURSE_TONE = "neutral";
export const MIN_TEXT_SOURCE_LENGTH = 700;

/**
 * Канонический payload создания курса (после маппинга из формы, до RPC).
 * Соответствует семантике колонок / аргументов функции в БД.
 */
export interface CreateCourseDraftInput {
  title: string;
  topic: string;
  level: string;
  goal: string | null;
  /** Длительность в неделях/условных единицах для RPC `p_duration integer`. */
  duration: number | null;
  format: string | null;
  generation_mode: string | null;
  generation_depth: GenerationDepth;
  source_mode: string | null;
  language: string | null;
  tone: string | null;
  source_type: string | null;
  raw_text: string | null;
  source_url: string | null;
  file_ref: string | null;
  only_source_mode: boolean;
}

/**
 * Тело вызова `supabase.rpc("create_course_draft", payload)` — имена как в Postgres.
 */
export type CreateCourseDraftRpcPayload = {
  p_title: string;
  p_topic: string;
  p_level: string;
  p_goal: string | null;
  p_duration: number | null;
  p_format: string | null;
  p_generation_mode: string | null;
  p_generation_depth: GenerationDepth;
  p_source_mode: string | null;
  p_language: string | null;
  p_tone: string | null;
  p_source_type: string | null;
  p_raw_text: string | null;
  p_source_url: string | null;
  p_file_ref: string | null;
  p_only_source_mode: boolean;
};

function parseDurationToNumber(value: string): number | null {
  const s = value.trim().toLowerCase();
  if (!s) return null;
  const matches = Array.from(s.matchAll(/\d+/g)).map((m) => Number(m[0])).filter(Number.isFinite);
  if (matches.length === 0) return null;
  const max = Math.max(...matches);
  if (s.includes("мес")) return max * 4;
  return max;
}

/** Форма → канонический input (один mapper для scratch и source). */
export function mapCreateCourseFormToDraftInput(form: CreateCourseFormValues): CreateCourseDraftInput {
  const topicTrim = form.topic.trim();
  const title = topicTrim || "Новый курс";
  const goalTrim = form.goal.trim();
  const isSource = form.type === "source";
  const generationMode =
    form.type === null ? null : form.type === "source" ? "source" : "scratch";

  return {
    title,
    topic: topicTrim || title,
    level: form.level,
    goal: goalTrim.length > 0 ? goalTrim : null,
    duration: parseDurationToNumber(form.duration),
    format: form.format.trim() || null,
    generation_mode: generationMode,
    generation_depth: form.generationDepth,
    source_mode: isSource ? form.sourceType : "none",
    language: DEFAULT_COURSE_LANGUAGE,
    tone: DEFAULT_COURSE_TONE,
    source_type: isSource ? form.sourceType : null,
    raw_text: isSource && form.sourceType === "text" ? (form.sourceContent.trim() || null) : null,
    source_url: isSource && form.sourceType === "link" ? (form.sourceUrl.trim() || null) : null,
    file_ref: null,
    only_source_mode: Boolean(isSource && form.useOnlySource),
  };
}

/** Канонический input → аргументы RPC с префиксом `p_`. */
export function mapCreateCourseDraftInputToRpcPayload(input: CreateCourseDraftInput): CreateCourseDraftRpcPayload {
  return {
    p_title: input.title,
    p_topic: input.topic,
    p_level: input.level,
    p_goal: input.goal ?? null,
    p_duration: input.duration ?? null,
    p_format: input.format ?? null,
    p_generation_mode: input.generation_mode ?? null,
    p_generation_depth: input.generation_depth,
    p_source_mode: input.source_mode ?? null,
    p_language: input.language ?? DEFAULT_COURSE_LANGUAGE,
    p_tone: input.tone ?? DEFAULT_COURSE_TONE,
    p_source_type: input.source_type ?? null,
    p_raw_text: input.raw_text ?? null,
    p_source_url: input.source_url ?? null,
    p_file_ref: input.file_ref ?? null,
    p_only_source_mode: input.only_source_mode ?? false,
  };
}

export function validateCreateCourseFormForSubmit(form: CreateCourseFormValues): string | null {
  if (form.type === null) return "Выберите тип создания курса";
  if (form.topic.trim().length <= 2) return "Укажите тему курса (минимум 3 символа)";
  if (form.type === "source") {
    if (form.sourceType !== "text") {
      return "Для MVP поддерживается только текстовый источник. Ссылки и файлы будут добавлены позже.";
    }

    const sourceLength = form.sourceContent.trim().length;
    if (sourceLength === 0) {
      return "Введите текст источника";
    }
    if (sourceLength < MIN_TEXT_SOURCE_LENGTH) {
      return `Текст источника слишком короткий: ${sourceLength} из ${MIN_TEXT_SOURCE_LENGTH} символов. Добавьте больше материала для стабильной генерации.`;
    }
  }
  return null;
}
