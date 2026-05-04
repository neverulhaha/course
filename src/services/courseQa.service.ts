/**
 * QA-отчёты по курсу: загрузка, запуск проверки и нормализация JSON-полей.
 */
import { supabase } from "@/lib/supabase/client";
import type { QaCategoryView, QaIssueView } from "@/entities/course/readModels";
import { formatRuDateTime } from "@/lib/dateFormat";
import { asRecord, num, str } from "@/services/dbRowUtils";
import { toCourseVersionChangeLabel } from "@/services/courseVersion.service";

export type { QaCategoryView, QaIssueView };

export type QaSeverity = "low" | "medium" | "high" | "critical";
export type QaPriority = "low" | "medium" | "high" | "critical";

export interface QaIssue {
  id: string;
  severity: QaSeverity;
  type: string;
  title: string;
  description: string;
  recommendation: string;
  entity_type: string | null;
  entity_id: string | null;
  module?: string | null;
  lesson?: string | null;
  raw?: Record<string, unknown>;
}

export interface QaSuspiciousFact {
  id: string;
  claim: string;
  reason: string;
  recommendation: string;
  entity_type: string | null;
  entity_id: string | null;
  severity?: QaSeverity;
  raw?: Record<string, unknown>;
}

export interface QaRecommendation {
  id: string;
  priority: QaPriority;
  title: string;
  description: string;
  target?: string | null;
  raw?: Record<string, unknown>;
}

export interface QaReport {
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
  issues: QaIssue[];
  suspicious_facts: QaSuspiciousFact[];
  recommendations: QaRecommendation[];
  summary: string | null;
  source_alignment_summary: string | null;
  is_fallback: boolean;
}

export interface QaVersionSummary {
  id: string;
  version_number: number | null;
  change_type: string | null;
  change_type_label: string;
  change_description: string | null;
  created_at: string | null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return asRecord(value);
}

