/**
 * Версии курса: снимки, первая версия, список для UI.
 */
import { supabase } from "@/lib/supabase/client";
import type { CourseContentMetrics } from "@/entities/course/courseStatus";
import { normalizeCourseStatus } from "@/entities/course/courseStatus";
import type { VersionChangeTypeUi, VersionListItem } from "@/entities/course/readModels";
import {
  FIRST_VERSION_DESCRIPTIONS,
  resolveFirstVersionChangeKind,
  type FirstVersionChangeKind,
} from "@/entities/course/versioning";
import { formatRuDateTime } from "@/lib/dateFormat";
import { asRecord, num, str } from "@/services/dbRowUtils";
import { toUserErrorMessage } from "@/lib/errorMessages";
import { getCourseAccessStatus, getVersionAccessStatus } from "@/services/accessControl.service";

export type VersionRowView = VersionListItem;
export type VersionChangeType = VersionChangeTypeUi;

export interface CourseSnapshotV1 {
  schema_version: 1;
  captured_at: string;
  course: Record<string, unknown> | null;
  modules: unknown[];
  lessons: unknown[];
  lesson_contents: unknown[];
  quizzes: unknown[];
  questions: unknown[];
  answer_options: unknown[];
  sources: unknown[];
}

async function countCourseVersions(courseId: string): Promise<number> {
  const { count, error } = await supabase
    .from("course_versions")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);
  if (error) return -1;
  return count ?? 0;
}

export async function buildCourseSnapshotJson(courseId: string): Promise<CourseSnapshotV1> {
  const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();

  const { data: modRows } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const modules = modRows ?? [];
  const moduleIds = modules.map((m) => str(asRecord(m)?.id)).filter(Boolean) as string[];

  const { data: lesRows } = moduleIds.length > 0
    ? await supabase.from("lessons").select("*").in("module_id", moduleIds).order("position", { ascending: true })
    : { data: [] as unknown[] };

  const lessonsRaw = lesRows ?? [];
  const moduleOrder = new Map(moduleIds.map((id, i) => [id, i]));
  const lessons = [...lessonsRaw].sort((a, b) => {
    const ar = asRecord(a);
    const br = asRecord(b);
    const ma = str(ar?.module_id);
    const mb = str(br?.module_id);
    const oa = (ma != null ? moduleOrder.get(ma) : undefined) ?? 0;
    const ob = (mb != null ? moduleOrder.get(mb) : undefined) ?? 0;
    if (oa !== ob) return oa - ob;
    return (num(ar?.position) ?? 0) - (num(br?.position) ?? 0);
  });
  const lessonIds = lessons.map((l) => str(asRecord(l)?.id)).filter(Boolean) as string[];

  const { data: lessonContents } = lessonIds.length > 0
    ? await supabase.from("lesson_contents").select("*").in("lesson_id", lessonIds)
    : { data: [] as unknown[] };

  const { data: courseQuizzes } = await supabase.from("quizzes").select("*").eq("course_id", courseId);
  const { data: lessonQuizzes } = lessonIds.length > 0
    ? await supabase.from("quizzes").select("*").in("lesson_id", lessonIds)
    : { data: [] as unknown[] };
  const quizzes = [...(courseQuizzes ?? []), ...(lessonQuizzes ?? [])];
  const quizIds = quizzes.map((q) => str(asRecord(q)?.id)).filter(Boolean) as string[];

  const { data: questions } = quizIds.length > 0
    ? await supabase.from("questions").select("*").in("quiz_id", quizIds).order("position", { ascending: true })
    : { data: [] as unknown[] };
  const questionIds = (questions ?? []).map((q) => str(asRecord(q)?.id)).filter(Boolean) as string[];

  const { data: answerOptions } = questionIds.length > 0
    ? await supabase.from("answer_options").select("*").in("question_id", questionIds).order("position", { ascending: true })
    : { data: [] as unknown[] };

  const { data: sources } = await supabase.from("sources").select("*").eq("course_id", courseId);

  return {
    schema_version: 1,
    captured_at: new Date().toISOString(),
    course: course ? (asRecord(course) as Record<string, unknown>) : null,
    modules,
    lessons,
    lesson_contents: lessonContents ?? [],
    quizzes,
    questions: questions ?? [],
    answer_options: answerOptions ?? [],
    sources: sources ?? [],
  };
}

