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

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function displayName(profile: Record<string, unknown> | null, email: string) {
  const fullName = clean(profile?.full_name);
  const display = clean(profile?.display_name);
  const name = clean(profile?.name);
  return fullName || display || name || email.split("@")[0];
}

async function findAuthUserByEmail(supabaseAdmin: SupabaseAdmin, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new AppError("DATABASE_ERROR", "Не удалось проверить пользователя", 500, { message: error.message });
    const match = data.users.find((user: { email?: string }) => user.email?.trim().toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function resolveLearner(supabaseAdmin: SupabaseAdmin, email: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, name, full_name, display_name")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) {
    throw new AppError("DATABASE_ERROR", "Не удалось найти профиль обучающегося", 500, { message: profileError.message });
  }

  if (profile?.id) {
    return {
      id: String(profile.id),
      email: String(profile.email ?? email),
      name: displayName(profile as Record<string, unknown>, email),
      profile,
    };
  }

  const authUser = await findAuthUserByEmail(supabaseAdmin, email);
  if (!authUser?.id) return null;

  const fallbackName = clean(authUser.user_metadata?.full_name) || clean(authUser.user_metadata?.display_name) || email.split("@")[0];
  await supabaseAdmin.from("profiles").upsert(
    {
      id: authUser.id,
      email,
      full_name: fallbackName,
      display_name: fallbackName,
      provider: clean(authUser.app_metadata?.provider) || "email",
      app_role: "student",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  return { id: authUser.id, email, name: fallbackName, profile: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseAdmin = createAdminClient();

  try {
    const body = await readJson(req);
    const user = await getAuthUser(req, supabaseAdmin);
    const courseId = asUuid(body?.course_id ?? body?.courseId, "course_id");
    const email = clean(body?.email).toLowerCase();

    if (!email || !emailRe.test(email)) {
      throw new AppError("INVALID_INPUT", "Введите корректный email обучающегося", 400);
    }

    const course = await loadOwnedCourse(supabaseAdmin, courseId, user.id);
    const learner = await resolveLearner(supabaseAdmin, email);
    if (!learner) {
      throw new AppError("INVALID_INPUT", "Пользователь с таким email пока не зарегистрирован", 404, { email });
    }
    if (learner.id === user.id) {
      throw new AppError("INVALID_INPUT", "Автор курса уже имеет доступ к редактированию и прохождению", 400);
    }

    const { data: enrollment, error } = await supabaseAdmin
      .from("course_enrollments")
      .upsert(
        {
          course_id: courseId,
          user_id: learner.id,
          role: "learner",
          status: "active",
          invited_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "course_id,user_id" },
      )
      .select("id, course_id, user_id, role, status, invited_by, created_at, updated_at")
      .maybeSingle();

    if (error || !enrollment) {
      throw new AppError("DATABASE_ERROR", "Не удалось добавить обучающегося", 500, { message: error?.message });
    }

    await supabaseAdmin.from("courses").update({ course_type: "for_students" }).eq("id", courseId);

    await writeAuditLog({
      supabaseAdmin,
      userId: user.id,
      courseId,
      action: "course_learner_added",
      entityType: "course_enrollment",
      entityId: enrollment.id,
      metadata: { learner_user_id: learner.id, learner_email: learner.email, course_title: course.title },
    });

    return jsonResponse({
      enrollment,
      learner: {
        id: learner.id,
        email: learner.email,
        name: learner.name,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
