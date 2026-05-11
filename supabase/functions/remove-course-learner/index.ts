import {
  AppError,
  asUuid,
  corsHeaders,
  createAdminClient,
  errorResponse,
  getAuthUser,
  jsonResponse,
  loadOwnedCourse,
  readJson,
  writeAuditLog,
} from "../_shared/qa-version-flow.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseAdmin = createAdminClient();

  try {
    const body = await readJson(req);
    const user = await getAuthUser(req, supabaseAdmin);
    const courseId = asUuid(body?.course_id ?? body?.courseId, "course_id");
    const learnerUserId = asUuid(body?.user_id ?? body?.userId, "user_id");

    await loadOwnedCourse(supabaseAdmin, courseId, user.id);

    if (learnerUserId === user.id) {
      throw new AppError("INVALID_INPUT", "Нельзя удалить владельца курса из обучающихся", 400);
    }

    const { data: enrollment, error } = await supabaseAdmin
      .from("course_enrollments")
      .update({ status: "removed", updated_at: new Date().toISOString() })
      .eq("course_id", courseId)
      .eq("user_id", learnerUserId)
      .eq("role", "learner")
      .select("id, course_id, user_id, role, status, updated_at")
      .maybeSingle();

    if (error) {
      throw new AppError("DATABASE_ERROR", "Не удалось удалить доступ обучающегося", 500, { message: error.message });
    }
    if (!enrollment) {
      throw new AppError("INVALID_INPUT", "Обучающийся не найден в этом курсе", 404);
    }

    await writeAuditLog({
      supabaseAdmin,
      userId: user.id,
      courseId,
      action: "course_learner_removed",
      entityType: "course_enrollment",
      entityId: enrollment.id,
      metadata: { learner_user_id: learnerUserId },
    });

    return jsonResponse({ enrollment });
  } catch (error) {
    return errorResponse(error);
  }
});
