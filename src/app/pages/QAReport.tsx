import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileWarning,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  getLatestQaReport,
  getQaHistory,
  getQaVersionSummary,
  runCourseQa,
  sanitizeQaError,
  type QaIssue,
  type QaRecommendation,
  type QaReport,
  type QaSeverity,
  type QaSuspiciousFact,
  type QaVersionSummary,
} from "@/services/courseQa.service";
import { formatRuDateTime } from "@/lib/dateFormat";
import { cn } from "@/app/components/ui/utils";

const SCORE_LABELS = [
  { key: "structure_score", label: "Структура", description: "Логика модулей, целей и последовательности" },
  { key: "coherence_score", label: "Связность", description: "Связь между уроками, заданиями и объяснениями" },
  { key: "level_match_score", label: "Соответствие уровню", description: "Попадание в заявленную сложность" },
  { key: "source_alignment_score", label: "Опора на источники", description: "Проверка соответствия пользовательским материалам" },
] as const;

const SEVERITY_META: Record<QaSeverity, { label: string; className: string; dotClassName: string }> = {
  low: { label: "Низкая", className: "border-sky-200 bg-sky-50 text-sky-700", dotClassName: "bg-sky-500" },
  medium: { label: "Средняя", className: "border-amber-200 bg-amber-50 text-amber-800", dotClassName: "bg-amber-500" },
  high: { label: "Высокая", className: "border-orange-200 bg-orange-50 text-orange-800", dotClassName: "bg-orange-500" },
  critical: { label: "Критическая", className: "border-red-200 bg-red-50 text-red-700", dotClassName: "bg-red-500" },
};

function getCourseIdFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("courseId") ?? params.get("course_id");
  if (fromQuery) return fromQuery;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.find((part) => uuidPattern.test(part)) ?? "";
}

function scoreClass(value: number | null | undefined) {
  const score = value ?? 0;
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-lime-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

function scoreBarClass(value: number | null | undefined) {
  const score = value ?? 0;
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-lime-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function scoreGradient(value: number | null | undefined) {
  const score = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#65a30d" : score >= 50 ? "#f59e0b" : "#ef4444";
  return `conic-gradient(${color} ${score * 3.6}deg, #e5e7eb 0deg)`;
}

function scoreText(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value)) : "—";
}

function canOpenIssueEntity(issue: Pick<QaIssue | QaSuspiciousFact, "entity_type" | "entity_id">) {
  return Boolean(issue.entity_id && (issue.entity_type === "lesson" || issue.entity_type === "lesson_content"));
}

