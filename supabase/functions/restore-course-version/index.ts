import {
  AppError,
  corsHeaders,
  createAdminClient,
  errorResponse,
  jsonResponse,
  readJson,
  getAuthUser,
  asUuid,
  loadOwnedCourse,
  createCourseVersion,
  writeAuditLog,
} from "../_shared/qa-version-flow.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const supabaseAdmin = createAdminClient();
  let user: any = null;
  let courseId: string | null = null;
  try {
    const body = await readJson(req);
    user = await getAuthUser(req, supabaseAdmin);
    courseId = asUuid(body?.course_id, "course_id");
    const versionId = asUuid(body?.version_id, "version_id");
    await loadOwnedCourse(supabaseAdmin, courseId, user.id);

    await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "restore_course_version_started", entityType: "course_version", entityId: versionId, metadata: { version_id: versionId } });

    const { data: version, error: vError } = await supabaseAdmin.from("course_versions").select("*").eq("id", versionId).eq("course_id", courseId).maybeSingle();
    if (vError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить версию", 500, { message: vError.message });
    if (!version) throw new AppError("VERSION_NOT_FOUND", "Версия не найдена", 404);
    const snapshot = version.snapshot_data;
    if (!snapshot?.course || !Array.isArray(snapshot.modules) || !Array.isArray(snapshot.lessons)) {
      throw new AppError("VERSION_SNAPSHOT_INVALID", "Снимок версии повреждён или неполный", 400);
    }

    await createCourseVersion({ supabaseAdmin, courseId, userId: user.id, changeType: "before_restore_backup", changeDescription: "Автоматическая резервная версия перед откатом", auditMetadata: { restore_target_version_id: versionId } });

    await restoreSnapshotSafely(supabaseAdmin, courseId, snapshot);

    const restored = await createCourseVersion({ supabaseAdmin, courseId, userId: user.id, changeType: "version_restored", changeDescription: `Откат к версии №${version.version_number}`, auditMetadata: { restored_from_version_id: versionId, restored_from_version_number: version.version_number } });

    await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "restore_course_version_completed", entityType: "course_version", entityId: restored.id, metadata: { restored_from_version_id: versionId, restored_version_id: restored.id } });
    return jsonResponse({ restored_version: restored });
  } catch (error) {
    if (courseId && user?.id) await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "restore_course_version_failed", entityType: "course", entityId: courseId, metadata: { error_code: error instanceof AppError ? error.code : "VERSION_RESTORE_FAILED", error_message: error instanceof Error ? error.message : "Unknown error" } });
    return errorResponse(error);
  }
});

async function restoreSnapshotSafely(supabaseAdmin: any, courseId: string, snapshot: any) {
  const learnerActivity = await hasLearnerActivity(supabaseAdmin, courseId);
  const coursePatch = pick(snapshot.course, ["title", "topic", "level", "goal", "duration", "format", "generation_mode", "source_mode", "language", "tone", "status"]);
  const { error: courseError } = await supabaseAdmin.from("courses").update(coursePatch).eq("id", courseId);
  if (courseError) throw new AppError("VERSION_RESTORE_FAILED", "Не удалось восстановить данные курса", 500, { message: courseError.message });

  // Источники не связаны с learner activity, их можно пересоздать.
  await supabaseAdmin.from("sources").delete().eq("course_id", courseId);
  if (Array.isArray(snapshot.sources) && snapshot.sources.length) {
    const sourceRows = snapshot.sources.map((s: any) => ({ ...pick(s, ["id", "course_id", "source_type", "raw_text", "source_url", "file_ref", "only_source_mode"]), course_id: courseId }));
    const { error } = await supabaseAdmin.from("sources").insert(sourceRows);
    if (error) throw new AppError("VERSION_RESTORE_FAILED", "Не удалось восстановить источники", 500, { message: error.message });
  }

  // Без learner activity можно сделать точный destructive restore структуры.
  if (!learnerActivity) {
    await destructiveRestoreStructure(supabaseAdmin, courseId, snapshot);
    return;
  }

  // При наличии прохождений не удаляем уроки/квизы, чтобы не потерять progress/attempts.
  // Восстанавливаем/обновляем сущности из snapshot и оставляем лишние текущие записи нетронутыми.
  for (const m of snapshot.modules ?? []) {
    const row = { ...pick(m, ["id", "course_id", "title", "position", "description", "practice_required", "estimated_duration"]), course_id: courseId };
    await supabaseAdmin.from("modules").upsert(row, { onConflict: "id" });
  }
  for (const l of snapshot.lessons ?? []) {
    const row = pick(l, ["id", "module_id", "title", "position", "objective", "summary", "estimated_duration", "learning_outcome", "content_status"]);
    await supabaseAdmin.from("lessons").upsert(row, { onConflict: "id" });
  }
  for (const lc of snapshot.lesson_contents ?? []) {
    const row = pick(lc, ["id", "lesson_id", "theory_text", "examples_text", "practice_text", "checklist_text"]);
    await supabaseAdmin.from("lesson_contents").upsert(row, { onConflict: "lesson_id" });
  }
}