export async function ensureFirstCourseVersionIfNeeded(
  courseId: string,
  authorId: string,
  metrics: CourseContentMetrics
): Promise<{ error: Error | null }> {
  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("author_id, status, current_version_id")
    .eq("id", courseId)
    .maybeSingle();
  if (cErr) return { error: cErr };
  const crow = asRecord(course);
  if (!crow) return { error: new Error("not_found") };
  if (str(crow.author_id) !== authorId) return { error: new Error("forbidden") };
  if (normalizeCourseStatus(crow.status) === "archived") return { error: null };
  if (str(crow.current_version_id)) return { error: null };

  const existing = await countCourseVersions(courseId);
  if (existing < 0) return { error: new Error("course_versions_count_failed") };
  if (existing > 0) return { error: null };

  const kind = resolveFirstVersionChangeKind(metrics);
  if (kind == null) return { error: null };
  return insertFirstCourseVersion(courseId, authorId, kind);
}

async function insertFirstCourseVersion(courseId: string, authorId: string, kind: FirstVersionChangeKind): Promise<{ error: Error | null }> {
  const nAgain = await countCourseVersions(courseId);
  if (nAgain !== 0) return { error: null };

  const snapshot = await buildCourseSnapshotJson(courseId);
  const description = FIRST_VERSION_DESCRIPTIONS[kind];
  const row = {
    course_id: courseId,
    version_number: 1,
    snapshot_data: snapshot,
    change_type: kind,
    change_description: description,
    qa_score: null,
    created_by: authorId,
  };

  const { data: inserted, error: insErr } = await supabase.from("course_versions").insert(row).select("id").maybeSingle();
  if (insErr) return { error: insErr };

  const newId = inserted ? str(asRecord(inserted)?.id) : null;
  if (!newId) return { error: new Error("course_version_insert_no_id") };

  const { error: upErr } = await supabase
    .from("courses")
    .update({ current_version_id: newId })
    .eq("id", courseId)
    .eq("author_id", authorId);

  return { error: upErr ?? null };
}


