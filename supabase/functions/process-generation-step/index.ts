import {
  AppError,
  asRecord,
  clean,
  corsHeaders,
  createAdminClient,
  errorResponse,
  insertStep,
  invokeFunction,
  jsonResponse,
  loadCourseMetrics,
  loadOwnedCourse,
  normalizeDepth,
  readJson,
  getAuthUser,
  summarizeSession,
  updateCourseStatus,
  validateMetrics,
  writeAuditLog,
  addMessage,
  stepTitle,
  debugErrorPayload,
  type Rec,
  type GenerationDepth,
} from "../_shared/generation-session.ts";

const MIN_SOURCE_LENGTH = Number.isFinite(Number(Deno.env.get("MIN_SOURCE_LENGTH"))) ? Math.max(1, Number(Deno.env.get("MIN_SOURCE_LENGTH"))) : 700;

type Db = ReturnType<typeof createAdminClient>;

function now(): string {
  return new Date().toISOString();
}

async function getSession(db: Db, sessionId: string): Promise<Rec> {
  const { data, error } = await db.from("generation_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось загрузить создание курса", 500, { message: error.message });
  const session = asRecord(data);
  if (!session) throw new AppError("SESSION_NOT_FOUND", "Создание курса не найдено", 404);
  return session;
}

async function nextStep(db: Db, sessionId: string): Promise<Rec | null> {
  const { data, error } = await db
    .from("generation_steps")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["pending", "failed"])
    .order("step_order", { ascending: true });
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось определить следующий этап", 500, { message: error.message });
  for (const row of data ?? []) {
    const step = asRecord(row);
    if (!step) continue;
    if (clean(step.status) === "pending") return step;
    if (clean(step.status) === "failed" && Number(step.attempt_count ?? 0) < Number(step.max_attempts ?? 1)) return step;
  }
  return null;
}

async function refreshCounters(db: Db, sessionId: string, currentStep: string | null = null): Promise<void> {
  const { data: steps } = await db.from("generation_steps").select("status").eq("session_id", sessionId);
  const rows = (steps ?? []).map((s) => asRecord(s)).filter(Boolean) as Rec[];
  const completed = rows.filter((s) => ["completed", "skipped"].includes(clean(s.status))).length;
  const failed = rows.filter((s) => clean(s.status) === "failed").length;
  await db.from("generation_sessions").update({
    total_steps: rows.length,
    completed_steps: completed,
    failed_steps: failed,
    current_step: currentStep,
    updated_at: now(),
  }).eq("id", sessionId);
}

async function getMaxOrder(db: Db, sessionId: string): Promise<number> {
  const { data, error } = await db.from("generation_steps").select("step_order").eq("session_id", sessionId).order("step_order", { ascending: false }).limit(1);
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось подготовить следующие этапы", 500, { message: error.message });
  return Number(asRecord((data ?? [])[0])?.step_order ?? 0);
}

async function stepExists(db: Db, sessionId: string, stepType: string, entityId?: string | null): Promise<boolean> {
  let query = db.from("generation_steps").select("id", { count: "exact", head: true }).eq("session_id", sessionId).eq("step_type", stepType);
  if (entityId) query = query.eq("entity_id", entityId);
  const { count, error } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось проверить этапы создания курса", 500, { message: error.message });
  return (count ?? 0) > 0;
}

async function enqueueAfterPlan(db: Db, session: Rec): Promise<void> {
  const sessionId = clean(session.id);
  const courseId = clean(session.course_id);
  let order = await getMaxOrder(db, sessionId) + 1;

  if (!(await stepExists(db, sessionId, "run_plan_qa"))) {
    await insertStep(db, { sessionId, courseId, stepType: "run_plan_qa", stepOrder: order++, entityType: "course", entityId: courseId, maxAttempts: 1 });
  }
  if (!(await stepExists(db, sessionId, "validate_plan"))) {
    await insertStep(db, { sessionId, courseId, stepType: "validate_plan", stepOrder: order++, entityType: "course", entityId: courseId });
  }

  await refreshCounters(db, sessionId, "run_plan_qa");
}