async function destructiveRestoreStructure(supabaseAdmin: any, courseId: string, snapshot: any) {
  const currentModules = await supabaseAdmin.from("modules").select("id").eq("course_id", courseId);
  const moduleIds = (currentModules.data ?? []).map((m: any) => m.id);
  const currentLessons = moduleIds.length ? await supabaseAdmin.from("lessons").select("id").in("module_id", moduleIds) : { data: [] };
  const lessonIds = (currentLessons.data ?? []).map((l: any) => l.id);
  const currentQuizzes = await supabaseAdmin.from("quizzes").select("id").or(lessonIds.length ? `course_id.eq.${courseId},lesson_id.in.(${lessonIds.join(",")})` : `course_id.eq.${courseId}`);
  const quizIds = (currentQuizzes.data ?? []).map((q: any) => q.id);
  if (quizIds.length) await supabaseAdmin.from("quizzes").delete().in("id", quizIds);
  if (lessonIds.length) await supabaseAdmin.from("lesson_contents").delete().in("lesson_id", lessonIds);
  if (moduleIds.length) await supabaseAdmin.from("modules").delete().eq("course_id", courseId);

  if (snapshot.modules?.length) await supabaseAdmin.from("modules").insert(snapshot.modules.map((m: any) => ({ ...pick(m, ["id", "course_id", "title", "position", "description", "practice_required", "estimated_duration"]), course_id: courseId })));
  if (snapshot.lessons?.length) await supabaseAdmin.from("lessons").insert(snapshot.lessons.map((l: any) => pick(l, ["id", "module_id", "title", "position", "objective", "summary", "estimated_duration", "learning_outcome", "content_status"])));
  if (snapshot.lesson_contents?.length) await supabaseAdmin.from("lesson_contents").insert(snapshot.lesson_contents.map((lc: any) => pick(lc, ["id", "lesson_id", "theory_text", "examples_text", "practice_text", "checklist_text"])));
  if (snapshot.quizzes?.length) await supabaseAdmin.from("quizzes").insert(snapshot.quizzes.map((q: any) => pick(q, ["id", "course_id", "lesson_id", "title", "description"])));
  if (snapshot.questions?.length) await supabaseAdmin.from("questions").insert(snapshot.questions.map((q: any) => pick(q, ["id", "quiz_id", "question_text", "question_type", "explanation", "position"])));
  if (snapshot.answer_options?.length) await supabaseAdmin.from("answer_options").insert(snapshot.answer_options.map((o: any) => pick(o, ["id", "question_id", "answer_text", "is_correct", "position"])));
}

async function hasLearnerActivity(supabaseAdmin: any, courseId: string) {
  const { count: progressCount } = await supabaseAdmin.from("progress").select("*", { count: "exact", head: true }).eq("course_id", courseId);
  if ((progressCount ?? 0) > 0) return true;
  const { data: modules } = await supabaseAdmin.from("modules").select("id").eq("course_id", courseId);
  const moduleIds = (modules ?? []).map((m: any) => m.id);
  const { data: lessons } = moduleIds.length ? await supabaseAdmin.from("lessons").select("id").in("module_id", moduleIds) : { data: [] };
  const lessonIds = (lessons ?? []).map((l: any) => l.id);
  if (!lessonIds.length) return false;
  const { count: completions } = await supabaseAdmin.from("lesson_completions").select("*", { count: "exact", head: true }).in("lesson_id", lessonIds);
  const { count: submissions } = await supabaseAdmin.from("assignment_submissions").select("*", { count: "exact", head: true }).in("lesson_id", lessonIds);
  return (completions ?? 0) > 0 || (submissions ?? 0) > 0;
}

function pick(obj: any, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) if (obj && Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  return out;
}
