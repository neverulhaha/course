/**
 * Редактор курса автора: бандл редактора, план, заголовок урока, синхронизация статуса и первой версии.
 */
import { supabase } from "@/lib/supabase/client";
import { toUserErrorMessage } from "@/lib/errorMessages";
import {
  inferCourseStatusFromMetrics,
  normalizeCourseStatus,
} from "@/entities/course/courseStatus";
import { parseLessonContentRow } from "@/entities/course/lessonContentJson";
import { mapLessonToSummary } from "@/entities/course/lessonSummary";
import type { LessonContent, LessonSummary } from "@/entities/course/types";
import type { CourseEditorBundle, PlanLessonRow, PlanModuleRow } from "@/entities/course/readModels";
import { formatRuDateTime } from "@/lib/dateFormat";
import { asRecord, num, str } from "@/services/dbRowUtils";
import { fetchCourseContentMetrics } from "@/services/courseQuery.service";
import { createCourseVersionSnapshot, ensureFirstCourseVersionIfNeeded } from "@/services/courseVersion.service";
import { getCourseAccessStatus, getLessonAccessStatus, getModuleAccessStatus } from "@/services/accessControl.service";

export type { CourseEditorBundle };

function durationLabel(value: unknown): string {
  const n = num(value);
  if (n == null) return "—";
  if (n < 60) return `${n} мин.`;
  if (n % 60 === 0) return `${n / 60} ч.`;
  return `${Math.floor(n / 60)} ч. ${n % 60} мин.`;
}


export type EditorActionResult<T = unknown> = {
  data: T | null;
  error: string | null;
  warning?: string | null;
};

type CoursePatch = Partial<{
  title: string;
  topic: string;
  level: string;
  goal: string | null;
  duration: number | null;
  format: string;
  language: string | null;
  tone: string | null;
}>;

type ModulePatch = Partial<{
  title: string;
  description: string | null;
  estimated_duration: number | null;
  practice_required: boolean;
}>;

type LessonPatch = Partial<{
  title: string;
  objective: string | null;
  summary: string | null;
  estimated_duration: number | null;
  learning_outcome: string | null;
}>;

export type LessonContentPatch = Partial<{
  theory_text: string | null;
  examples_text: string | null;
  practice_text: string | null;
  checklist_text: string | null;
}>;

function cleanPatch<T extends object>(patch: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

function userError(message: string): string {
  const low = message.toLowerCase();
  if (low.includes("duplicate key") || low.includes("unique")) return "Не удалось сохранить порядок: конфликт позиций. Попробуйте повторить.";
  return toUserErrorMessage(message, "Не удалось сохранить данные. Попробуйте ещё раз.");
}

function accessError(status: string, fallback = "Не удалось проверить доступ."): string {
  if (status === "unauthorized") return "Войдите в систему.";
  if (status === "forbidden") return "У вас нет доступа к этому разделу.";
  if (status === "not_found") return "Данные не найдены.";
  return fallback;
}

async function verifyCourseOwner(courseId: string, _userId: string): Promise<{ ok: boolean; error: string | null }> {
  const access = await getCourseAccessStatus(courseId);
  if (access.status !== "ok") return { ok: false, error: access.error ?? accessError(access.status, "Не удалось проверить доступ к курсу.") };
  return { ok: true, error: null };
}

async function getCourseIdByModule(moduleId: string): Promise<string | null> {
  const { data } = await supabase.from("modules").select("course_id").eq("id", moduleId).maybeSingle();
  return str(asRecord(data)?.course_id);
}

async function getModuleAndCourseByLesson(lessonId: string): Promise<{ moduleId: string | null; courseId: string | null }> {
  const { data: lesson } = await supabase.from("lessons").select("module_id").eq("id", lessonId).maybeSingle();
  const moduleId = str(asRecord(lesson)?.module_id);
  if (!moduleId) return { moduleId: null, courseId: null };
  return { moduleId, courseId: await getCourseIdByModule(moduleId) };
}

async function writeAuditLog(
  courseId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: userId,
    course_id: courseId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    payload,
  });
  if (error) console.warn("[audit_logs] failed", error.message);
}