export async function createCourseVersionSnapshot(
  courseId: string,
  authorId: string,
  changeType: string,
  changeDescription: string
): Promise<{ versionId: string | null; error: Error | null }> {
  const access = await getCourseAccessStatus(courseId);
  if (access.status !== "ok") return { versionId: null, error: new Error(access.status === "error" ? access.error ?? "error" : access.status) };

  const { data: lastRows, error: lastErr } = await supabase
    .from("course_versions")
    .select("version_number")
    .eq("course_id", courseId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (lastErr) return { versionId: null, error: lastErr };

  const last = asRecord((lastRows ?? [])[0]);
  const versionNumber = (num(last?.version_number) ?? 0) + 1;
  const snapshot = await buildCourseSnapshotJson(courseId);

  const { data: inserted, error: insErr } = await supabase
    .from("course_versions")
    .insert({
      course_id: courseId,
      version_number: versionNumber,
      change_type: changeType,
      change_description: changeDescription,
      qa_score: null,
      created_by: authorId,
      snapshot_data: snapshot,
    })
    .select("id")
    .maybeSingle();

  if (insErr) return { versionId: null, error: insErr };
  const versionId = str(asRecord(inserted)?.id);
  if (!versionId) return { versionId: null, error: new Error("course_version_insert_no_id") };

  const { error: upErr } = await supabase
    .from("courses")
    .update({ current_version_id: versionId })
    .eq("id", courseId)
    .eq("author_id", authorId);

  return { versionId, error: upErr ?? null };
}


export const COURSE_VERSION_CHANGE_LABELS: Record<string, string> = {
  plan_generated: "Сгенерирован план",
  initial_generation_plan: "Сгенерирован план",
  lesson_content_generated: "Сгенерирован урок",
  initial_generation_content: "Сгенерирован контент курса",
  course_content_generated: "Сгенерирован весь курс",
  lesson_block_regenerated: "Перегенерирован блок урока",
  manual_edit: "Ручное редактирование",
  lesson_quiz_generated: "Сгенерирован квиз урока",
  course_quiz_generated: "Сгенерирован итоговый квиз",
  version_restored: "Восстановлена версия",
  before_restore_backup: "Резервная версия перед откатом",
};

export function toCourseVersionChangeLabel(type: string | null | undefined): string {
  const normalized = (type ?? "").trim().toLowerCase();
  if (COURSE_VERSION_CHANGE_LABELS[normalized]) return COURSE_VERSION_CHANGE_LABELS[normalized];
  if (normalized.includes("restore") || normalized.includes("rollback")) return "Восстановлена версия";
  if (normalized.includes("quiz")) return "Изменён квиз";
  if (normalized.includes("qa") || normalized.includes("quality")) return "Проверка качества";
  if (normalized.includes("plan") || normalized.includes("structure")) return "Изменена структура";
  if (normalized.includes("lesson") && normalized.includes("content")) return "Сгенерирован урок";
  if (normalized.includes("content")) return "Изменён контент";
  if (normalized.includes("edit") || normalized.includes("update")) return "Ручное редактирование";
  if (normalized.includes("generation") || normalized.includes("generated")) return "Генерация";
  return "Изменение курса";
}

function mapVersionType(raw: string | null): VersionChangeTypeUi {
  const t = (raw ?? "").toLowerCase();
  if (t.includes("restore") || t.includes("rollback")) return "rollback";
  if (t.includes("quiz")) return "quiz";
  if (t.includes("qa")) return "qa";
  if (t.includes("plan") || t.includes("structure")) return "structure";
  if (t.includes("generation") || t.includes("generated")) return "generation";
  if (t.includes("content") || t.includes("lesson")) return "content";
  if (t === "creation") return "creation";
  return "content";
}

export async function fetchCourseVersions(courseId: string): Promise<{
  courseTitle: string | null;
  versions: VersionListItem[];
  error: string | null;
}> {
  const access = await getCourseAccessStatus(courseId);
  if (access.status !== "ok") return { courseTitle: null, versions: [], error: access.status === "error" ? access.error ?? "Не удалось загрузить версии." : access.status };

  const { data: course } = await supabase.from("courses").select("title, current_version_id").eq("id", courseId).maybeSingle();
  const courseRec = asRecord(course);
  const courseTitle = courseRec ? str(courseRec.title) : null;
  const currentVersionId = courseRec ? str(courseRec.current_version_id) : null;

  const { data: rows, error } = await supabase
    .from("course_versions")
    .select("id, created_at, version_number, change_type, change_description, created_by, qa_score")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) return { courseTitle, versions: [], error: toUserErrorMessage(error, "Не удалось загрузить версии. Попробуйте ещё раз.") };

  const versions: VersionListItem[] = [];
  for (const r of rows ?? []) {
    const o = asRecord(r);
    if (!o) continue;
    const authorId = str(o.created_by);
    let author = "—";
    if (authorId) {
      const { data: prof } = await supabase.from("profiles").select("name").eq("id", authorId).maybeSingle();
      const pr = asRecord(prof);
      author = str(pr?.name) ?? authorId.slice(0, 8);
    }
    const created = str(o.created_at);
    const rowId = str(o.id) ?? `v-${num(o.version_number) ?? versions.length + 1}`;
    versions.push({
      id: rowId,
      date: created ? formatRuDateTime(created) : "—",
      type: mapVersionType(str(o.change_type)),
      description: str(o.change_description) ?? toCourseVersionChangeLabel(str(o.change_type)),
      author,
      changes: { added: 0, modified: 0, deleted: 0 },
      qaScore: num(o.qa_score),
      isCurrent: currentVersionId ? rowId === currentVersionId : versions.length === 0,
    });
  }

  return { courseTitle, versions, error: null };
}

export type CourseVersionListItem = {
  id: string;
  course_id: string;
  version_number: number;
  change_type: string;
  change_description: string | null;
  qa_score: number | null;
  created_at: string;
  created_by: string | null;
  is_current?: boolean;
};

