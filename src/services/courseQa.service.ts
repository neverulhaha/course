/**
 * QA-отчёты по курсу (read-модели для экрана QAReport).
 */
import { supabase } from "@/lib/supabase/client";
import type { QaCategoryView, QaIssueView } from "@/entities/course/readModels";
import { formatRuDateTime } from "@/lib/dateFormat";
import { asRecord, num, str } from "@/services/dbRowUtils";

export type { QaCategoryView, QaIssueView };

export async function fetchLatestQaReport(courseId: string): Promise<{
  courseTitle: string | null;
  overallScore: number | null;
  lastCheck: string;
  categories: QaCategoryView[];
  issues: QaIssueView[];
  recommendations: string[];
  error: string | null;
}> {
  const { data: course } = await supabase.from("courses").select("title").eq("id", courseId).maybeSingle();
  const courseTitle = course ? str(asRecord(course)?.title) : null;

  const { data: report, error } = await supabase
    .from("qa_reports")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { courseTitle, overallScore: null, lastCheck: "—", categories: [], issues: [], recommendations: [], error: error.message };
  if (!report) {
    return {
      courseTitle,
      overallScore: null,
      lastCheck: "—",
      categories: [],
      issues: [],
      recommendations: [],
      error: null,
    };
  }

  const rr = asRecord(report);
  const overallScore = rr ? num(rr.total_score) : null;
  const created = str(rr?.created_at);
  const lastCheck = created ? formatRuDateTime(created) : "—";

  let categories: QaCategoryView[] = [];
  const rawCat = rr?.categories ?? rr?.criteria_scores ?? [{ name: "Структура", score: rr?.structure_score }, { name: "Связность", score: rr?.coherence_score }, { name: "Уровень", score: rr?.level_match_score }, { name: "Источники", score: rr?.source_alignment_score }];
  if (Array.isArray(rawCat)) {
    categories = rawCat
      .map((c) => {
        const o = asRecord(c);
        return o
          ? { name: str(o.name) ?? str(o.title) ?? "—", score: num(o.score) ?? 0 }
          : null;
      })
      .filter(Boolean) as QaCategoryView[];
  }

  let issues: QaIssueView[] = [];
  const rawIssues = rr?.issues_json;
  if (Array.isArray(rawIssues)) {
    issues = rawIssues
      .map((it, i) => {
        const o = asRecord(it);
        if (!o) return null;
        const sev = str(o.severity) as "high" | "medium" | "low";
        return {
          id: str(o.id) ?? `issue-${i}`,
          severity: sev === "high" || sev === "medium" || sev === "low" ? sev : "medium",
          category: str(o.category) ?? "—",
          title: str(o.title) ?? str(o.summary) ?? "Замечание",
          lesson: str(o.lesson) ?? str(o.lesson_title) ?? "—",
          module: str(o.module) ?? str(o.module_title) ?? "—",
          courseId,
          description: str(o.description) ?? "",
          suggestion: str(o.suggestion) ?? "",
        };
      })
      .filter(Boolean) as QaIssueView[];
  }

  let recommendations: string[] = [];
  const rawRec = rr?.recommendations_json;
  if (Array.isArray(rawRec)) {
    recommendations = rawRec.map((x) => str(x) ?? "").filter(Boolean);
  }

  return {
    courseTitle,
    overallScore,
    lastCheck,
    categories,
    issues,
    recommendations,
    error: null,
  };
}


// -----------------------------------------------------------------------------
// QA MVP API used by the new QAReport page.
// Old fetchLatestQaReport export above is intentionally preserved.
// -----------------------------------------------------------------------------
export type QaReport = {
  id: string;
  course_id: string;
  version_id: string | null;
  structure_score: number | null;
  coherence_score: number | null;
  level_match_score: number | null;
  source_alignment_score: number | null;
  total_score: number | null;
  issues_json: unknown;
  recommendations_json: unknown;
  created_at: string;
};

function parseQaEdgeFunctionError(error: any): Error {
  const payload = error?.context?.json?.error ?? error?.error ?? error;
  return new Error(payload?.message ?? error?.message ?? "Не удалось выполнить запрос");
}

function normalizeQaReport(row: unknown): QaReport {
  const record = asRecord(row) ?? {};
  return {
    id: str(record.id) ?? "",
    course_id: str(record.course_id) ?? "",
    version_id: str(record.version_id),
    structure_score: num(record.structure_score),
    coherence_score: num(record.coherence_score),
    level_match_score: num(record.level_match_score),
    source_alignment_score: num(record.source_alignment_score),
    total_score: num(record.total_score),
    issues_json: record.issues_json ?? null,
    recommendations_json: record.recommendations_json ?? null,
    created_at: str(record.created_at) ?? "",
  };
}

export async function runCourseQa(courseId: string, versionId?: string | null): Promise<QaReport> {
  const { data, error } = await supabase.functions.invoke("run-course-qa", {
    body: { course_id: courseId, version_id: versionId ?? undefined },
  });

  if (error) throw parseQaEdgeFunctionError(error);
  if (data?.error) throw new Error(data.error.message);
  return normalizeQaReport(data?.report);
}

export async function getLatestQaReport(courseId: string): Promise<QaReport | null> {
  const { data, error } = await supabase
    .from("qa_reports")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeQaReport(data) : null;
}

export async function getQaHistory(courseId: string): Promise<QaReport[]> {
  const { data, error } = await supabase
    .from("qa_reports")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeQaReport);
}