async function finalizeEditorMutation(
  courseId: string,
  userId: string,
  changeType: string,
  changeDescription: string,
  auditAction: string,
  entityType: string,
  entityId: string | null,
  payload: Record<string, unknown>
): Promise<{ warning: string | null }> {
  await writeAuditLog(courseId, userId, auditAction, entityType, entityId, {
    ...payload,
    change_type: changeType,
  });

  const { versionId, error } = await createCourseVersionSnapshot(courseId, userId, changeType, changeDescription);
  if (error) {
    console.warn("[course_versions] failed", error.message);
    return { warning: "Изменения сохранены, но версию создать не удалось." };
  }

  await writeAuditLog(courseId, userId, "course_version_created", "course", courseId, {
    ...payload,
    change_type: changeType,
    version_id: versionId,
  });

  return { warning: null };
}

function textLen(value: unknown): number {
  return typeof value === "string" ? value.trim().length : 0;
}

async function recalculateCourseStatusAfterManualContent(courseId: string, userId: string): Promise<void> {
  const metrics = await fetchCourseContentMetrics(courseId);
  const inferred = inferCourseStatusFromMetrics(metrics);
  const { data: course } = await supabase.from("courses").select("status").eq("id", courseId).maybeSingle();
  const current = normalizeCourseStatus(asRecord(course)?.status);
  if (current !== "archived" && current !== inferred) {
    const { error } = await supabase.from("courses").update({ status: inferred }).eq("id", courseId).eq("author_id", userId);
    if (error) console.warn("[courses.status] failed", error.message);
  }
}


export async function syncCourseStatusFromContent(courseId: string, authorId: string): Promise<{ error: Error | null }> {
  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("author_id, status")
    .eq("id", courseId)
    .maybeSingle();
  if (cErr) return { error: cErr };
  const crow = asRecord(course);
  if (!crow) return { error: new Error("not_found") };
  if (str(crow.author_id) !== authorId) return { error: new Error("forbidden") };
  const current = normalizeCourseStatus(crow.status);
  if (current === "archived") return { error: null };

  const metrics = await fetchCourseContentMetrics(courseId);
  const inferred = inferCourseStatusFromMetrics(metrics);
  if (inferred !== current) {
    const { error } = await supabase.from("courses").update({ status: inferred }).eq("id", courseId).eq("author_id", authorId);
    if (error) return { error };
  }

  const { error: vErr } = await ensureFirstCourseVersionIfNeeded(courseId, authorId, metrics);
  return { error: vErr ?? null };
}

export async function archiveCourse(courseId: string, authorId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("courses").update({ status: "archived" }).eq("id", courseId).eq("author_id", authorId);
  return { error: error ?? null };
}