export type CourseSnapshotView = {
  schema_version?: number;
  captured_at?: string;
  course?: Record<string, unknown> | null;
  modules?: unknown[];
  lessons?: unknown[];
  lesson_contents?: unknown[];
  quizzes?: unknown[];
  questions?: unknown[];
  answer_options?: unknown[];
  sources?: unknown[];
};

export type CourseVersionSnapshotStatus = {
  restorable: boolean;
  reason: string | null;
};

export function normalizeCourseVersionSnapshot(value: unknown): CourseSnapshotView {
  const root = asRecord(value);
  const wrapped = asRecord(root?.snapshot_data) ?? asRecord(root?.snapshot) ?? asRecord(root?.data) ?? root ?? {};
  const lessonContents = Array.isArray(wrapped.lesson_contents)
    ? wrapped.lesson_contents
    : Array.isArray(wrapped.lessonContents)
      ? wrapped.lessonContents
      : [];
  const answerOptions = Array.isArray(wrapped.answer_options)
    ? wrapped.answer_options
    : Array.isArray(wrapped.answerOptions)
      ? wrapped.answerOptions
      : [];

  return {
    schema_version: num(wrapped.schema_version ?? wrapped.schemaVersion) ?? undefined,
    captured_at: str(wrapped.captured_at ?? wrapped.capturedAt) ?? undefined,
    course: asRecord(wrapped.course),
    modules: Array.isArray(wrapped.modules) ? wrapped.modules : [],
    lessons: Array.isArray(wrapped.lessons) ? wrapped.lessons : [],
    lesson_contents: lessonContents,
    sources: Array.isArray(wrapped.sources) ? wrapped.sources : [],
    quizzes: Array.isArray(wrapped.quizzes) ? wrapped.quizzes : [],
    questions: Array.isArray(wrapped.questions) ? wrapped.questions : [],
    answer_options: answerOptions,
  };
}

export function getCourseVersionSnapshotStatus(value: unknown): CourseVersionSnapshotStatus {
  const snapshot = normalizeCourseVersionSnapshot(value);
  if (!snapshot.course) {
    return { restorable: false, reason: "В снимке версии нет данных курса." };
  }
  if ((snapshot.modules?.length ?? 0) === 0 || (snapshot.lessons?.length ?? 0) === 0) {
    return {
      restorable: false,
      reason: "В этой версии не сохранена структура курса. Скорее всего, снимок был создан до генерации плана.",
    };
  }
  return { restorable: true, reason: null };
}

export type CourseVersionDetails = CourseVersionListItem & {
  snapshot_data: CourseSnapshotView | null;
};

export type RestoreCourseVersionResult = {
  restored_version?: CourseVersionDetails;
  backup_version?: CourseVersionDetails;
  restore_summary?: {
    mode?: "exact" | "safe";
    protected_lessons?: number;
    protected_quizzes?: number;
    kept_extra_lessons?: number;
    kept_extra_quizzes?: number;
  };
};

async function parseEdgeFunctionError(error: unknown): Promise<Error> {
  const response = (error as { context?: unknown } | null)?.context;
  if (response instanceof Response) {
    try {
      const payload = await response.clone().json();
      const root = asRecord(payload);
      const backendError = asRecord(root?.error);
      const message = str(backendError?.message);
      const code = str(backendError?.code);
      if (message || code) return new Error(toUserErrorMessage({ code, message }, "Не удалось восстановить версию. Попробуйте ещё раз."));
    } catch {
      // fall through
    }
  }

  const errorRecord = asRecord(error);
  const payload = asRecord(errorRecord?.error);
  const code = str(payload?.code);
  const message = str(payload?.message) ?? str(errorRecord?.message);
  if (message || code) {
    return new Error(toUserErrorMessage({ code, message }, "Не удалось восстановить версию. Попробуйте ещё раз."));
  }
  return new Error("Не удалось восстановить версию. Попробуйте ещё раз.");
}

