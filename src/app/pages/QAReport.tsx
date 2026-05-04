import { useEffect, useState } from "react";
import { getLatestQaReport, getQaHistory, runCourseQa, type QaReport } from "@/services/courseQa.service";

function getCourseIdFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("courseId") ?? params.get("course_id");

  if (fromQuery) {
    return fromQuery;
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const parts = window.location.pathname.split("/").filter(Boolean);
  const uuidPart = parts.find((part) => uuidPattern.test(part));

  return uuidPart ?? "";
}

export default function QAReportPage() {
  const [courseId] = useState(() => getCourseIdFromLocation());
  const [latest, setLatest] = useState<QaReport | null>(null);
  const [history, setHistory] = useState<QaReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!courseId) return;
    setLatest(await getLatestQaReport(courseId));
    setHistory(await getQaHistory(courseId));
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [courseId]);

  async function handleRunQa() {
    setBusy(true);
    setError(null);
    try {
      const report = await runCourseQa(courseId);
      setLatest(report);
      await refresh();
    } catch (e: any) {
      setError(e.message ?? "Не удалось запустить QA");
    } finally {
      setBusy(false);
    }
  }

  const issues = Array.isArray(latest?.issues_json?.issues) ? latest?.issues_json.issues : [];
  const recommendations = Array.isArray(latest?.recommendations_json?.recommendations) ? latest?.recommendations_json.recommendations : [];

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">QA-проверка курса</h1>
          <p className="text-sm text-slate-500">Контроль качества структуры, содержимого, источников и квизов.</p>
        </div>
        <button onClick={handleRunQa} disabled={busy || !courseId} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
          {busy ? "Проверяем…" : "Запустить QA"}
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

      {latest ? (
        <section className="grid gap-4 md:grid-cols-5">
          <Score label="Итого" value={latest.total_score} />
          <Score label="Структура" value={latest.structure_score} />
          <Score label="Связность" value={latest.coherence_score} />
          <Score label="Уровень" value={latest.level_match_score} />
          <Score label="Источник" value={latest.source_alignment_score} />
        </section>
      ) : (
        <div className="rounded-xl border p-6 text-slate-500">QA-отчётов пока нет.</div>
      )}

      {latest?.issues_json?.fallback && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">AI-проверка недоступна, выполнена базовая проверка правил.</div>}

      <section className="rounded-2xl border p-5 space-y-3">
        <h2 className="text-lg font-semibold">Проблемы</h2>
        {issues.length ? issues.map((it: any, i: number) => <Issue key={i} issue={it} />) : <p className="text-slate-500">Критичных проблем не найдено.</p>}
      </section>

      <section className="rounded-2xl border p-5 space-y-3">
        <h2 className="text-lg font-semibold">Рекомендации</h2>
        {recommendations.length ? recommendations.map((it: any, i: number) => <Issue key={i} issue={it} />) : <p className="text-slate-500">Рекомендаций пока нет.</p>}
      </section>

      <section className="rounded-2xl border p-5">
        <h2 className="text-lg font-semibold mb-3">История проверок</h2>
        <div className="space-y-2">
          {history.map((r) => (
            <div key={r.id} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm">
              <span>{new Date(r.created_at).toLocaleString()}</span>
              <span className="font-medium">{r.total_score ?? "—"}/100</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Score({ label, value }: { label: string; value: number | null | undefined }) {
  return <div className="rounded-2xl border p-4"><div className="text-sm text-slate-500">{label}</div><div className="text-2xl font-semibold">{value ?? "—"}</div></div>;
}
function Issue({ issue }: { issue: any }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="font-medium">{issue.title ?? issue.priority ?? "Замечание"}</div><div className="text-sm text-slate-600">{issue.description ?? issue.recommendation ?? ""}</div></div>;
}