function parseJsonLike(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function readNestedArray(value: unknown, keys: string[]): unknown[] {
  const parsed = parseJsonLike(value);
  if (Array.isArray(parsed)) return parsed;
  const record = toRecord(parsed);
  if (!record) return [];

  for (const key of keys) {
    const nested = parseJsonLike(record[key]);
    if (Array.isArray(nested)) return nested;
    const nestedRecord = toRecord(nested);
    if (nestedRecord) {
      for (const inner of keys) {
        const innerArray = parseJsonLike(nestedRecord[inner]);
        if (Array.isArray(innerArray)) return innerArray;
      }
    }
  }
  return [];
}

function normalizeSeverity(value: unknown): QaSeverity {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high" || raw === "critical") return raw;
  return "medium";
}

function normalizePriority(value: unknown): QaPriority {
  return normalizeSeverity(value) as QaPriority;
}

function fallbackText(...values: unknown[]) {
  for (const value of values) {
    const text = str(value)?.trim();
    if (text) return text;
  }
  return "";
}

function makeIssue(item: unknown, index: number): QaIssue | null {
  if (typeof item === "string") {
    const text = item.trim();
    if (!text) return null;
    return {
      id: `issue-${index}`,
      severity: "medium",
      type: "quality",
      title: "Замечание",
      description: text,
      recommendation: "Проверьте этот фрагмент и при необходимости отредактируйте курс.",
      entity_type: null,
      entity_id: null,
    };
  }

  const record = toRecord(item);
  if (!record) return null;
  const title = fallbackText(record.title, record.summary, record.name, record.type, record.category) || "Замечание";
  const description = fallbackText(record.description, record.details, record.reason, record.message);
  const recommendation = fallbackText(record.recommendation, record.suggestion, record.fix, record.action, record.advice);

  return {
    id: fallbackText(record.id) || `issue-${index}`,
    severity: normalizeSeverity(record.severity ?? record.priority ?? record.risk),
    type: fallbackText(record.type, record.category, record.kind) || "quality",
    title,
    description,
    recommendation,
    entity_type: fallbackText(record.entity_type, record.entityType, record.target_type, record.targetType) || null,
    entity_id: fallbackText(record.entity_id, record.entityId, record.target_id, record.targetId, record.lesson_id, record.lessonId) || null,
    module: fallbackText(record.module, record.module_title, record.moduleTitle) || null,
    lesson: fallbackText(record.lesson, record.lesson_title, record.lessonTitle) || null,
    raw: record,
  };
}

function makeSuspiciousFact(item: unknown, index: number): QaSuspiciousFact | null {
  if (typeof item === "string") {
    const text = item.trim();
    if (!text) return null;
    return {
      id: `fact-${index}`,
      claim: text,
      reason: "Требуется дополнительная проверка.",
      recommendation: "Сверьте утверждение с источником или уточните формулировку.",
      entity_type: null,
      entity_id: null,
      severity: "medium",
    };
  }

  const record = toRecord(item);
  if (!record) return null;
  const claim = fallbackText(record.claim, record.statement, record.text, record.title, record.description);
  if (!claim) return null;

  return {
    id: fallbackText(record.id) || `fact-${index}`,
    claim,
    reason: fallbackText(record.reason, record.description, record.details) || "Тезис требует проверки.",
    recommendation: fallbackText(record.recommendation, record.suggestion, record.fix) || "Проверьте тезис по источнику или смягчите формулировку.",
    entity_type: fallbackText(record.entity_type, record.entityType, record.target_type, record.targetType) || null,
    entity_id: fallbackText(record.entity_id, record.entityId, record.target_id, record.targetId, record.lesson_id, record.lessonId) || null,
    severity: normalizeSeverity(record.severity ?? record.priority ?? record.risk),
    raw: record,
  };
}

function makeRecommendation(item: unknown, index: number): QaRecommendation | null {
  if (typeof item === "string") {
    const text = item.trim();
    if (!text) return null;
    return {
      id: `recommendation-${index}`,
      priority: "medium",
      title: text,
      description: "",
      target: null,
    };
  }

  const record = toRecord(item);
  if (!record) return null;
  const title = fallbackText(record.title, record.name, record.summary, record.recommendation, record.text);
  const description = fallbackText(record.description, record.details, record.reason, record.suggestion);
  if (!title && !description) return null;

  return {
    id: fallbackText(record.id) || `recommendation-${index}`,
    priority: normalizePriority(record.priority ?? record.severity ?? record.risk),
    title: title || "Рекомендация",
    description,
    target: fallbackText(record.target, record.scope, record.entity_type, record.entityType) || null,
    raw: record,
  };
}

function extractSummary(issuesJson: unknown, recommendationsJson: unknown): string | null {
  const issueRecord = toRecord(parseJsonLike(issuesJson));
  const recRecord = toRecord(parseJsonLike(recommendationsJson));
  return fallbackText(issueRecord?.summary, recRecord?.summary) || null;
}

function extractSourceAlignmentSummary(issuesJson: unknown): string | null {
  const issueRecord = toRecord(parseJsonLike(issuesJson));
  const sourceAlignment = toRecord(issueRecord?.source_alignment);
  return fallbackText(sourceAlignment?.summary) || null;
}

function extractFallbackFlag(issuesJson: unknown, recommendationsJson: unknown): boolean {
  const issueRecord = toRecord(parseJsonLike(issuesJson));
  const recRecord = toRecord(parseJsonLike(recommendationsJson));
  return issueRecord?.fallback === true || recRecord?.fallback === true;
}

function normalizeIssues(issuesJson: unknown): QaIssue[] {
  return readNestedArray(issuesJson, ["issues", "items", "problems"])
    .map(makeIssue)
    .filter(Boolean) as QaIssue[];
}

function normalizeSuspiciousFacts(issuesJson: unknown): QaSuspiciousFact[] {
  const parsed = parseJsonLike(issuesJson);
  const issueRecord = toRecord(parsed);
  const directFacts = readNestedArray(parsed, ["suspicious_facts", "suspiciousFacts", "facts"]);
  const sourceAlignment = toRecord(issueRecord?.source_alignment);
  const unsupportedClaims = readNestedArray(sourceAlignment, ["unsupported_claims", "unsupportedClaims", "claims"]);
  return [...directFacts, ...unsupportedClaims]
    .map(makeSuspiciousFact)
    .filter(Boolean) as QaSuspiciousFact[];
}

function normalizeRecommendations(recommendationsJson: unknown): QaRecommendation[] {
  return readNestedArray(recommendationsJson, ["recommendations", "items", "actions"])
    .map(makeRecommendation)
    .filter(Boolean) as QaRecommendation[];
}

export function sanitizeQaError(error: unknown): string {
  const record = toRecord(error);
  const nested = toRecord(toRecord(record?.context)?.json);
  const nestedError = toRecord(nested?.error) ?? toRecord(record?.error);
  const code = fallbackText(nestedError?.code, record?.code);
  const message = fallbackText(nestedError?.message, record?.message, error instanceof Error ? error.message : null);

  if (code === "UNAUTHORIZED" || code === "UNAUTHORIZED_NO_AUTH_HEADER") return "Сессия устарела. Войдите заново и повторите проверку.";
  if (code === "FORBIDDEN") return "У вас нет доступа к этому курсу.";
  if (code === "COURSE_NOT_FOUND") return "Курс не найден.";
  if (code === "INVALID_INPUT") return message || "Некорректные данные для запуска QA.";
  if (code === "GENERATION_FAILED") return "Не удалось выполнить AI-проверку. Попробуйте повторить позже.";

  if (!message) return "Не удалось выполнить действие с QA-отчётом.";
  return message.split("\n")[0].replace(/^Error:\s*/i, "").trim() || "Не удалось выполнить действие с QA-отчётом.";
}

function normalizeQaReport(row: unknown): QaReport {
  const record = asRecord(row) ?? {};
  const issuesJson = record.issues_json ?? null;
  const recommendationsJson = record.recommendations_json ?? null;

  return {
    id: str(record.id) ?? "",
    course_id: str(record.course_id) ?? "",
    version_id: str(record.version_id),
    structure_score: num(record.structure_score),
    coherence_score: num(record.coherence_score),
    level_match_score: num(record.level_match_score),
    source_alignment_score: num(record.source_alignment_score),
    total_score: num(record.total_score),
    issues_json: issuesJson,
    recommendations_json: recommendationsJson,
    created_at: str(record.created_at) ?? "",
    issues: normalizeIssues(issuesJson),
    suspicious_facts: normalizeSuspiciousFacts(issuesJson),
    recommendations: normalizeRecommendations(recommendationsJson),
    summary: extractSummary(issuesJson, recommendationsJson),
    source_alignment_summary: extractSourceAlignmentSummary(issuesJson),
    is_fallback: extractFallbackFlag(issuesJson, recommendationsJson),
  };
}

export async function runCourseQa(courseId: string, versionId?: string | null): Promise<QaReport> {
  const { data, error } = await supabase.functions.invoke("run-course-qa", {
    body: { course_id: courseId, version_id: versionId ?? undefined },
  });

  if (error) throw new Error(sanitizeQaError(error));
  if (data?.error) throw new Error(sanitizeQaError(data.error));
  if (!data?.report) throw new Error("QA-проверка завершилась без отчёта. Попробуйте повторить.");
  return normalizeQaReport(data.report);
}

export async function getLatestQaReport(courseId: string): Promise<QaReport | null> {
  const { data, error } = await supabase
    .from("qa_reports")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(sanitizeQaError(error));
  return data ? normalizeQaReport(data) : null;
}

export async function getQaHistory(courseId: string): Promise<QaReport[]> {
  const { data, error } = await supabase
    .from("qa_reports")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(sanitizeQaError(error));
  return (data ?? []).map(normalizeQaReport);
}

export async function getQaVersionSummary(courseId: string, versionId: string | null | undefined): Promise<QaVersionSummary | null> {
  if (!courseId || !versionId) return null;
  const { data, error } = await supabase
    .from("course_versions")
    .select("id, version_number, change_type, change_description, created_at")
    .eq("course_id", courseId)
    .eq("id", versionId)
    .maybeSingle();

  if (error) throw new Error(sanitizeQaError(error));
  const record = asRecord(data);
  if (!record) return null;
  const changeType = str(record.change_type);
  return {
    id: str(record.id) ?? versionId,
    version_number: num(record.version_number),
    change_type: changeType,
    change_type_label: toCourseVersionChangeLabel(changeType),
    change_description: str(record.change_description),
    created_at: str(record.created_at),
  };
}

/**
 * Старый read-model для IntelligenceRail/виджетов. Оставлен совместимым.
 */
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

  try {
    const report = await getLatestQaReport(courseId);
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

    const categories: QaCategoryView[] = [
      { name: "Структура", score: report.structure_score ?? 0 },
      { name: "Связность", score: report.coherence_score ?? 0 },
      { name: "Уровень", score: report.level_match_score ?? 0 },
      { name: "Источники", score: report.source_alignment_score ?? 0 },
    ];

    const issues = report.issues.map((issue, index): QaIssueView => ({
      id: issue.id || `issue-${index}`,
      severity: issue.severity === "critical" ? "high" : issue.severity,
      category: issue.type || "—",
      title: issue.title || "Замечание",
      lesson: issue.lesson || "—",
      module: issue.module || "—",
      courseId,
      description: issue.description || "",
      suggestion: issue.recommendation || "",
    }));

    return {
      courseTitle,
      overallScore: report.total_score,
      lastCheck: report.created_at ? formatRuDateTime(report.created_at) : "—",
      categories,
      issues,
      recommendations: report.recommendations.map((recommendation) => recommendation.title).filter(Boolean),
      error: null,
    };
  } catch (error) {
    return {
      courseTitle,
      overallScore: null,
      lastCheck: "—",
      categories: [],
      issues: [],
      recommendations: [],
      error: sanitizeQaError(error),
    };
  }
}
