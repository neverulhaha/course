import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Eye, FileText, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import {
  getCourseVersion,
  getCourseVersions,
  restoreCourseVersion,
  toCourseVersionChangeLabel,
  type CourseSnapshotView,
  type CourseVersionDetails,
  type CourseVersionListItem,
} from "@/services/courseVersion.service";

const RESTORE_CONFIRMATION_TEXT = "Откат восстановит структуру и содержание курса из выбранной версии. История прохождения и попытки квизов не будут удалены.";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function asSnapshot(value: unknown): CourseSnapshotView {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as CourseSnapshotView) : {};
  return {
    ...record,
    modules: Array.isArray(record.modules) ? record.modules : [],
    lessons: Array.isArray(record.lessons) ? record.lessons : [],
    lesson_contents: Array.isArray(record.lesson_contents) ? record.lesson_contents : [],
    sources: Array.isArray(record.sources) ? record.sources : [],
    quizzes: Array.isArray(record.quizzes) ? record.quizzes : [],
    questions: Array.isArray(record.questions) ? record.questions : [],
    answer_options: Array.isArray(record.answer_options) ? record.answer_options : [],
  };
}

function getSnapshotTitle(snapshot: CourseSnapshotView) {
  const course = snapshot.course;
  if (course && typeof course === "object" && !Array.isArray(course)) {
    const title = (course as Record<string, unknown>).title;
    if (typeof title === "string" && title.trim()) return title.trim();
  }
  return "Сохранённое состояние курса";
}

function useCourseId() {
  const params = useParams();
  return params.courseId ?? "";
}