export default function QAReportPage() {
  const params = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const courseId = params.courseId || getCourseIdFromLocation();

  const [latest, setLatest] = useState<QaReport | null>(null);
  const [versionSummary, setVersionSummary] = useState<QaVersionSummary | null>(null);
  const [history, setHistory] = useState<QaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (!courseId) {
      setError("Не удалось определить курс для QA-отчёта.");
      setLoading(false);
      return;
    }
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [report, reportHistory] = await Promise.all([getLatestQaReport(courseId), getQaHistory(courseId)]);
      setLatest(report);
      setHistory(reportHistory);
      setVersionSummary(report?.version_id ? await getQaVersionSummary(courseId, report.version_id) : null);
    } catch (err) {
      const message = sanitizeQaError(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadReport("initial");
  }, [loadReport]);

  const severityStats = useMemo(() => {
    const stats: Record<QaSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const issue of latest?.issues ?? []) stats[issue.severity] += 1;
    for (const fact of latest?.suspicious_facts ?? []) stats[fact.severity ?? "medium"] += 1;
    return stats;
  }, [latest]);

  async function handleRunQa() {
    if (!courseId || running) return;
    setRunning(true);
    setError(null);
    try {
      const report = await runCourseQa(courseId);
      const [reportHistory, version] = await Promise.all([
        getQaHistory(courseId),
        report.version_id ? getQaVersionSummary(courseId, report.version_id) : Promise.resolve(null),
      ]);
      setLatest(report);
      setHistory(reportHistory);
      setVersionSummary(version);
      toast.success("Проверка качества завершена.");
    } catch (err) {
      const message = sanitizeQaError(err);
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }

  function openIssueEntity(issue: Pick<QaIssue | QaSuspiciousFact, "entity_type" | "entity_id">) {
    if (!issue.entity_id || !issue.entity_type) return;
    const search = new URLSearchParams({ focusEntityType: issue.entity_type, focusEntityId: issue.entity_id });
    navigate(`/app/editor/${courseId}?${search.toString()}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg-page)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <HeaderSkeleton />
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600"><Loader2 className="size-5 animate-spin" />Загружаем QA-отчёт…</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-page)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <button type="button" onClick={() => navigate(`/app/editor/${courseId}`)} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
              <ArrowLeft className="size-4" />Вернуться в редактор
            </button>
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white"><ShieldCheck className="size-5" /></div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950">QA-отчёт курса</h1>
                <p className="mt-1 text-sm text-slate-500">Отдельный раздел для оценки качества структуры, содержания, источников и квизов.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={() => void loadReport("refresh")} disabled={refreshing || running} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55">
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />Обновить отчёт
            </button>
            <button type="button" onClick={handleRunQa} disabled={running || refreshing || !courseId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55">
              {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{running ? "Проверяем качество курса..." : "Запустить проверку качества"}
            </button>
          </div>
        </header>

        {error && <ErrorPanel message={error} retry={() => void loadReport("refresh")} disabled={refreshing || running} />}
        {running && <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-800"><div className="flex items-center gap-3"><Loader2 className="size-5 animate-spin" />Проверяем качество курса... Повторный запуск временно заблокирован.</div></div>}

        {!latest ? (
          <EmptyQaState running={running} onRun={handleRunQa} />
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.05fr_1.5fr]"><OverallScoreCard report={latest} /><div className="grid gap-4 sm:grid-cols-2">{SCORE_LABELS.map((score) => <ScoreCard key={score.key} label={score.label} description={score.description} value={latest[score.key]} />)}</div></section>
            <section className="grid gap-4 lg:grid-cols-3">
              <MetaCard icon={<Clock3 className="size-5" />} label="Дата проверки" value={latest.created_at ? formatRuDateTime(latest.created_at) : "—"} />
              <MetaCard icon={<BookOpen className="size-5" />} label="Связанная версия" value={versionSummary ? `Версия №${versionSummary.version_number ?? "—"}` : latest.version_id ? "Версия не найдена" : "Не привязана"} hint={versionSummary?.change_type_label ?? undefined} />
              <MetaCard icon={<FileWarning className="size-5" />} label="Замечания по серьёзности" value={`${severityStats.critical + severityStats.high} важных`} hint={`Средних: ${severityStats.medium}, низких: ${severityStats.low}`} />
            </section>
            {(latest.summary || latest.source_alignment_summary || latest.is_fallback) && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-slate-950">Краткий вывод</h2>{latest.summary && <p className="mt-2 text-sm leading-6 text-slate-600">{latest.summary}</p>}{latest.source_alignment_summary && <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600"><span className="font-bold text-slate-800">Источники: </span>{latest.source_alignment_summary}</p>}{latest.is_fallback && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">AI-проверка недоступна или вернула неполный ответ, поэтому выполнена базовая проверка по правилам качества.</div>}</section>}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle title="Список замечаний" count={latest.issues.length} />{latest.issues.length ? <div className="mt-4 grid gap-3">{latest.issues.map((issue) => <IssueCard key={issue.id} issue={issue} onOpen={() => openIssueEntity(issue)} />)}</div> : <SuccessEmpty text="Замечаний не найдено." />}</section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle title="Подозрительные факты" count={latest.suspicious_facts.length} />{latest.suspicious_facts.length ? <div className="mt-4 grid gap-3">{latest.suspicious_facts.map((fact) => <SuspiciousFactCard key={fact.id} fact={fact} onOpen={() => openIssueEntity(fact)} />)}</div> : <SuccessEmpty text="Подозрительные факты не обнаружены." />}</section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle title="Рекомендации" count={latest.recommendations.length} />{latest.recommendations.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{latest.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} />)}</div> : <SuccessEmpty text="Рекомендаций пока нет." />}</section>
            {history.length > 1 && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle title="История проверок" count={history.length} /><div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">{history.slice(0, 8).map((report) => <div key={report.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3 text-sm"><span className="text-slate-600">{report.created_at ? formatRuDateTime(report.created_at) : "—"}</span><span className={cn("font-black", scoreClass(report.total_score))}>{scoreText(report.total_score)}/100</span></div>)}</div></section>}
          </>
        )}
      </div>
    </main>
  );
}

function HeaderSkeleton() { return <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />; }
function EmptyQaState({ running, onRun }: { running: boolean; onRun: () => void }) { return <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12"><div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-600"><ShieldCheck className="size-8" /></div><h2 className="mt-5 text-xl font-bold text-slate-950">Проверка качества ещё не выполнена</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Запустите QA, чтобы увидеть общий балл, частные оценки, замечания, подозрительные факты и рекомендации по улучшению курса.</p><button type="button" onClick={onRun} disabled={running} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55">{running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{running ? "Проверяем качество курса..." : "Запустить QA"}</button></section>; }
function ErrorPanel({ message, retry, disabled }: { message: string; retry: () => void; disabled: boolean }) { return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><div className="font-bold">Не удалось выполнить действие</div><div className="mt-1 text-sm leading-5">{message}</div></div></div><button type="button" onClick={retry} disabled={disabled} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-55">Повторить</button></div></div>; }
function OverallScoreCard({ report }: { report: QaReport }) { return <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex size-36 shrink-0 items-center justify-center rounded-full p-3" style={{ background: scoreGradient(report.total_score) }} aria-label={`Общий балл качества: ${scoreText(report.total_score)}`}><div className="flex size-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner"><span className={cn("text-4xl font-black", scoreClass(report.total_score))}>{scoreText(report.total_score)}</span><span className="text-xs font-bold uppercase tracking-wide text-slate-400">из 100</span></div></div><div><h2 className="text-xl font-bold text-slate-950">Общий балл качества</h2><p className="mt-2 text-sm leading-6 text-slate-500">Итоговая оценка формируется из структуры курса, связности материалов, соответствия уровню и проверки источников.</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", scoreBarClass(report.total_score))} style={{ width: `${Math.max(0, Math.min(100, report.total_score ?? 0))}%` }} /></div></div></div></article>; }
function ScoreCard({ label, description, value }: { label: string; description: string; value: number | null | undefined }) { return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{label}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div><span className={cn("text-2xl font-black", scoreClass(value))}>{scoreText(value)}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", scoreBarClass(value))} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></div></article>; }
function MetaCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) { return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">{icon}</div><div className="min-w-0"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 truncate text-base font-black text-slate-950">{value}</div>{hint && <div className="mt-1 truncate text-xs font-semibold text-slate-500">{hint}</div>}</div></div></article>; }
function SectionTitle({ title, count }: { title: string; count: number }) { return <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-950">{title}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{count}</span></div>; }
function SeverityBadge({ severity }: { severity: QaSeverity }) { const meta = SEVERITY_META[severity] ?? SEVERITY_META.medium; return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black", meta.className)}><span className={cn("size-1.5 rounded-full", meta.dotClassName)} />{meta.label}</span>; }
function IssueCard({ issue, onOpen }: { issue: QaIssue; onOpen: () => void }) { return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={issue.severity} /><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{issue.type}</span></div><h3 className="mt-3 text-base font-black text-slate-950">{issue.title}</h3>{issue.description && <p className="mt-2 text-sm leading-6 text-slate-600">{issue.description}</p>}{issue.recommendation && <p className="mt-2 rounded-2xl bg-white p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200"><span className="font-bold text-slate-800">Рекомендация: </span>{issue.recommendation}</p>}</div>{canOpenIssueEntity(issue) && <button type="button" onClick={onOpen} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">Открыть урок<ExternalLink className="size-4" /></button>}</div></article>; }
function SuspiciousFactCard({ fact, onOpen }: { fact: QaSuspiciousFact; onOpen: () => void }) { return <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={fact.severity ?? "medium"} /><span className="rounded-full bg-white/75 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">Подозрительный факт</span></div><h3 className="mt-3 text-base font-black text-slate-950">{fact.claim}</h3><p className="mt-2 text-sm leading-6 text-amber-900"><span className="font-bold">Причина: </span>{fact.reason}</p><p className="mt-2 rounded-2xl bg-white/75 p-3 text-sm leading-6 text-slate-700 ring-1 ring-amber-200"><span className="font-bold text-slate-900">Рекомендация: </span>{fact.recommendation}</p></div>{canOpenIssueEntity(fact) && <button type="button" onClick={onOpen} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100">Открыть урок<ExternalLink className="size-4" /></button>}</div></article>; }
function RecommendationCard({ recommendation }: { recommendation: QaRecommendation }) { return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2"><SeverityBadge severity={recommendation.priority} />{recommendation.target && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{recommendation.target}</span>}</div><h3 className="mt-3 text-base font-black text-slate-950">{recommendation.title}</h3>{recommendation.description && <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.description}</p>}</article>; }
function SuccessEmpty({ text }: { text: string }) { return <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><div className="flex items-center gap-2"><CheckCircle2 className="size-5" />{text}</div></div>; }