function mapCourseVersionRow(row: unknown, courseId: string, currentVersionId: string | null): CourseVersionListItem {
  const record = asRecord(row) ?? {};
  const id = str(record.id) ?? "";
  return {
    id,
    course_id: str(record.course_id) ?? courseId,
    version_number: num(record.version_number) ?? 0,
    change_type: str(record.change_type) ?? "unknown",
    change_description: str(record.change_description) ?? null,
    qa_score: num(record.qa_score),
    created_at: str(record.created_at) ?? "",
    created_by: str(record.created_by),
    is_current: currentVersionId ? id === currentVersionId : false,
  };
}

export async function getCourseVersions(courseId: string): Promise<CourseVersionListItem[]> {
  const access = await getCourseAccessStatus(courseId);
  if (access.status !== "ok") throw new Error(access.status === "error" ? access.error ?? "Не удалось загрузить версии. Попробуйте ещё раз." : access.status);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("current_version_id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) throw new Error(toUserErrorMessage(courseError, "Не удалось загрузить версии. Попробуйте ещё раз."));

  const { data, error } = await supabase
    .from("course_versions")
    .select("id,course_id,version_number,change_type,change_description,qa_score,created_at,created_by")
    .eq("course_id", courseId)
    .order("version_number", { ascending: false });

  if (error) throw new Error(toUserErrorMessage(error, "Не удалось загрузить версии. Попробуйте ещё раз."));

  const currentVersionId = str(asRecord(course)?.current_version_id);
  return (data ?? []).map((row) => mapCourseVersionRow(row, courseId, currentVersionId ?? null));
}

export async function getCourseVersion(courseId: string, versionId: string): Promise<CourseVersionDetails> {
  const versionAccess = await getVersionAccessStatus(versionId, courseId);
  if (versionAccess.status !== "ok") throw new Error(versionAccess.status === "error" ? versionAccess.error ?? "Не удалось загрузить версию. Попробуйте ещё раз." : versionAccess.status);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("current_version_id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) throw new Error(toUserErrorMessage(courseError, "Не удалось загрузить версии. Попробуйте ещё раз."));

  const { data, error } = await supabase
    .from("course_versions")
    .select("*")
    .eq("course_id", courseId)
    .eq("id", versionId)
    .maybeSingle();

  if (error) throw new Error(toUserErrorMessage(error, "Не удалось загрузить версии. Попробуйте ещё раз."));
  if (!data) throw new Error("Версия не найдена.");

  const currentVersionId = str(asRecord(course)?.current_version_id);
  return {
    ...mapCourseVersionRow(data, courseId, currentVersionId ?? null),
    snapshot_data: normalizeCourseVersionSnapshot(asRecord(data)?.snapshot_data),
  };
}

export async function restoreCourseVersion(courseId: string, versionId: string): Promise<RestoreCourseVersionResult> {
  const versionAccess = await getVersionAccessStatus(versionId, courseId);
  if (versionAccess.status !== "ok") throw new Error(versionAccess.status === "error" ? versionAccess.error ?? "Не удалось проверить доступ к версии." : versionAccess.status);

  let { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();
    sessionData = refreshed.data;
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Войдите в систему.");

  // Важно: не передавать одновременно Authorization и authorization.
  // Fetch объединяет одноимённые заголовки без учёта регистра в строку
  // вида "Bearer <token>, Bearer <token>", из-за чего Supabase Auth
  // считает сессию недействительной и возвращает 401.
  const headers = new Headers();
  headers.set("apikey", __SUPABASE_ANON_KEY__);
  headers.set("authorization", `Bearer ${accessToken}`);
  headers.set("content-type", "application/json");
  headers.set("x-client-info", "course-ai-generator-web");

  const response = await fetch(`${__SUPABASE_URL__.replace(/\/+$/, "")}/functions/v1/restore-course-version`, {
    method: "POST",
    headers,
    body: JSON.stringify({ course_id: courseId, version_id: versionId }),
  });

  const payload = await response.json().catch(() => ({}));
  const payloadRecord = asRecord(payload);
  const backendError = asRecord(payloadRecord?.error) ?? (str(payloadRecord?.code) ? payloadRecord : null);
  if (!response.ok || backendError) {
    throw await parseEdgeFunctionError({ error: backendError ?? { message: response.statusText } });
  }

  return (payload as RestoreCourseVersionResult) ?? {};
}
