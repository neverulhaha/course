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

type Row = Record<string, unknown>;
type RestoreMode = "exact" | "safe";

type Snapshot = {
  course: Row;
  modules: Row[];
  lessons: Row[];
  lessonContents: Row[];
  sources: Row[];
  quizzes: Row[];
  questions: Row[];
  answerOptions: Row[];
};

const COURSE_COLUMNS = ["title", "topic", "level", "goal", "duration", "format", "generation_mode", "source_mode", "language", "tone", "status", "generation_depth"];
const MODULE_COLUMNS = ["id", "course_id", "title", "position", "description", "practice_required", "estimated_duration"];
const LESSON_COLUMNS = ["id", "module_id", "title", "position", "objective", "summary", "estimated_duration", "learning_outcome", "content_status"];
const LESSON_CONTENT_COLUMNS = ["id", "lesson_id", "theory_text", "examples_text", "practice_text", "checklist_text"];
const SOURCE_COLUMNS = ["id", "course_id", "source_type", "raw_text", "source_url", "file_ref", "only_source_mode"];
const QUIZ_COLUMNS = ["id", "course_id", "lesson_id", "title", "description"];
const QUESTION_COLUMNS = ["id", "quiz_id", "question_text", "question_type", "explanation", "position"];
const ANSWER_COLUMNS = ["id", "question_id", "answer_text", "is_correct", "position"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const supabaseAdmin = createAdminClient();
  let user: any = null;
  let courseId: string | null = null;
  let versionId: string | null = null;

  try {
    const body = await readJson(req);
    user = await getAuthUser(req, supabaseAdmin);
    courseId = asUuid(body?.course_id, "course_id");
    versionId = asUuid(body?.version_id, "version_id");

    await loadOwnedCourse(supabaseAdmin, courseId, user.id);
    await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "restore_course_version_started", entityType: "course_version", entityId: versionId, metadata: { version_id: versionId } });

    const { data: version, error: versionError } = await supabaseAdmin
      .from("course_versions")
      .select("*")
      .eq("id", versionId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (versionError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить версию", 500, { message: versionError.message });
    if (!version) throw new AppError("VERSION_NOT_FOUND", "Версия не найдена", 404);

    const snapshot = normalizeSnapshot(version.snapshot_data);
    assertRestorableSnapshot(snapshot);

    const backup = await createCourseVersion({
      supabaseAdmin,
      courseId,
      userId: user.id,
      changeType: "before_restore_backup",
      changeDescription: `Резервная версия перед восстановлением версии №${version.version_number ?? "?"}`,
      auditMetadata: { restore_target_version_id: versionId, restore_target_version_number: version.version_number ?? null },
    });

    const summary = await restoreSnapshot(supabaseAdmin, courseId, snapshot);
    const restored = await createCourseVersion({
      supabaseAdmin,
      courseId,
      userId: user.id,
      changeType: "version_restored",
      changeDescription: `Восстановлена версия №${version.version_number}`,
      auditMetadata: { restored_from_version_id: versionId, restored_from_version_number: version.version_number ?? null, backup_version_id: backup.id, restore_mode: summary.mode },
    });

    await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "restore_course_version_completed", entityType: "course_version", entityId: restored.id, metadata: { restored_from_version_id: versionId, restored_version_id: restored.id, backup_version_id: backup.id, ...summary } });
    return jsonResponse({ restored_version: restored, backup_version: backup, restore_summary: summary });
  } catch (error) {
    if (courseId && user?.id) {
      await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "restore_course_version_failed", entityType: versionId ? "course_version" : "course", entityId: versionId ?? courseId, metadata: { version_id: versionId, error_code: error instanceof AppError ? error.code : "VERSION_RESTORE_FAILED", error_message: error instanceof Error ? error.message : "Unknown error" } });
    }
    return errorResponse(error);
  }
});

async function restoreSnapshot(db: any, courseId: string, snapshot: Snapshot) {
  const graph = await loadGraph(db, courseId);
  const protection = await loadProtection(db, courseId, graph);
  const mode: RestoreMode = protection.lessonIds.size === 0 && protection.quizIds.size === 0 ? "exact" : "safe";

  await checked(db.from("courses").update({ ...pick(snapshot.course, COURSE_COLUMNS), updated_at: new Date().toISOString() }).eq("id", courseId), "Не удалось восстановить данные курса");
  await restoreSources(db, courseId, snapshot.sources);

  if (mode === "exact") {
    await deleteExistingGraph(db, courseId, graph);
    await insertSnapshot(db, courseId, snapshot);
    return { mode, protected_lessons: 0, protected_quizzes: 0, kept_extra_lessons: 0, kept_extra_quizzes: 0 };
  }

  const kept = await safeRestore(db, courseId, snapshot, graph, protection);
  return { mode, protected_lessons: protection.lessonIds.size, protected_quizzes: protection.quizIds.size, kept_extra_lessons: kept.lessons, kept_extra_quizzes: kept.quizzes };
}