export async function fetchCourseEditorBundle(
  courseId: string,
  userId: string
): Promise<{ bundle: CourseEditorBundle | null; error: string | null }> {
  const access = await getCourseAccessStatus(courseId);
  if (access.status !== "ok") return { bundle: null, error: access.status === "error" ? access.error ?? "error" : access.status };

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, author_id, title, topic, level, goal, duration, format, language, tone, updated_at, current_version_id, generation_mode, source_mode")
    .eq("id", courseId)
    .maybeSingle();

  if (cErr) return { bundle: null, error: cErr.message };
  const crow = asRecord(course);
  if (!crow) return { bundle: null, error: "not_found" };
  if (str(crow.author_id) !== userId) return { bundle: null, error: "forbidden" };

  const { data: modRows, error: mErr } = await supabase
    .from("modules")
    .select("id, title, description, position, practice_required, estimated_duration")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (mErr) return { bundle: null, error: mErr.message };

  const moduleIds = (modRows ?? []).map((m) => str(asRecord(m)?.id)).filter(Boolean) as string[];
  const { data: lesRows } = moduleIds.length > 0
    ? await supabase
        .from("lessons")
        .select("id, title, module_id, objective, summary, estimated_duration, learning_outcome, content_status, position")
        .in("module_id", moduleIds)
        .order("position", { ascending: true })
    : { data: [] as unknown[] };

  const lessonIds = (lesRows ?? []).map((l) => str(asRecord(l)?.id)).filter(Boolean) as string[];
  const { data: lcRows } = lessonIds.length > 0
    ? await supabase
        .from("lesson_contents")
        .select("id, lesson_id, theory_text, examples_text, practice_text, checklist_text")
        .in("lesson_id", lessonIds)
    : { data: [] as unknown[] };

  const contentByLessonId = new Map<string, LessonContent>();
  for (const row of lcRows ?? []) {
    const rr = asRecord(row);
    const lid = str(rr?.lesson_id);
    if (lid) contentByLessonId.set(lid, parseLessonContentRow(rr));
  }

  const { data: sourceRows } = await supabase
    .from("sources")
    .select("id, source_type, raw_text, source_url, file_ref, only_source_mode, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  const sources = (sourceRows ?? []).map((row) => {
    const sr = asRecord(row);
    const sourceType = str(sr?.source_type) ?? "text";
    const fileRef = str(sr?.file_ref);
    const sourceUrl = str(sr?.source_url);
    const rawText = str(sr?.raw_text);
    const rawLen = rawText?.trim().length ?? 0;
    const warnings = rawLen > 0 && rawLen < 700 ? ["Источник короче рекомендуемых 700 символов. Генерация может быть нестабильной."] : [];
    const label =
      sourceType === "url"
        ? sourceUrl || "Ссылка без адреса"
        : sourceType === "file"
          ? fileRef || "Файл источника"
          : "Текстовый источник";
    const description =
      sourceType === "text"
        ? rawLen > 0
          ? String(rawLen) + " символов"
          : "пустой текст"
        : sourceType === "url"
          ? "ссылка"
          : "файл";

    return {
      id: str(sr?.id) ?? sourceType + "-" + label,
      sourceType,
      label,
      description,
      onlySourceMode: Boolean(sr?.only_source_mode),
      rawTextLength: rawLen,
      isTooShort: rawLen > 0 && rawLen < 700,
      warnings,
    };
  });

  const lessonsByModule = new Map<string, LessonSummary[]>();
  for (const row of lesRows ?? []) {
    const lr = asRecord(row);
    const lid = str(lr?.id);
    const mid = str(lr?.module_id);
    if (!lid || !mid) continue;
    const content = contentByLessonId.get(lid) ?? parseLessonContentRow(null, str(lr?.objective));
    contentByLessonId.set(lid, content);
    const summary = mapLessonToSummary(lid, str(lr?.title), content, {
      moduleId: mid,
      position: num(lr?.position),
      objective: str(lr?.objective),
      summary: str(lr?.summary),
      estimatedDuration: num(lr?.estimated_duration),
      learningOutcome: str(lr?.learning_outcome),
      contentStatus: str(lr?.content_status),
    });
    const arr = lessonsByModule.get(mid) ?? [];
    arr.push(summary);
    lessonsByModule.set(mid, arr);
  }

  const modulesOut: CourseEditorBundle["modules"] = [];
  for (const m of modRows ?? []) {
    const mr = asRecord(m);
    const moduleId = str(mr?.id);
    if (!moduleId) continue;
    const lessons = lessonsByModule.get(moduleId) ?? [];
    const total = lessons.length;
    const readyish = lessons.filter((x) => x.status !== "empty").length;
    modulesOut.push({
      id: moduleId,
      title: str(mr?.title) ?? "Модуль",
      progressPercent: total === 0 ? 0 : Math.round((readyish / total) * 100),
      lessons,
      position: num(mr?.position),
      description: str(mr?.description),
      estimatedDuration: num(mr?.estimated_duration),
      practiceRequired: Boolean(mr?.practice_required),
    });
  }

  const { data: qaRows } = await supabase
    .from("qa_reports")
    .select("total_score, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestQa = asRecord((qaRows ?? [])[0]);

  let version: string | null = null;
  const currentVersionId = str(crow.current_version_id);
  if (currentVersionId) {
    const { data: v } = await supabase
      .from("course_versions")
      .select("version_number, created_at")
      .eq("id", currentVersionId)
      .maybeSingle();
    const vr = asRecord(v);
    version = vr ? `v${num(vr.version_number) ?? "?"}` : null;
  }

  return {
    bundle: {
      meta: {
        title: str(crow.title) ?? "Курс",
        topic: str(crow.topic),
        level: str(crow.level),
        goal: str(crow.goal),
        duration: num(crow.duration),
        format: str(crow.format),
        language: str(crow.language),
        tone: str(crow.tone),
        lastSaved: formatRuDateTime(str(crow.updated_at)),
        qaScore: num(latestQa?.total_score),
        version,
        generationMode: str(crow.generation_mode),
        sourceMode: str(crow.source_mode),
        isSourceCourse: (str(crow.generation_mode) ?? "").toLowerCase() === "source" || ((str(crow.source_mode) ?? "").length > 0 && (str(crow.source_mode) ?? "").toLowerCase() !== "none"),
        onlySourceMode: sources.some((source) => source.onlySourceMode),
      },
      modules: modulesOut,
      lessonContentByLessonId: contentByLessonId,
      sources,
    },
    error: null,
  };
}