async function executePrepareSource(db: Db, courseId: string): Promise<Rec> {
  const { data, error } = await db.from("sources").select("id, raw_text, only_source_mode, source_type").eq("course_id", courseId);
  if (error) throw new AppError("DATABASE_ERROR", "Не удалось проверить источник", 500, { message: error.message });
  const rows = (data ?? []).map((row) => asRecord(row)).filter(Boolean) as Rec[];
  const rawText = rows.map((row) => clean(row.raw_text)).filter(Boolean).join("\n\n");
  if (rows.length === 0 || rawText.length === 0) throw new AppError("SOURCE_REQUIRED", "Добавьте текст источника для создания курса", 400);
  if (rawText.length < MIN_SOURCE_LENGTH) throw new AppError("SOURCE_TOO_SHORT", `Добавьте больше материала: минимум ${MIN_SOURCE_LENGTH} символов`, 400, { source_length: rawText.length });
  return { source_count: rows.length, source_length: rawText.length, only_source_mode: rows.some((row) => Boolean(row.only_source_mode)) };
}

async function executeValidation(db: Db, session: Rec, expectedDepth: GenerationDepth): Promise<Rec> {
  const sessionId = clean(session.id);
  const courseId = clean(session.course_id);
  const metrics = await loadCourseMetrics(db, courseId);
  const validation = validateMetrics(expectedDepth, metrics);
  await updateCourseStatus(db, courseId, validation.courseStatus);
  await db.from("generation_sessions").update({
    status: validation.sessionStatus,
    completed_at: now(),
    current_step: null,
    last_error_message: validation.ok ? null : validation.message,
    result_json: { message: validation.message, metrics },
    updated_at: now(),
  }).eq("id", sessionId);
  return { message: validation.message, metrics, ok: validation.ok };
}

async function executeStep(req: Request, db: Db, session: Rec, step: Rec): Promise<Rec> {
  const courseId = clean(session.course_id);
  const stepType = clean(step.step_type);
  const force = Boolean(session.force);

  if (stepType === "prepare_source") return await executePrepareSource(db, courseId);

  if (stepType === "generate_plan") {
    const metrics = await loadCourseMetrics(db, courseId);
    if (Number(metrics.module_count ?? 0) > 0 && !force) return { skipped: true, reason: "plan_exists", metrics };
    await updateCourseStatus(db, courseId, "generating_plan");
    return await invokeFunction(req, "generate-course-plan", { course_id: courseId, force, trace_session_id: clean(session.id), trace_step_id: clean(step.id), trace_step_type: stepType });
  }

  if (stepType === "generate_lesson_content") {
    return { skipped: true, reason: "mass_lesson_generation_disabled", message: "Уроки теперь генерируются только по одному из редактора." };
  }

  if (stepType === "generate_course_quiz") {
    return { skipped: true, reason: "auto_course_quiz_disabled", message: "Итоговый квиз больше не создаётся автоматически при генерации плана." };
  }

  if (stepType === "run_plan_qa" || stepType === "run_course_qa") {
    await updateCourseStatus(db, courseId, "qa_checking");
    return await invokeFunction(req, "run-course-qa", { course_id: courseId, qa_scope: "plan", trace_session_id: clean(session.id), trace_step_id: clean(step.id), trace_step_type: stepType });
  }

  if (stepType === "validate_plan") return await executeValidation(db, session, "plan");
  if (stepType === "validate_lessons" || stepType === "validate_full") return await executeValidation(db, session, "plan");

  throw new AppError("INVALID_INPUT", "Неизвестный этап создания курса", 400, { step_type: stepType });
}