async function restoreSources(db: any, courseId: string, sources: Row[]) {
  await checked(db.from("sources").delete().eq("course_id", courseId), "Не удалось очистить источники");
  if (sources.length) await checked(db.from("sources").insert(sources.map((row) => ({ ...pick(row, SOURCE_COLUMNS), course_id: courseId }))), "Не удалось восстановить источники");
}

async function deleteExistingGraph(db: any, courseId: string, graph: Awaited<ReturnType<typeof loadGraph>>) {
  await deleteByIds(db, "answer_options", graph.answerOptionIds, "Не удалось очистить варианты ответов");
  await deleteByIds(db, "questions", graph.questionIds, "Не удалось очистить вопросы");
  await deleteByIds(db, "quizzes", graph.quizIds, "Не удалось очистить квизы");
  await deleteByColumn(db, "lesson_contents", "lesson_id", graph.lessonIds, "Не удалось очистить содержимое уроков");
  await deleteByIds(db, "lessons", graph.lessonIds, "Не удалось очистить уроки");
  await checked(db.from("modules").delete().eq("course_id", courseId), "Не удалось очистить модули");
}

async function insertSnapshot(db: any, courseId: string, snapshot: Snapshot) {
  const modules = snapshot.modules.map((row) => ({ ...pick(row, MODULE_COLUMNS), course_id: courseId }));
  const lessons = snapshot.lessons.map((row) => pick(row, LESSON_COLUMNS));
  const contents = snapshot.lessonContents.map((row) => pick(row, LESSON_CONTENT_COLUMNS));
  const quizzes = snapshot.quizzes.map((row) => normalizeQuiz(row, courseId));
  const questions = snapshot.questions.map((row) => pick(row, QUESTION_COLUMNS));
  const answers = snapshot.answerOptions.map((row) => pick(row, ANSWER_COLUMNS));

  if (modules.length) await checked(db.from("modules").insert(modules), "Не удалось восстановить модули");
  if (lessons.length) await checked(db.from("lessons").insert(lessons), "Не удалось восстановить уроки");
  if (contents.length) await checked(db.from("lesson_contents").insert(contents), "Не удалось восстановить содержимое уроков");
  if (quizzes.length) await checked(db.from("quizzes").insert(quizzes), "Не удалось восстановить квизы");
  if (questions.length) await checked(db.from("questions").insert(questions), "Не удалось восстановить вопросы");
  if (answers.length) await checked(db.from("answer_options").insert(answers), "Не удалось восстановить варианты ответов");
}