export async function updateCourse(
  courseId: string,
  userId: string,
  patch: CoursePatch
): Promise<EditorActionResult> {
  const owner = await verifyCourseOwner(courseId, userId);
  if (!owner.ok) return { data: null, error: owner.error };

  const clean = cleanPatch(patch);
  if (Object.keys(clean).length === 0) return { data: null, error: "Нет изменений для сохранения." };

  const { data, error } = await supabase
    .from("courses")
    .update(clean)
    .eq("id", courseId)
    .eq("author_id", userId)
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: userError(error.message) };

  const { warning } = await finalizeEditorMutation(
    courseId,
    userId,
    "course_metadata_edited",
    "Отредактированы параметры курса",
    "course_updated",
    "course",
    courseId,
    { changed_fields: Object.keys(clean) }
  );

  return { data, error: null, warning };
}

export async function updateModule(
  moduleId: string,
  userId: string,
  patch: ModulePatch
): Promise<EditorActionResult> {
  const moduleAccess = await getModuleAccessStatus(moduleId);
  if (moduleAccess.status !== "ok") return { data: null, error: moduleAccess.error ?? accessError(moduleAccess.status, "Не удалось проверить доступ к модулю.") };
  const courseId = await getCourseIdByModule(moduleId);
  if (!courseId) return { data: null, error: "Модуль не найден." };

  const clean = cleanPatch(patch);
  if (Object.keys(clean).length === 0) return { data: null, error: "Нет изменений для сохранения." };

  const { data, error } = await supabase
    .from("modules")
    .update(clean)
    .eq("id", moduleId)
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: userError(error.message) };

  const { warning } = await finalizeEditorMutation(
    courseId,
    userId,
    "module_edited",
    "Отредактирован модуль",
    "module_updated",
    "module",
    moduleId,
    { module_id: moduleId, changed_fields: Object.keys(clean) }
  );

  return { data, error: null, warning };
}

export async function updateLesson(
  lessonId: string,
  userId: string,
  patch: LessonPatch
): Promise<EditorActionResult> {
  const lessonAccess = await getLessonAccessStatus(lessonId);
  if (lessonAccess.status !== "ok") return { data: null, error: lessonAccess.error ?? accessError(lessonAccess.status, "Не удалось проверить доступ к уроку.") };
  const rel = await getModuleAndCourseByLesson(lessonId);
  if (!rel.courseId) return { data: null, error: "Урок не найден." };

  const clean = cleanPatch(patch);
  if (Object.keys(clean).length === 0) return { data: null, error: "Нет изменений для сохранения." };

  const { data, error } = await supabase
    .from("lessons")
    .update(clean)
    .eq("id", lessonId)
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: userError(error.message) };

  const { warning } = await finalizeEditorMutation(
    rel.courseId,
    userId,
    "lesson_edited",
    "Отредактирован урок",
    "lesson_updated",
    "lesson",
    lessonId,
    { lesson_id: lessonId, module_id: rel.moduleId, changed_fields: Object.keys(clean) }
  );

  return { data, error: null, warning };
}

