import { useEffect, useState } from "react";
import { getCourseVersion, getCourseVersions, restoreCourseVersion, type CourseVersionDetails, type CourseVersionListItem } from "@/services/courseVersion.service";

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

export default function VersionHistoryPage() {
  const [courseId] = useState(() => getCourseIdFromLocation());
  const [versions, setVersions] = useState<CourseVersionListItem[]>([]);
  const [selected, setSelected] = useState<CourseVersionDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!courseId) return;
    setVersions(await getCourseVersions(courseId));
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [courseId]);

  async function openVersion(versionId: string) {
    setError(null);
    setSelected(await getCourseVersion(courseId, versionId));
  }

  async function handleRestore(version: CourseVersionListItem) {
    const ok = window.confirm("Откат восстановит структуру и содержание курса из выбранной версии. История прохождения и попытки квизов не будут удалены. Продолжить?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await restoreCourseVersion(courseId, version.id);
      await refresh();
      setSelected(null);
    } catch (e: any) {
      setError(e.message ?? "Не удалось откатить версию");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Версии курса</h1>
        <p className="text-sm text-slate-500">История изменений, QA-оценки и откат к сохранённым версиям.</p>
      </header>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-2xl border divide-y">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-4 p-4">
              <button className="text-left" onClick={() => openVersion(v.id)}>
                <div className="font-medium">v{v.version_number} · {v.change_type} {v.is_current ? "· текущая" : ""}</div>
                <div className="text-sm text-slate-500">{v.change_description ?? "Без описания"}</div>
                <div className="text-xs text-slate-400">{new Date(v.created_at).toLocaleString()} · QA: {v.qa_score ?? "—"}</div>
              </button>
              <button disabled={busy || v.is_current} onClick={() => handleRestore(v)} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50">Откатить</button>
            </div>
          ))}
        </section>
        <aside className="rounded-2xl border p-5">
          {selected ? <VersionDetails version={selected} /> : <p className="text-slate-500">Выберите версию, чтобы посмотреть детали snapshot.</p>}
        </aside>
      </div>
    </main>
  );
}

function VersionDetails({ version }: { version: CourseVersionDetails }) {
  const s = version.snapshot_data ?? {};
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Версия {version.version_number}</h2>
      <p className="text-sm text-slate-500">{version.change_description}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Модулей" value={s.modules?.length ?? 0} />
        <Metric label="Уроков" value={s.lessons?.length ?? 0} />
        <Metric label="Контента" value={s.lesson_contents?.length ?? 0} />
        <Metric label="Квизов" value={s.quizzes?.length ?? 0} />
        <Metric label="Вопросов" value={s.questions?.length ?? 0} />
        <Metric label="Источников" value={s.sources?.length ?? 0} />
      </dl>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">{label}</dt><dd className="text-lg font-semibold">{value}</dd></div>;
}