async function safeRestore(db: any, courseId: string, snapshot: Snapshot, graph: Awaited<ReturnType<typeof loadGraph>>, protection: Awaited<ReturnType<typeof loadProtection>>) {
  const snapshotModules = idSet(snapshot.modules);
  const snapshotLessons = idSet(snapshot.lessons);
  const snapshotQuizzes = idSet(snapshot.quizzes);
  const snapshotQuestions = idSet(snapshot.questions);
  const snapshotAnswers = idSet(snapshot.answerOptions);

  const deleteAnswers = graph.answerOptionIds.filter((id) => !snapshotAnswers.has(id) && !protection.answerOptionIds.has(id));
  const deleteQuestions = graph.questionIds.filter((id) => !snapshotQuestions.has(id) && !protection.questionIds.has(id));
  const deleteQuizzes = graph.quizIds.filter((id) => !snapshotQuizzes.has(id) && !protection.quizIds.has(id));
  const deleteLessons = graph.lessonIds.filter((id) => !snapshotLessons.has(id) && !protection.lessonIds.has(id));
  const deleteModules = graph.moduleIds.filter((id) => !snapshotModules.has(id) && !graph.lessons.some((lesson) => lesson.module_id === id && !deleteLessons.includes(lesson.id)));

  await deleteByIds(db, "answer_options", deleteAnswers, "Не удалось удалить устаревшие варианты ответов");
  await deleteByIds(db, "questions", deleteQuestions, "Не удалось удалить устаревшие вопросы");
  await deleteByIds(db, "quizzes", deleteQuizzes, "Не удалось удалить устаревшие квизы");
  await deleteByColumn(db, "lesson_contents", "lesson_id", deleteLessons, "Не удалось удалить устаревшее содержимое уроков");
  await deleteByIds(db, "lessons", deleteLessons, "Не удалось удалить устаревшие уроки");
  await deleteByIds(db, "modules", deleteModules, "Не удалось удалить устаревшие модули");

  const modules = snapshot.modules.map((row) => ({ ...pick(row, MODULE_COLUMNS), course_id: courseId }));
  const lessons = snapshot.lessons.map((row) => pick(row, LESSON_COLUMNS));
  const contents = snapshot.lessonContents.map((row) => pick(row, LESSON_CONTENT_COLUMNS));
  const quizzes = snapshot.quizzes.map((row) => normalizeQuiz(row, courseId));
  const questions = snapshot.questions.filter((row) => !protection.questionIds.has(text(row.id))).map((row) => pick(row, QUESTION_COLUMNS));
  const answers = snapshot.answerOptions.filter((row) => !protection.answerOptionIds.has(text(row.id))).map((row) => pick(row, ANSWER_COLUMNS));

  if (modules.length) await checked(db.from("modules").upsert(modules, { onConflict: "id" }), "Не удалось восстановить модули");
  if (lessons.length) await checked(db.from("lessons").upsert(lessons, { onConflict: "id" }), "Не удалось восстановить уроки");
  if (contents.length) await checked(db.from("lesson_contents").upsert(contents, { onConflict: "lesson_id" }), "Не удалось восстановить содержимое уроков");
  if (quizzes.length) await checked(db.from("quizzes").upsert(quizzes, { onConflict: "id" }), "Не удалось восстановить квизы");
  if (questions.length) await checked(db.from("questions").upsert(questions, { onConflict: "id" }), "Не удалось восстановить вопросы");
  if (answers.length) await checked(db.from("answer_options").upsert(answers, { onConflict: "id" }), "Не удалось восстановить варианты ответов");

  return { lessons: graph.lessonIds.filter((id) => !snapshotLessons.has(id) && !deleteLessons.includes(id)).length, quizzes: graph.quizIds.filter((id) => !snapshotQuizzes.has(id) && !deleteQuizzes.includes(id)).length };
}