export default function VersionHistoryPage() {
  const courseId = useCourseId();
  const [versions, setVersions] = useState<CourseVersionListItem[]>([]);
  const [selected, setSelected] = useState<CourseVersionDetails | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<CourseVersionListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentVersion = useMemo(() => versions.find((version) => version.is_current), [versions]);

  const refreshVersions = useCallback(async () => {
    if (!courseId) {
      setVersions([]);
      setError("Не удалось определить курс для просмотра версий.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextVersions = await getCourseVersions(courseId);
      setVersions(nextVersions);
      setSelected((current) => current && nextVersions.some((version) => version.id === current.id) ? current : null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось загрузить версии курса";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void refreshVersions();
  }, [refreshVersions]);

  async function openVersion(versionId: string) {
    if (!courseId || detailsLoadingId || restoringId) return;
    setDetailsLoadingId(versionId);
    setError(null);
    try {
      const version = await getCourseVersion(courseId, versionId);
      setSelected(version);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось открыть версию";
      setError(message);
      toast.error(message);
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function confirmRestore() {
    if (!courseId || !restoreTarget || restoringId) return;
    const target = restoreTarget;
    setRestoringId(target.id);
    setError(null);
    try {
      await restoreCourseVersion(courseId, target.id);
      await refreshVersions();
      setSelected(null);
      setRestoreTarget(null);
      toast.success(`Версия №${target.version_number} восстановлена. Создана новая версия отката.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось восстановить версию";
      setError(message);
      toast.error(message);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-[28px] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Link to={courseId ? `/app/editor/${courseId}` : "/app"} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gray-500)] transition hover:text-[var(--brand-blue)]">
            <ArrowLeft className="h-4 w-4" />
            Вернуться в редактор
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--gray-900)]">Версии курса</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--gray-500)]">История снимков курса, QA-оценки и безопасное восстановление структуры, уроков, источников и квизов.</p>
          </div>
        </div>
        <button type="button" onClick={() => void refreshVersions()} disabled={loading || Boolean(restoringId)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-xs)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--gray-700)] transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </header>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><span>{error}</span></div>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="overflow-hidden rounded-[28px] border border-[var(--border-xs)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-xs)] px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-[var(--gray-900)]">Список версий</h2>
              <p className="text-xs text-[var(--gray-400)]">{versions.length > 0 ? `Всего версий: ${versions.length}` : "История появится после генерации или редактирования"}</p>
            </div>
            {currentVersion && <CurrentVersionPill version={currentVersion} />}
          </div>

          {loading ? <VersionsLoading /> : versions.length === 0 ? <EmptyVersions /> : (
            <div className="divide-y divide-[var(--border-xs)]">
              {versions.map((version) => (
                <VersionRow
                  key={version.id}
                  version={version}
                  selected={selected?.id === version.id}
                  detailsLoading={detailsLoadingId === version.id}
                  restoring={restoringId === version.id}
                  disabled={Boolean(restoringId)}
                  onOpen={() => void openVersion(version.id)}
                  onRestore={() => setRestoreTarget(version)}
                />
              ))}
            </div>
          )}
        </div>

        <VersionDetailsCard version={selected} loading={Boolean(detailsLoadingId)} />
      </section>

      {restoreTarget && (
        <RestoreConfirmModal
          version={restoreTarget}
          busy={restoringId === restoreTarget.id}
          onCancel={() => {
            if (!restoringId) setRestoreTarget(null);
          }}
          onConfirm={() => void confirmRestore()}
        />
      )}
    </main>
  );
}

function CurrentVersionPill({ version }: { version: CourseVersionListItem }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" />Текущая версия №{version.version_number}</span>;
}

function VersionRow({ version, selected, detailsLoading, restoring, disabled, onOpen, onRestore }: { version: CourseVersionListItem; selected: boolean; detailsLoading: boolean; restoring: boolean; disabled: boolean; onOpen: () => void; onRestore: () => void }) {
  const label = toCourseVersionChangeLabel(version.change_type);
  const canRestore = !version.is_current && !disabled;
  return (
    <article className={`grid gap-4 p-5 transition sm:grid-cols-[minmax(0,1fr)_auto] ${selected ? "bg-[rgba(74,144,226,0.06)]" : "bg-transparent"}`}>
      <button type="button" onClick={onOpen} className="min-w-0 text-left" disabled={detailsLoading || disabled}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold text-[var(--gray-900)]">Версия №{version.version_number}</span>
          <span className="rounded-full bg-[rgba(74,144,226,0.08)] px-2.5 py-1 text-xs font-bold text-[var(--brand-blue)]">{label}</span>
          {version.is_current && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Текущая версия</span>}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--gray-600)]">{version.change_description?.trim() || "Описание изменения не указано"}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-[var(--gray-400)]">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDateTime(version.created_at)}</span>
          <span>QA score: {version.qa_score ?? "—"}</span>
        </div>
      </button>
      <div className="flex items-center gap-2 sm:justify-end">
        <button type="button" onClick={onOpen} disabled={detailsLoading || disabled} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-xs)] bg-white px-3 py-2 text-sm font-semibold text-[var(--gray-700)] transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-50">
          {detailsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Детали
        </button>
        <button type="button" onClick={onRestore} disabled={!canRestore} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">
          {restoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Восстановить
        </button>
      </div>
    </article>
  );
}

function VersionDetailsCard({ version, loading }: { version: CourseVersionDetails | null; loading: boolean }) {
  if (loading) return <aside className="rounded-[28px] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5"><div className="h-5 w-36 animate-pulse rounded-full bg-slate-100" /><div className="mt-4 grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div></aside>;
  if (!version) return <aside className="rounded-[28px] border border-dashed border-[var(--border-xs)] bg-[var(--bg-surface)] p-6 text-center"><FileText className="mx-auto h-10 w-10 text-[var(--gray-300)]" /><h2 className="mt-3 text-base font-bold text-[var(--gray-900)]">Детали версии</h2><p className="mt-2 text-sm leading-6 text-[var(--gray-500)]">Выберите версию слева, чтобы посмотреть состав сохранённого snapshot_data.</p></aside>;

  const snapshot = asSnapshot(version.snapshot_data);
  return (
    <aside className="rounded-[28px] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold text-[var(--gray-900)]">Версия №{version.version_number}</h2><p className="mt-1 text-sm text-[var(--gray-500)]">{toCourseVersionChangeLabel(version.change_type)}</p></div>
          {version.is_current && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Текущая</span>}
        </div>
        <p className="text-sm leading-6 text-[var(--gray-600)]">{version.change_description || "Описание изменения не указано"}</p>
        <div className="rounded-2xl bg-slate-50 p-3 text-sm"><p className="font-bold text-[var(--gray-900)]">{getSnapshotTitle(snapshot)}</p><p className="mt-1 text-xs text-[var(--gray-400)]">Создана: {formatDateTime(version.created_at)} · QA score: {version.qa_score ?? "—"}</p></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Модулей" value={snapshot.modules?.length ?? 0} />
        <Metric label="Уроков" value={snapshot.lessons?.length ?? 0} />
        <Metric label="Материалов" value={snapshot.lesson_contents?.length ?? 0} />
        <Metric label="Источников" value={snapshot.sources?.length ?? 0} />
        <Metric label="Квизов" value={snapshot.quizzes?.length ?? 0} />
        <Metric label="Вопросов" value={snapshot.questions?.length ?? 0} />
        <Metric label="Ответов" value={snapshot.answer_options?.length ?? 0} />
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[var(--border-xs)] bg-white p-3"><dt className="text-xs font-semibold text-[var(--gray-400)]">{label}</dt><dd className="mt-1 text-xl font-bold text-[var(--gray-900)]">{value}</dd></div>;
}

function VersionsLoading() {
  return <div className="divide-y divide-[var(--border-xs)]">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="p-5"><div className="h-5 w-44 animate-pulse rounded-full bg-slate-100" /><div className="mt-3 h-4 w-3/4 animate-pulse rounded-full bg-slate-100" /><div className="mt-3 h-3 w-52 animate-pulse rounded-full bg-slate-100" /></div>)}</div>;
}

function EmptyVersions() {
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><ShieldCheck className="h-12 w-12 text-[var(--gray-300)]" /><h3 className="mt-3 text-lg font-bold text-[var(--gray-900)]">Версий пока нет</h3><p className="mt-2 max-w-md text-sm leading-6 text-[var(--gray-500)]">Версия появится после генерации плана, урока, квиза, ручного редактирования или отката.</p></div>;
}

function RestoreConfirmModal({ version, busy, onCancel, onConfirm }: { version: CourseVersionListItem; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-[28px] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
          <div className="min-w-0"><h2 className="text-lg font-bold text-[var(--gray-900)]">Восстановить версию №{version.version_number}?</h2><p className="mt-2 text-sm leading-6 text-[var(--gray-600)]">{RESTORE_CONFIRMATION_TEXT}</p><div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-[var(--gray-600)]"><b className="text-[var(--gray-900)]">Будет создана новая версия</b> с типом “Восстановлена версия”, а текущий курс перед откатом сохранится как резервная версия.</div></div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-2xl border border-[var(--border-xs)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--gray-700)] transition hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-50">Отмена</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-blue)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Восстановить</button>
        </div>
      </div>
    </div>
  );
}
