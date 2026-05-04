import {
  AppError,
  asRecord,
  clean,
  corsHeaders,
  createAdminClient,
  errorResponse,
  insertStep,
  jsonResponse,
  loadOwnedCourse,
  normalizeDepth,
  readJson,
  getAuthUser,
  summarizeSession,
  updateCourseStatus,
  writeAuditLog,
} from "../_shared/generation-session.ts";

function isSourceCourse(course: Record<string, unknown>): boolean {
  const generationMode = clean(course.generation_mode).toLowerCase();
  const sourceMode = clean(course.source_mode).toLowerCase();
  return generationMode === "source" || (sourceMode.length > 0 && sourceMode !== "none");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const db = createAdminClient();
  let userId = "";
  let courseId = "";
  try {
    const body = await readJson(req);
    const user = await getAuthUser(req, db);
    userId = user.id;
    courseId = clean(body.course_id ?? body.courseId);
    const course = await loadOwnedCourse(db, courseId, userId);
    const depth = normalizeDepth(body.generation_depth ?? body.generationDepth, course.generation_depth);
    const force = Boolean(body.force);

    await db
      .from("generation_sessions")
      .update({ status: "cancelled", completed_at: new Date().toISOString(), last_error_message: "Создание курса перезапущено" })
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .in("status", ["pending", "running"]);

    const { data: session, error } = await db
      .from("generation_sessions")
      .insert({
        course_id: courseId,
        user_id: userId,
        generation_depth: depth,
        generation_mode: clean(course.generation_mode) || "scratch",
        status: "running",
        current_step: isSourceCourse(course) ? "prepare_source" : "generate_plan",
        total_steps: 0,
        completed_steps: 0,
        failed_steps: 0,
        force,
        request_json: {
          generation_depth: depth,
          force,
          generation_mode: clean(course.generation_mode) || "scratch",
          source_mode: clean(course.source_mode) || "none",
        },
      })
      .select("*")
      .single();

    if (error) throw new AppError("DATABASE_ERROR", "Не удалось начать создание курса", 500, { message: error.message });
    const sessionId = clean(asRecord(session)?.id);
    if (!sessionId) throw new AppError("DATABASE_ERROR", "Не удалось начать создание курса", 500);

    let order = 1;
    if (isSourceCourse(course)) {
      await insertStep(db, {
        sessionId,
        courseId,
        stepType: "prepare_source",
        stepOrder: order++,
        entityType: "course",
        entityId: courseId,
        inputJson: { only_source_mode: Boolean(body.only_source_mode ?? course.only_source_mode) },
      });
    }

    await insertStep(db, {
      sessionId,
      courseId,
      stepType: "generate_plan",
      stepOrder: order++,
      entityType: "course",
      entityId: courseId,
      inputJson: { force },
      maxAttempts: 2,
    });

    await db.from("generation_sessions").update({ total_steps: order - 1 }).eq("id", sessionId);
    await updateCourseStatus(db, courseId, "generating_plan");
    await writeAuditLog(db, { userId, courseId, action: "generation_session_started", entityType: "course", entityId: courseId, metadata: { generation_depth: depth, force } });

    return jsonResponse(await summarizeSession(db, sessionId));
  } catch (error) {
    if (courseId && userId) await writeAuditLog(db, { userId, courseId, action: "generation_session_start_failed", metadata: { error_message: error instanceof Error ? error.message : String(error) } });
    return errorResponse(error);
  }
});