async function loadGraph(db: any, courseId: string) {
  const { data: modules, error: modulesError } = await db.from("modules").select("id").eq("course_id", courseId);
  if (modulesError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить модули курса", 500, { message: modulesError.message });
  const moduleIds = (modules ?? []).map((row: any) => row.id).filter(Boolean);

  const { data: lessons, error: lessonsError } = moduleIds.length ? await db.from("lessons").select("id,module_id").in("module_id", moduleIds) : { data: [], error: null };
  if (lessonsError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить уроки курса", 500, { message: lessonsError.message });
  const lessonIds = (lessons ?? []).map((row: any) => row.id).filter(Boolean);

  const { data: courseQuizzes, error: courseQuizError } = await db.from("quizzes").select("id,course_id,lesson_id").eq("course_id", courseId);
  if (courseQuizError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить квизы курса", 500, { message: courseQuizError.message });
  const { data: lessonQuizzes, error: lessonQuizError } = lessonIds.length ? await db.from("quizzes").select("id,course_id,lesson_id").in("lesson_id", lessonIds) : { data: [], error: null };
  if (lessonQuizError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить квизы уроков", 500, { message: lessonQuizError.message });

  const quizMap = new Map<string, any>();
  for (const quiz of [...(courseQuizzes ?? []), ...(lessonQuizzes ?? [])]) quizMap.set(quiz.id, quiz);
  const quizzes = [...quizMap.values()];
  const quizIds = quizzes.map((row) => row.id).filter(Boolean);

  const { data: questions, error: questionsError } = quizIds.length ? await db.from("questions").select("id,quiz_id").in("quiz_id", quizIds) : { data: [], error: null };
  if (questionsError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить вопросы квизов", 500, { message: questionsError.message });
  const questionIds = (questions ?? []).map((row: any) => row.id).filter(Boolean);

  const { data: answerOptions, error: answerError } = questionIds.length ? await db.from("answer_options").select("id,question_id").in("question_id", questionIds) : { data: [], error: null };
  if (answerError) throw new AppError("DATABASE_ERROR", "Не удалось загрузить варианты ответов", 500, { message: answerError.message });

  return { modules: modules ?? [], lessons: lessons ?? [], quizzes, questions: questions ?? [], answerOptions: answerOptions ?? [], moduleIds, lessonIds, quizIds, questionIds, answerOptionIds: (answerOptions ?? []).map((row: any) => row.id).filter(Boolean) };
}

async function loadProtection(db: any, courseId: string, graph: Awaited<ReturnType<typeof loadGraph>>) {
  const lessonIds = new Set<string>();
  const quizIds = new Set<string>();
  const questionIds = new Set<string>();
  const answerOptionIds = new Set<string>();

  const { data: progressRows } = await db.from("progress").select("last_opened_lesson_id,next_recommended_lesson_id").eq("course_id", courseId);
  for (const row of progressRows ?? []) {
    add(lessonIds, row.last_opened_lesson_id);
    add(lessonIds, row.next_recommended_lesson_id);
  }

  if (graph.lessonIds.length) {
    const { data: completions } = await db.from("lesson_completions").select("lesson_id").in("lesson_id", graph.lessonIds);
    const { data: submissions } = await db.from("assignment_submissions").select("lesson_id").in("lesson_id", graph.lessonIds);
    for (const row of completions ?? []) add(lessonIds, row.lesson_id);
    for (const row of submissions ?? []) add(lessonIds, row.lesson_id);
  }

  if (graph.quizIds.length) {
    const { data: attempts } = await db.from("quiz_attempts").select("quiz_id").in("quiz_id", graph.quizIds);
    for (const row of attempts ?? []) add(quizIds, row.quiz_id);
  }

  for (const quizId of quizIds) for (const question of graph.questions) if (question.quiz_id === quizId) questionIds.add(question.id);
  for (const questionId of questionIds) for (const answer of graph.answerOptions) if (answer.question_id === questionId) answerOptionIds.add(answer.id);

  return { lessonIds, quizIds, questionIds, answerOptionIds };
}

function normalizeSnapshot(value: unknown): Snapshot {
  const root = record(value);
  const snapshot = record(root?.snapshot_data) ?? record(root?.snapshot) ?? record(root?.data) ?? root;
  if (!snapshot) throw new AppError("VERSION_SNAPSHOT_INVALID", "Снимок версии повреждён или неполный", 400);

  const course = record(snapshot.course);
  if (!course) throw new AppError("VERSION_SNAPSHOT_INVALID", "В снимке версии нет данных курса", 400);

  return {
    course,
    modules: rows(snapshot.modules),
    lessons: rows(snapshot.lessons),
    lessonContents: rows(snapshot.lesson_contents ?? snapshot.lessonContents),
    sources: rows(snapshot.sources),
    quizzes: rows(snapshot.quizzes),
    questions: rows(snapshot.questions),
    answerOptions: rows(snapshot.answer_options ?? snapshot.answerOptions),
  };
}

function assertRestorableSnapshot(snapshot: Snapshot) {
  if (snapshot.modules.length === 0 || snapshot.lessons.length === 0) {
    throw new AppError(
      "VERSION_SNAPSHOT_INVALID",
      "Эта версия не содержит структуру курса. Скорее всего, она была создана до генерации плана, поэтому откат отключён.",
      400,
      { modules: snapshot.modules.length, lessons: snapshot.lessons.length },
    );
  }
}

function normalizeQuiz(row: Row, courseId: string) {
  const quiz = pick(row, QUIZ_COLUMNS);
  if (quiz.course_id) quiz.course_id = courseId;
  return quiz;
}

async function deleteByIds(db: any, table: string, ids: string[], message: string) {
  await deleteByColumn(db, table, "id", ids, message);
}

async function deleteByColumn(db: any, table: string, column: string, values: string[], message: string) {
  const unique = [...new Set(values.filter(Boolean))];
  if (!unique.length) return;
  await checked(db.from(table).delete().in(column, unique), message);
}

async function checked(query: PromiseLike<{ error: any }>, message: string) {
  const { error } = await query;
  if (error) throw new AppError("VERSION_RESTORE_FAILED", message, 500, { message: error.message });
}

function pick(obj: Row, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  return out;
}

function record(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(record(item))) : [];
}

function idSet(items: Row[]) {
  return new Set(items.map((item) => text(item.id)).filter(Boolean));
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function add(set: Set<string>, value: unknown) {
  const next = text(value);
  if (next) set.add(next);
}