export async function updateLessonContent(
  lessonId: string,
  userId: string,
  patch: LessonContentPatch
): Promise<EditorActionResult> {
  const lessonAccess = await getLessonAccessStatus(lessonId);
  if (lessonAccess.status !== "ok") return { data: null, error: lessonAccess.error ?? accessError(lessonAccess.status, "Не удалось проверить доступ к материалам урока.") };
  const rel = await getModuleAndCourseByLesson(lessonId);
  if (!rel.courseId) return { data: null, error: "Урок не найден." };

  const clean = cleanPatch(patch);
  const hasAnyContent = Object.values(clean).some((v) => textLen(v) > 0);
  if (Object.keys(clean).length === 0) return { data: null, error: "Нет изменений для сохранения." };
  if (!hasAnyContent) return { data: null, error: "Нельзя сохранить полностью пустое содержимое урока." };

  const { data: existing, error: readErr } = await supabase
    .from("lesson_contents")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (readErr) return { data: null, error: userError(readErr.message) };

  const existingId = str(asRecord(existing)?.id);
  const now = new Date().toISOString();
  const contentPayload = { ...clean, updated_at: now };

  const result = existingId
    ? await supabase
        .from("lesson_contents")
        .update(contentPayload)
        .eq("id", existingId)
        .select("*")
        .maybeSingle()
    : await supabase
        .from("lesson_contents")
        .insert({ lesson_id: lessonId, ...contentPayload })
        .select("*")
        .maybeSingle();

  if (result.error) return { data: null, error: userError(result.error.message) };

  const { error: lessonErr } = await supabase
    .from("lessons")
    .update({ content_status: "edited" })
    .eq("id", lessonId);

  if (lessonErr) {
    const { error: fallbackErr } = await supabase
      .from("lessons")
      .update({ content_status: "generated" })
      .eq("id", lessonId);
    if (fallbackErr) console.warn("[lessons.content_status] failed", fallbackErr.message);
  }

  await recalculateCourseStatusAfterManualContent(rel.courseId, userId);

  const { warning } = await finalizeEditorMutation(
    rel.courseId,
    userId,
    "lesson_content_edited",
    "Отредактировано содержимое урока",
    "lesson_content_updated",
    "lesson",
    lessonId,
    { lesson_id: lessonId, changed_fields: Object.keys(clean) }
  );

  return { data: result.data, error: null, warning };
}

export async function createModule(
  courseId: string,
  userId: string,
  data: { title?: string; description?: string | null; estimated_duration?: number | null; practice_required?: boolean } = {}
): Promise<EditorActionResult> {
  const owner = await verifyCourseOwner(courseId, userId);
  if (!owner.ok) return { data: null, error: owner.error };

  const { data: rows } = await supabase
    .from("modules")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (num(asRecord((rows ?? [])[0])?.position) ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("modules")
    .insert({
      course_id: courseId,
      title: data.title?.trim() || "Новый модуль",
      description: data.description ?? "",
      estimated_duration: data.estimated_duration ?? null,
      practice_required: data.practice_required ?? false,
      position: nextPosition,
    })
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: userError(error.message) };

  const moduleId = str(asRecord(inserted)?.id);
  const { warning } = await finalizeEditorMutation(
    courseId,
    userId,
    "module_created",
    "Добавлен новый модуль",
    "module_created",
    "module",
    moduleId,
    { module_id: moduleId, position: nextPosition }
  );

  return { data: inserted, error: null, warning };
}

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const e = error as { message?: string; context?: Response } | null;

  if (e?.context instanceof Response) {
    try {
      const payload = await e.context.clone().json();
      const backendError = asRecord(asRecord(payload)?.error);
      const message = backendError?.message;
      const code = backendError?.code;
      if ((typeof message === "string" && message.trim()) || typeof code === "string") {
        return toUserErrorMessage({ error: { code, message } }, "Не удалось создать урок. Попробуйте ещё раз.");
      }
    } catch {
      // keep fallback below
    }
  }

  if (typeof e?.message === "string" && e.message.trim()) return userError(e.message);
  return "Не удалось создать урок. Попробуйте ещё раз.";
}