async function markFailed(db: Db, session: Rec, step: Rec, error: unknown): Promise<void> {
  const sessionId = clean(session.id);
  const stepId = clean(step.id);
  const attemptCount = Number(step.attempt_count ?? 0) + 1;
  const maxAttempts = Number(step.max_attempts ?? 1);
  const errorPayload = debugErrorPayload(error);
  const message = clean(errorPayload.message) || "Не удалось выполнить этап";
  const finalFailure = attemptCount >= maxAttempts;
  const stepType = clean(step.step_type);
  const hardFailure = finalFailure && ["prepare_source", "generate_plan", "validate_plan", "run_plan_qa"].includes(stepType);

  await db.from("generation_steps").update({
    status: finalFailure ? "failed" : "pending",
    attempt_count: attemptCount,
    error_message: message,
    output_json: { error: errorPayload, finalFailure },
    completed_at: finalFailure ? now() : null,
    updated_at: now(),
  }).eq("id", stepId);

  await db.from("generation_sessions").update({
    status: hardFailure ? "failed" : "running",
    last_error_message: message,
    current_step: hardFailure ? null : stepType,
    updated_at: now(),
  }).eq("id", sessionId);

  await addMessage(db, {
    sessionId,
    stepId,
    role: "error",
    content: { message, finalFailure, error: errorPayload },
    metadata: { step_type: stepType },
  });
  await refreshCounters(db, sessionId, hardFailure ? null : stepType);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const db = createAdminClient();
  try {
    const body = await readJson(req);
    const user = await getAuthUser(req, db);
    const sessionId = clean(body.session_id ?? body.sessionId);
    if (!sessionId) throw new AppError("INVALID_INPUT", "Не найден процесс создания курса", 400);

    const session = await getSession(db, sessionId);
    const courseId = clean(session.course_id);
    await loadOwnedCourse(db, courseId, user.id);

    const sessionStatus = clean(session.status);
    if (["completed", "partially_completed", "failed", "cancelled"].includes(sessionStatus)) {
      return jsonResponse(await summarizeSession(db, sessionId));
    }

    const step = await nextStep(db, sessionId);
    if (!step) {
      const depth = normalizeDepth(session.generation_depth);
      const metrics = await loadCourseMetrics(db, courseId);
      const validation = validateMetrics(depth, metrics);
      await updateCourseStatus(db, courseId, validation.courseStatus);
      await db.from("generation_sessions").update({
        status: validation.sessionStatus,
        completed_at: now(),
        current_step: null,
        result_json: { message: validation.message, metrics },
        last_error_message: validation.ok ? null : validation.message,
        updated_at: now(),
      }).eq("id", sessionId);
      await refreshCounters(db, sessionId, null);
      return jsonResponse(await summarizeSession(db, sessionId));
    }

    const stepId = clean(step.id);
    const stepType = clean(step.step_type);
    await db.from("generation_steps").update({ status: "running", started_at: now(), updated_at: now() }).eq("id", stepId);
    await db.from("generation_sessions").update({ status: "running", current_step: stepType, updated_at: now() }).eq("id", sessionId);
    await addMessage(db, { sessionId, stepId, role: "input", content: { step: stepType, title: stepTitle(stepType), input: asRecord(step.input_json) ?? {} } });

    try {
      const output = await executeStep(req, db, session, step);
      const finalStatus = asRecord(output)?.skipped ? "skipped" : "completed";
      await db.from("generation_steps").update({
        status: finalStatus,
        attempt_count: Number(step.attempt_count ?? 0) + 1,
        output_json: output,
        error_message: null,
        completed_at: now(),
        updated_at: now(),
      }).eq("id", stepId);
      await addMessage(db, { sessionId, stepId, role: "output", content: output, metadata: { step_type: stepType } });

      const freshSession = await getSession(db, sessionId);
      if (stepType === "generate_plan") await enqueueAfterPlan(db, freshSession);
      await refreshCounters(db, sessionId, null);
      await writeAuditLog(db, { userId: user.id, courseId, action: "generation_step_completed", entityType: "course", entityId: courseId, metadata: { session_id: sessionId, step_type: stepType, status: finalStatus } });
      return jsonResponse(await summarizeSession(db, sessionId));
    } catch (error) {
      await markFailed(db, session, step, error);
      await writeAuditLog(db, { userId: user.id, courseId, action: "generation_step_failed", entityType: "course", entityId: courseId, metadata: { session_id: sessionId, step_type: stepType, error_message: error instanceof Error ? error.message : String(error) } });
      return jsonResponse(await summarizeSession(db, sessionId));
    }
  } catch (error) {
    return errorResponse(error);
  }
});
