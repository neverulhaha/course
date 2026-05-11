import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, GraduationCap, Loader2, Mail, RefreshCw, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { addCourseLearner, listCourseLearners, removeCourseLearner, type CourseLearner } from "@/services/courseEnrollment.service";
import { toUserErrorMessage } from "@/lib/errorMessages";
import { formatRuDateTime } from "@/lib/dateFormat";
import { cn } from "@/app/components/ui/utils";

const FONT = "'Montserrat', sans-serif";

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--gray-150)]">
        <div className="h-full rounded-full bg-[var(--brand-blue)] transition-all" style={{ width: `${safeValue}%` }} />
      </div>
      <span className="min-w-10 text-right text-xs font-extrabold tabular-nums text-[var(--brand-blue)]">{safeValue}%</span>
    </div>
  );
}

function EmptyLearners() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-[var(--border-md)] bg-[var(--bg-surface)] px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[rgba(74,144,226,0.08)] text-[var(--brand-blue)]">
        <GraduationCap className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-xl font-extrabold text-[var(--gray-900)]">Обучающиеся ещё не добавлены</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-relaxed text-[var(--gray-500)]">
        Добавьте зарегистрированного пользователя по email. Он увидит курс в списке доступных курсов и сможет проходить уроки, задания и квизы без доступа к редактору.
      </p>
    </div>
  );
}

function LearnerCard({ learner, removing, onRemove }: { learner: CourseLearner; removing: boolean; onRemove: (learner: CourseLearner) => void | Promise<void> }) {
  const pct = learner.progress?.completionPercent ?? 0;
  const completed = learner.progress?.completedLessonsCount ?? 0;
  const total = learner.progress?.totalLessonsCount ?? 0;
  return (
    <article className="rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(74,144,226,0.08)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--brand-blue)]">
              <GraduationCap className="h-3 w-3" />
              Обучающийся
            </span>
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", learner.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-[var(--gray-100)] text-[var(--gray-500)]")}>
              {learner.status === "active" ? "Активен" : learner.status}
            </span>
          </div>
          <h3 className="truncate text-lg font-extrabold text-[var(--gray-900)]">{learner.name}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--gray-500)]">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{learner.email}</span>
          </p>
          <p className="mt-2 text-xs font-semibold text-[var(--gray-400)]">
            Добавлен: {formatRuDateTime(learner.createdAt)}
          </p>
        </div>

        <div className="w-full md:w-64">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--gray-600)]">
            <span>Прогресс</span>
            <span>{completed}/{total || "—"} уроков</span>
          </div>
          <ProgressBar value={pct} />
          <p className="mt-2 text-right text-[11px] font-semibold text-[var(--gray-400)]">
            {learner.progress?.updatedAt ? `Обновлён: ${formatRuDateTime(learner.progress.updatedAt)}` : "Пока не начинал"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end border-t border-[var(--border-xs)] pt-4">
        <button
          type="button"
          onClick={() => onRemove(learner)}
          disabled={removing}
          className="vs-btn-ghost min-h-10 justify-center text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Убрать доступ
        </button>
      </div>
    </article>
  );
}