export async function createLesson(
  moduleId: string,
  userId: string,
  data: { title?: string; objective?: string | null; summary?: string | null; estimated_duration?: number | null; learning_outcome?: string | null } = {}
): Promise<EditorActionResult<{ id: string }>> {
  const moduleAccess = await getModuleAccessStatus(moduleId);
  if (moduleAccess.status !== "ok") return { data: null, error: moduleAccess.error ?? accessError(moduleAccess.status, "Не удалось проверить доступ к модулю.") };
  const courseId = await getCourseIdByModule(moduleId);
  if (!courseId) return { data: null, error: "Модуль не найден." };

  const { data: rows, error: positionError } = await supabase
    .from("lessons")
    .select("position")
    .eq("module_id", moduleId)
    .order("position", { ascending: false })
    .limit(1);

  if (positionError) return { data: null, error: userError(positionError.message) };

  const nextPosition = (num(asRecord((rows ?? [])[0])?.position) ?? 0) + 1;
  const title = data.title?.trim() || "Новый урок";
  const learningOutcome = data.learning_outcome?.trim() || "Результат обучения будет уточнен.";

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { data: null, error: "Войдите в систему." };

  const { data: functionResult, error } = await supabase.functions.invoke<{ lesson?: { id?: string } } | { error?: unknown }>("create-lesson", {
    body: {
      module_id: moduleId,
      title,
      position: nextPosition,
      estimated_duration: data.estimated_duration ?? 0,
      learning_outcome: learningOutcome,
      owner_id: userId,
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) return { data: null, error: await extractFunctionErrorMessage(error) };

  const backendError = asRecord(asRecord(functionResult)?.error);
  if (backendError) {
    const message = backendError.message;
    const code = backendError.code;
    return { data: null, error: toUserErrorMessage({ error: { code, message } }, "Не удалось создать урок. Попробуйте ещё раз.") };
  }

  const lessonId = str(asRecord(asRecord(functionResult)?.lesson)?.id);
  if (!lessonId) return { data: null, error: "Урок создан, но сервер не вернул его ID." };

  const { warning } = await finalizeEditorMutation(
    courseId,
    userId,
    "lesson_created",
    "Добавлен новый урок",
    "lesson_created",
    "lesson",
    lessonId,
    { module_id: moduleId, lesson_id: lessonId, position: nextPosition }
  );

  return { data: { id: lessonId }, error: null, warning };
}

export async function deleteLesson(lessonId: string, userId: string): Promise<EditorActionResult> {
  const lessonAccess = await getLessonAccessStatus(lessonId);
  if (lessonAccess.status !== "ok") return { data: null, error: lessonAccess.error ?? accessError(lessonAccess.status, "Не удалось проверить доступ к уроку.") };
  const rel = await getModuleAndCourseByLesson(lessonId);
  if (!rel.courseId || !rel.moduleId) return { data: null, error: "Урок не найден." };

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) return { data: null, error: userError(error.message) };

  await normalizeLessonPositions(rel.moduleId);

  const { warning } = await finalizeEditorMutation(
    rel.courseId,
    userId,
    "lesson_deleted",
    "Удалён урок",
    "lesson_deleted",
    "lesson",
    lessonId,
    { module_id: rel.moduleId, lesson_id: lessonId }
  );

  return { data: null, error: null, warning };
}

export async function deleteModule(moduleId: string, userId: string): Promise<EditorActionResult> {
  const moduleAccess = await getModuleAccessStatus(moduleId);
  if (moduleAccess.status !== "ok") return { data: null, error: moduleAccess.error ?? accessError(moduleAccess.status, "Не удалось проверить доступ к модулю.") };
  const courseId = await getCourseIdByModule(moduleId);
  if (!courseId) return { data: null, error: "Модуль не найден." };

  const { error } = await supabase.from("modules").delete().eq("id", moduleId);
  if (error) return { data: null, error: userError(error.message) };

  await normalizeModulePositions(courseId);

  const { warning } = await finalizeEditorMutation(
    courseId,
    userId,
    "module_deleted",
    "Удалён модуль",
    "module_deleted",
    "module",
    moduleId,
    { module_id: moduleId }
  );

  return { data: null, error: null, warning };
}

async function normalizeModulePositions(courseId: string): Promise<void> {
  const { data: rows } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId)
    .order("position", { ascending: true });
  const ids = (rows ?? []).map((row) => str(asRecord(row)?.id)).filter(Boolean) as string[];
  await reorderModules(courseId, "", ids, false);
}

