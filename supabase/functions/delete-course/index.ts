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
} from "../_shared/qa-version-flow.ts";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseAdmin = createAdminClient();

  try {
    const body = await readJson(req);
    const user = await getAuthUser(req, supabaseAdmin);
    const courseId = asUuid(body?.course_id, "course_id");

    await loadOwnedCourse(supabaseAdmin, courseId, user.id);
    await deleteCourseTree(supabaseAdmin, courseId);

    return jsonResponse({ deleted_course_id: courseId });
  } catch (error) {
    return errorResponse(error);
  }
});

async function deleteCourseTree(supabaseAdmin: SupabaseAdmin, courseId: string) {
  const { data: modules, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("course_id", courseId);
  if (modulesError) throw dbError("Не удалось загрузить модули курса", modulesError);

  const moduleIds = (modules ?? []).map((item: any) => item.id).filter(Boolean);

  const { data: lessons, error: lessonsError } = moduleIds.length
    ? await supabaseAdmin.from("lessons").select("id").in("module_id", moduleIds)
    : { data: [], error: null };
  if (lessonsError) throw dbError("Не удалось загрузить уроки курса", lessonsError);

  const lessonIds = (lessons ?? []).map((item: any) => item.id).filter(Boolean);

  const courseQuizIds = await getIds(supabaseAdmin, "quizzes", "course_id", [courseId]);
  const lessonQuizIds = lessonIds.length ? await getIds(supabaseAdmin, "quizzes", "lesson_id", lessonIds) : [];
  const quizIds = [...new Set([...courseQuizIds, ...lessonQuizIds])];

  const questionIds = quizIds.length ? await getIds(supabaseAdmin, "questions", "quiz_id", quizIds) : [];

  await deleteByIn(supabaseAdmin, "answer_options", "question_id", questionIds, "Не удалось удалить варианты ответов");
  await deleteByIn(supabaseAdmin, "quiz_attempts", "quiz_id", quizIds, "Не удалось удалить попытки квизов");
  await deleteByIn(supabaseAdmin, "questions", "quiz_id", quizIds, "Не удалось удалить вопросы");
  await deleteByIn(supabaseAdmin, "quizzes", "id", quizIds, "Не удалось удалить квизы");

  await deleteByIn(supabaseAdmin, "lesson_completions", "lesson_id", lessonIds, "Не удалось удалить отметки прохождения уроков");
  await deleteByIn(supabaseAdmin, "assignment_submissions", "lesson_id", lessonIds, "Не удалось удалить ответы на задания");
  await deleteByEq(supabaseAdmin, "progress", "course_id", courseId, "Не удалось удалить прогресс");

  await deleteByIn(supabaseAdmin, "lesson_contents", "lesson_id", lessonIds, "Не удалось удалить материалы уроков");
  await deleteByIn(supabaseAdmin, "lessons", "id", lessonIds, "Не удалось удалить уроки");
  await deleteByIn(supabaseAdmin, "modules", "id", moduleIds, "Не удалось удалить модули");

  await deleteByEq(supabaseAdmin, "sources", "course_id", courseId, "Не удалось удалить источники");
  await deleteByEq(supabaseAdmin, "qa_reports", "course_id", courseId, "Не удалось удалить отчёты качества");
  await deleteByEq(supabaseAdmin, "audit_logs", "course_id", courseId, "Не удалось удалить историю действий");

  const { error: resetVersionError } = await supabaseAdmin
    .from("courses")
    .update({ current_version_id: null })
    .eq("id", courseId);
  if (resetVersionError) throw dbError("Не удалось подготовить курс к удалению", resetVersionError);

  await deleteByEq(supabaseAdmin, "course_versions", "course_id", courseId, "Не удалось удалить версии курса");

  const { error: courseError } = await supabaseAdmin.from("courses").delete().eq("id", courseId);
  if (courseError) throw dbError("Не удалось удалить курс", courseError);
}

async function getIds(supabaseAdmin: SupabaseAdmin, table: string, column: string, values: string[]) {
  if (!values.length) return [];
  const { data, error } = await supabaseAdmin.from(table).select("id").in(column, values);
  if (error) throw dbError("Не удалось загрузить связанные данные", error);
  return (data ?? []).map((item: any) => item.id).filter(Boolean);
}

async function deleteByIn(supabaseAdmin: SupabaseAdmin, table: string, column: string, values: string[], message: string) {
  if (!values.length) return;
  const { error } = await supabaseAdmin.from(table).delete().in(column, values);
  if (error) throw dbError(message, error);
}

async function deleteByEq(supabaseAdmin: SupabaseAdmin, table: string, column: string, value: string, message: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
  if (error) throw dbError(message, error);
}

function dbError(message: string, error: { message?: string }) {
  return new AppError("DATABASE_ERROR", message, 500, { message: error.message ?? "Database error" });
}
