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
  loadCourseSnapshot,
  runAiQa,
  buildRuleBasedQa,
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
    const versionId = body?.version_id ? asUuid(body.version_id, "version_id") : null;
    const course = await loadOwnedCourse(supabaseAdmin, courseId, user.id);
    if (versionId) {
      const { data: version, error: versionError } = await supabaseAdmin
        .from("course_versions")
        .select("id")
        .eq("id", versionId)
        .eq("course_id", courseId)
        .maybeSingle();
      if (versionError) throw new AppError("DATABASE_ERROR", "Не удалось проверить версию курса", 500, { message: versionError.message });
      if (!version) throw new AppError("VERSION_NOT_FOUND", "Версия не найдена", 404);
    }

    await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "run_course_qa_started", entityType: "course", entityId: courseId, metadata: { version_id: versionId } });

    const snapshot = await loadCourseSnapshot(supabaseAdmin, courseId);
    let qa = null;
    try {
      qa = await runAiQa(snapshot);
    } catch (error) {
      console.warn("ai_qa_failed_using_fallback", error);
    }
    if (!qa) qa = buildRuleBasedQa(snapshot);

    const linkedVersionId = versionId ?? course.current_version_id ?? null;
    const insertPayload = {
      course_id: courseId,
      version_id: linkedVersionId,
      structure_score: qa.structure_score,
      coherence_score: qa.coherence_score,
      level_match_score: qa.level_match_score,
      source_alignment_score: qa.source_alignment_score,
      total_score: qa.total_score,
      issues_json: {
        summary: qa.summary,
        issues: qa.issues ?? [],
        suspicious_facts: qa.suspicious_facts ?? [],
        source_alignment: qa.source_alignment ?? null,
        fallback: qa.fallback === true,
      },
      recommendations_json: {
        summary: qa.summary,
        recommendations: qa.recommendations ?? [],
        fallback: qa.fallback === true,
      },
    };

    const { data: report, error } = await supabaseAdmin.from("qa_reports").insert(insertPayload).select("*").single();
    if (error) throw new AppError("DATABASE_ERROR", "Не удалось сохранить QA-отчёт", 500, { message: error.message });

    if (linkedVersionId) {
      await supabaseAdmin.from("course_versions").update({ qa_score: qa.total_score }).eq("id", linkedVersionId).eq("course_id", courseId);
    }

    await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "run_course_qa_completed", entityType: "qa_report", entityId: report.id, metadata: { qa_report_id: report.id, version_id: linkedVersionId, total_score: qa.total_score, fallback: qa.fallback === true } });
    return jsonResponse({ report });
  } catch (error) {
    if (courseId && user?.id) await writeAuditLog({ supabaseAdmin, userId: user.id, courseId, action: "run_course_qa_failed", entityType: "course", entityId: courseId, metadata: { error_code: error instanceof AppError ? error.code : "QA_FAILED", error_message: error instanceof Error ? error.message : "Unknown error" } });
    return errorResponse(error);
  }
});