async function normalizeLessonPositions(moduleId: string): Promise<void> {
  const { data: rows } = await supabase
    .from("lessons")
    .select("id")
    .eq("module_id", moduleId)
    .order("position", { ascending: true });
  const ids = (rows ?? []).map((row) => str(asRecord(row)?.id)).filter(Boolean) as string[];
  await reorderLessons(moduleId, "", ids, false);
}

export async function reorderModules(
  courseId: string,
  userId: string,
  orderedModuleIds: string[],
  createVersion = true
): Promise<EditorActionResult> {
  if (userId) {
    const owner = await verifyCourseOwner(courseId, userId);
    if (!owner.ok) return { data: null, error: owner.error };
  }

  for (let i = 0; i < orderedModuleIds.length; i += 1) {
    const { error } = await supabase.from("modules").update({ position: 10000 + i }).eq("id", orderedModuleIds[i]).eq("course_id", courseId);
    if (error) return { data: null, error: userError(error.message) };
  }
  for (let i = 0; i < orderedModuleIds.length; i += 1) {
    const { error } = await supabase.from("modules").update({ position: i + 1 }).eq("id", orderedModuleIds[i]).eq("course_id", courseId);
    if (error) return { data: null, error: userError(error.message) };
  }

  if (!createVersion || !userId) return { data: null, error: null };

  const { warning } = await finalizeEditorMutation(
    courseId,
    userId,
    "structure_reordered",
    "Изменён порядок модулей",
    "modules_reordered",
    "course",
    courseId,
    { ordered_module_ids: orderedModuleIds }
  );
  return { data: null, error: null, warning };
}

export async function reorderLessons(
  moduleId: string,
  userId: string,
  orderedLessonIds: string[],
  createVersion = true
): Promise<EditorActionResult> {
  if (userId) {
    const moduleAccess = await getModuleAccessStatus(moduleId);
    if (moduleAccess.status !== "ok") return { data: null, error: moduleAccess.error ?? accessError(moduleAccess.status, "Не удалось проверить доступ к модулю.") };
  }
  const courseId = await getCourseIdByModule(moduleId);
  if (!courseId) return { data: null, error: "Модуль не найден." };

  for (let i = 0; i < orderedLessonIds.length; i += 1) {
    const { error } = await supabase.from("lessons").update({ position: 10000 + i }).eq("id", orderedLessonIds[i]).eq("module_id", moduleId);
    if (error) return { data: null, error: userError(error.message) };
  }
  for (let i = 0; i < orderedLessonIds.length; i += 1) {
    const { error } = await supabase.from("lessons").update({ position: i + 1 }).eq("id", orderedLessonIds[i]).eq("module_id", moduleId);
    if (error) return { data: null, error: userError(error.message) };
  }

  if (!createVersion || !userId) return { data: null, error: null };

  const { warning } = await finalizeEditorMutation(
    courseId,
    userId,
    "structure_reordered",
    "Изменён порядок уроков",
    "lessons_reordered",
    "module",
    moduleId,
    { module_id: moduleId, ordered_lesson_ids: orderedLessonIds }
  );
  return { data: null, error: null, warning };
}


