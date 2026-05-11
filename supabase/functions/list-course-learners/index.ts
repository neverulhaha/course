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
} from "../_shared/qa-version-flow.ts";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function profileName(profile: Record<string, unknown> | undefined, email: string) {
  return clean(profile?.full_name) || clean(profile?.display_name) || clean(profile?.name) || email.split("@")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseAdmin = createAdminClient();

  try {
    const body = await readJson(req);
    const user = await getAuthUser(req, supabaseAdmin);
    const courseId = asUuid(body?.course_id ?? body?.courseId, "course_id");
    const course = await loadOwnedCourse(supabaseAdmin, courseId, user.id);

    const { data: enrollments, error } = await supabaseAdmin
      .from("course_enrollments")
      .select("id, course_id, user_id, role, status, invited_by, created_at, updated_at")
      .eq("course_id", courseId)
      .eq("role", "learner")
      .neq("status", "removed")
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError("DATABASE_ERROR", "Не удалось загрузить обучающихся", 500, { message: error.message });
    }

    const userIds = [...new Set((enrollments ?? []).map((row: any) => row.user_id).filter(Boolean))];

    const { data: profiles } = userIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, email, name, full_name, display_name")
          .in("id", userIds)
      : { data: [] as any[] };

    const { data: progresses } = userIds.length
      ? await supabaseAdmin
          .from("progress")
          .select("user_id, course_id, completed_lessons_count, total_lessons_count, completion_percent, updated_at")
          .eq("course_id", courseId)
          .in("user_id", userIds)
      : { data: [] as any[] };

    const profileById = new Map<string, Record<string, unknown>>();
    for (const profile of profiles ?? []) profileById.set(String((profile as any).id), profile as Record<string, unknown>);

    const progressByUser = new Map<string, Record<string, unknown>>();
    for (const progress of progresses ?? []) progressByUser.set(String((progress as any).user_id), progress as Record<string, unknown>);

    const learners = (enrollments ?? []).map((row: any) => {
      const profile = profileById.get(String(row.user_id));
      const email = clean(profile?.email) || "email не указан";
      const progress = progressByUser.get(String(row.user_id));
      return {
        enrollment_id: row.id,
        user_id: row.user_id,
        email,
        name: profileName(profile, email),
        role: row.role,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        progress: progress
          ? {
              completed_lessons_count: Math.max(0, Math.round(num(progress.completed_lessons_count) ?? 0)),
              total_lessons_count: Math.max(0, Math.round(num(progress.total_lessons_count) ?? 0)),
              completion_percent: Math.max(0, Math.min(100, Math.round(num(progress.completion_percent) ?? 0))),
              updated_at: clean(progress.updated_at) || null,
            }
          : null,
      };
    });

    return jsonResponse({
      course: { id: courseId, title: course.title ?? "Курс" },
      learners,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