export default function CourseLearners() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState("Курс");
  const [learners, setLearners] = useState<CourseLearner[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!courseId) {
      setError("Курс не найден.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await listCourseLearners(courseId);
    setLoading(false);
    if (result.error || !result.data) {
      setLearners([]);
      setError(toUserErrorMessage(result.error, "Не удалось загрузить обучающихся."));
      return;
    }
    setCourseTitle(result.data.course.title);
    setLearners(result.data.learners);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const active = learners.filter((learner) => learner.status === "active").length;
    const started = learners.filter((learner) => (learner.progress?.completionPercent ?? 0) > 0).length;
    const avg = learners.length ? Math.round(learners.reduce((sum, learner) => sum + (learner.progress?.completionPercent ?? 0), 0) / learners.length) : 0;
    return { active, started, avg };
  }, [learners]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) {
      toast.error("Введите email обучающегося");
      return;
    }
    setAdding(true);
    const result = await addCourseLearner(courseId, nextEmail);
    setAdding(false);
    if (result.error || !result.data) {
      toast.error(toUserErrorMessage(result.error, "Не удалось добавить обучающегося."));
      return;
    }
    setEmail("");
    toast.success("Обучающийся добавлен");
    await load();
  };

  const handleRemove = async (learner: CourseLearner) => {
    const confirmed = window.confirm(`Убрать доступ для ${learner.email}? Его прошлый прогресс останется в базе, но курс исчезнет из доступных.`);
    if (!confirmed) return;
    setRemovingUserId(learner.userId);
    const result = await removeCourseLearner(courseId, learner.userId);
    setRemovingUserId(null);
    if (result.error) {
      toast.error(toUserErrorMessage(result.error, "Не удалось убрать доступ."));
      return;
    }
    setLearners((items) => items.filter((item) => item.userId !== learner.userId));
    toast.success("Доступ обучающегося убран");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)]" style={{ fontFamily: FONT }}>
      <header className="border-b border-[var(--border-xs)] bg-[var(--bg-surface)] px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link to={`/app/editor/${courseId}`} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--gray-500)] hover:text-[var(--gray-900)]">
              <ArrowLeft className="h-4 w-4" />
              Назад в редактор
            </Link>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand-blue)]">Доступ к курсу</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--gray-900)]">Обучающиеся</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--gray-500)]">
              Курс «{courseTitle}». Автор сохраняет режим редактирования и прохождения, а добавленные пользователи получают только режим прохождения.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => navigate(`/learn/${courseId}`)} className="vs-btn vs-btn-secondary vs-btn-md min-h-11 justify-center">
              <GraduationCap className="h-4 w-4" />
              Предпросмотр
            </button>
            <button type="button" onClick={load} className="vs-btn-ghost min-h-11 justify-center">
              <RefreshCw className="h-4 w-4" />
              Обновить
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p>{error}</p>
              <button type="button" onClick={load} className="mt-2 font-extrabold text-red-800 underline">Повторить</button>
            </div>
          </div>
        )}

        <section className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5">
            <p className="text-3xl font-extrabold text-[var(--gray-900)]">{stats.active}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--gray-500)]">Активных обучающихся</p>
          </div>
          <div className="rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5">
            <p className="text-3xl font-extrabold text-[var(--gray-900)]">{stats.started}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--gray-500)]">Начали прохождение</p>
          </div>
          <div className="rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5">
            <p className="text-3xl font-extrabold text-[var(--gray-900)]">{stats.avg}%</p>
            <p className="mt-1 text-sm font-semibold text-[var(--gray-500)]">Средний прогресс</p>
          </div>
        </section>

        <form onSubmit={handleAdd} className="mb-6 rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[var(--gray-900)]">
            <UserPlus className="h-4 w-4 text-[var(--brand-blue)]" />
            Добавить обучающегося
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@example.com"
                className="vs-input h-12 w-full rounded-2xl text-sm"
                style={{ paddingLeft: "2.75rem" }}
                disabled={adding}
              />
            </label>
            <button type="submit" disabled={adding} className="vs-btn vs-btn-primary min-h-12 justify-center disabled:cursor-not-allowed disabled:opacity-60">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Добавить
            </button>
          </div>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-[var(--gray-500)]">
            Для MVP обучающийся должен быть уже зарегистрирован в системе. После добавления он увидит курс в своём списке.
          </p>
        </form>

        {loading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] px-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-blue)]" />
            <h2 className="mt-5 text-lg font-extrabold text-[var(--gray-900)]">Загружаем обучающихся</h2>
          </div>
        ) : learners.length === 0 ? (
          <EmptyLearners />
        ) : (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-extrabold text-[var(--gray-900)]">
              <Users className="h-5 w-5 text-[var(--brand-blue)]" />
              Список обучающихся
            </div>
            {learners.map((learner) => (
              <LearnerCard
                key={learner.userId}
                learner={learner}
                removing={removingUserId === learner.userId}
                onRemove={handleRemove}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