export async function fetchCoursePlanStructure(
  courseId: string,
  userId: string
): Promise<{ title: string; level: string; duration: string; goal: string; modules: PlanModuleRow[]; error: string | null }> {
  const access = await getCourseAccessStatus(courseId);
  if (access.status !== "ok") return { title: "", level: "—", duration: "—", goal: "—", modules: [], error: access.status === "error" ? access.error ?? "error" : access.status };

  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, title, author_id, level, duration, goal")
    .eq("id", courseId)
    .maybeSingle();
  if (cErr) return { title: "", level: "—", duration: "—", goal: "—", modules: [], error: cErr.message };
  const crow = asRecord(course);
  if (!crow) return { title: "", level: "—", duration: "—", goal: "—", modules: [], error: "not_found" };
  if (str(crow.author_id) !== userId) return { title: "", level: "—", duration: "—", goal: "—", modules: [], error: "forbidden" };

  const { data: modRows } = await supabase
    .from("modules")
    .select("id, title, description, position, practice_required, estimated_duration")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const modules: PlanModuleRow[] = [];
  for (const m of modRows ?? []) {
    const mr = asRecord(m);
    const mid = str(mr?.id);
    if (!mid) continue;
    const { data: lesRows } = await supabase
      .from("lessons")
      .select("id, title, objective, estimated_duration, position")
      .eq("module_id", mid)
      .order("position", { ascending: true });

    const lessons: PlanLessonRow[] = (lesRows ?? []).map((l) => {
      const lr = asRecord(l);
      return {
        id: str(lr?.id) ?? "",
        title: str(lr?.title) ?? "Урок",
        goal: str(lr?.objective) ?? "—",
        duration: durationLabel(lr?.estimated_duration),
      };
    }).filter((l) => l.id);

    modules.push({ id: mid, title: str(mr?.title) ?? "Модуль", lessons });
  }

  return {
    title: str(crow.title) ?? "Курс",
    level: str(crow.level) ?? "—",
    duration: durationLabel(crow.duration),
    goal: str(crow.goal) ?? "—",
    modules,
    error: null,
  };
}

export async function fetchLessonHeader(
  courseId: string,
  lessonId: string,
  userId: string
): Promise<{ lessonTitle: string; goal: string; theoryText: string; error: string | null }> {
  const courseAccess = await getCourseAccessStatus(courseId);
  if (courseAccess.status !== "ok") return { lessonTitle: "", goal: "", theoryText: "", error: courseAccess.status === "error" ? courseAccess.error ?? "error" : courseAccess.status };
  const lessonAccess = await getLessonAccessStatus(lessonId, courseId);
  if (lessonAccess.status !== "ok") return { lessonTitle: "", goal: "", theoryText: "", error: lessonAccess.status === "error" ? lessonAccess.error ?? "error" : lessonAccess.status };

  const { data: les } = await supabase.from("lessons").select("id, title, module_id, objective").eq("id", lessonId).maybeSingle();
  const lr = asRecord(les);
  if (!lr) return { lessonTitle: "", goal: "", theoryText: "", error: "not_found" };
  const mid = str(lr.module_id);
  if (!mid) return { lessonTitle: "", goal: "", theoryText: "", error: "not_found" };
  const { data: mod } = await supabase.from("modules").select("course_id").eq("id", mid).maybeSingle();
  if (str(asRecord(mod)?.course_id) !== courseId) return { lessonTitle: "", goal: "", theoryText: "", error: "forbidden" };

  const { data: course } = await supabase.from("courses").select("author_id").eq("id", courseId).maybeSingle();
  if (str(asRecord(course)?.author_id) !== userId) return { lessonTitle: "", goal: "", theoryText: "", error: "forbidden" };

  const { data: lc } = await supabase
    .from("lesson_contents")
    .select("theory_text, examples_text, practice_text, checklist_text")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  const parsed = parseLessonContentRow(lc, str(lr.objective));
  const theoryText = parsed.blocks.map((b) => b.content).join("\n\n");
  return { lessonTitle: str(lr.title) ?? "Урок", goal: parsed.goal ?? "", theoryText, error: null };
}
