import {
  AppError,
  clean,
  corsHeaders,
  createAdminClient,
  errorResponse,
  jsonResponse,
  loadOwnedCourse,
  readJson,
  getAuthUser,
  summarizeSession,
  updateCourseStatus,
  writeAuditLog,
} from "../_shared/generation-session.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const db = createAdminClient();
  try {
    const body = await readJson(req);
    const user = await getAuthUser(req, db);
    const sessionId = clean(body.session_id ?? body.sessionId);
    if (!sessionId) throw new AppError("INVALID_INPUT", "Не найден процесс создания курса", 400);

    const { data: session, error } = await db.from("generation_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить создание курса", 500, { message: error.message });
    if (!session) throw new AppError("SESSION_NOT_FOUND", "Создание курса не найдено", 404);
    const courseId = clean((session as Record<string, unknown>).course_id);
    await loadOwnedCourse(db, courseId, user.id);

    await db.from("generation_steps").update({ status: "cancelled" }).eq("session_id", sessionId).in("status", ["pending", "running"]);
    await db.from("generation_sessions").update({ status: "cancelled", completed_at: new Date().toISOString(), last_error_message: null, current_step: null }).eq("id", sessionId);
    await updateCourseStatus(db, courseId, "partial");
    await writeAuditLog(db, { userId: user.id, courseId, action: "generation_session_cancelled", entityType: "course", entityId: courseId, metadata: { session_id: sessionId } });

    return jsonResponse(await summarizeSession(db, sessionId));
  } catch (error) {
    return errorResponse(error);
  }
});
