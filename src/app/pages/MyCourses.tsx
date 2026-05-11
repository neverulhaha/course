import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownAZ,
  BookOpen,
  CalendarClock,
  Clock3,
  Edit3,
  FileText,
  Filter,
  GraduationCap,
  History,
  LayoutGrid,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  SortDesc,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/providers/ProfileProvider";
import { canCreateCourses, normalizeProfileRole } from "@/lib/profileRole";
import { COURSE_STATUS_UI, type CourseStatus } from "@/entities/course/courseStatus";
import { listMyCourses, type MyCourseListItem } from "@/services/courseQuery.service";
import { deleteCourse } from "@/services/courseDelete.service";
import { buildCoursePlaybackPath } from "@/services/coursePlayback.service";
import { cn } from "@/app/components/ui/utils";
import { toUserErrorMessage } from "@/lib/errorMessages";

type StatusFilter = "all" | "draft" | "plan" | "partial" | "ready" | "error";
type SortMode = "newest" | "oldest" | "recently_opened" | "title";
type ViewMode = "grid" | "list";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "draft", label: "Черновик" },
  { value: "plan", label: "План готов" },
  { value: "partial", label: "Частично заполнен" },
  { value: "ready", label: "Готов" },
  { value: "error", label: "Ошибка" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Новые" },
  { value: "oldest", label: "Старые" },
  { value: "recently_opened", label: "Недавно открытые" },
  { value: "title", label: "По названию" },
];

function pluralRu(count: number, one: string, few: string, many: string) {
  const abs = Math.abs(count);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function normalizeForSearch(value: string) {
  return value.trim().toLowerCase();
}

function statusMatchesFilter(status: CourseStatus, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "error") return status === "error" || status === "failed";
  return status === filter;
}

function statusFilterCount(courses: MyCourseListItem[], filter: StatusFilter) {
  return courses.filter((course) => statusMatchesFilter(course.status, filter)).length;
}

function timestamp(value: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getContinueHref(course: MyCourseListItem) {
  return buildCoursePlaybackPath(course.id, course.lastOpenedLessonId ?? course.nextRecommendedLessonId);
}

function scoreTone(score: number | null) {
  if (score == null) return "text-[var(--gray-400)]";
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-lime-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-600";
}

function StatusPill({ status }: { status: CourseStatus }) {
  const meta = COURSE_STATUS_UI[status] ?? COURSE_STATUS_UI.draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ color: meta.color, background: meta.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 100 ? "#22c55e" : "var(--brand-blue)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--gray-150)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
      <span className="min-w-10 text-right text-xs font-extrabold tabular-nums" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4">
      <p className="text-2xl font-extrabold leading-none text-[var(--gray-900)]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--gray-500)]">{label}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] px-6 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-blue)]" />
      <h2 className="mt-5 text-lg font-extrabold text-[var(--gray-900)]">Загружаем курсы</h2>
      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-[var(--gray-500)]">
        Собираем список, прогресс, структуру и последние открытые уроки.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying: boolean }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-red-100 bg-red-50/70 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-red-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-lg font-extrabold text-red-900">Список курсов не загрузился</h2>
      <p className="mt-2 max-w-lg text-sm font-semibold leading-relaxed text-red-700">{message}</p>
      <button type="button" onClick={onRetry} disabled={retrying} className="vs-btn vs-btn-primary mt-6 min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-60">
        {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Повторить
      </button>
    </div>
  );
}

function EmptyCoursesState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--border-md)] bg-[var(--bg-surface)] px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[rgba(74,144,226,0.08)] text-[var(--brand-blue)]">
        <GraduationCap className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-[var(--gray-900)]">{canCreate ? "У вас пока нет курсов" : "Вам пока не назначили курсы"}</h2>
      <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-[var(--gray-500)]">
        {canCreate
          ? "Создайте первый курс вручную или на основе источника. После генерации он появится в этом списке."
          : "Когда преподаватель или автор добавит вас в курс, он появится здесь для прохождения."}
      </p>
      {canCreate && (
        <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link to="/app/create" className="vs-btn vs-btn-primary vs-btn-md min-h-11 justify-center">
            <Plus className="h-4 w-4" />
            Создать курс
          </Link>
          <Link to="/app/create-source" className="vs-btn vs-btn-secondary vs-btn-md min-h-11 justify-center">
            <FileText className="h-4 w-4" />
            По источникам
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptySearchState({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gray-100)] text-[var(--gray-400)]">
        <Search className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-lg font-extrabold text-[var(--gray-900)]">По вашему запросу ничего не найдено</h2>
      <p className="mt-2 max-w-md text-sm font-medium text-[var(--gray-500)]">
        Запрос: «{query.trim()}». Попробуйте изменить поиск, фильтр или сортировку.
      </p>
      <button type="button" onClick={onReset} className="vs-btn vs-btn-secondary mt-6 min-h-11 justify-center">
        <X className="h-4 w-4" />
        Сбросить фильтры
      </button>
    </div>
  );
}

function DeleteConfirmModal({
  course,
  deleting,
  onCancel,
  onConfirm,
}: {
  course: MyCourseListItem | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!course) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border-sm)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Trash2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-[var(--gray-900)]">Удалить курс?</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--gray-600)]">
              Курс «{course.title}» будет удалён вместе со структурой и материалами. Это действие нельзя отменить.
            </p>
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800">
              История прохождения и попытки квизов зависят от backend-правил удаления. Перед удалением убедитесь, что курс больше не нужен.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={deleting} className="vs-btn vs-btn-secondary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-60">
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="vs-btn min-h-11 justify-center bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseActions({ course, onDelete }: { course: MyCourseListItem; onDelete: (course: MyCourseListItem) => void }) {
  const continueHref = getContinueHref(course);
  const isOwner = course.accessRole === "owner";
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" onClick={(event) => event.stopPropagation()}>
      <Link to={continueHref} className="vs-btn vs-btn-primary min-h-10 flex-1 justify-center sm:flex-none" title="Открыть последний или следующий урок">
        <Play className="h-4 w-4" />
        Продолжить
      </Link>
      {isOwner ? (
        <>
          <Link to={`/app/editor/${course.id}`} className="vs-btn vs-btn-secondary min-h-10 flex-1 justify-center sm:flex-none">
            <Edit3 className="h-4 w-4" />
            Редактировать
          </Link>
          <Link to={`/app/learners/${course.id}`} className="vs-btn-ghost min-h-10 flex-1 justify-center sm:flex-none">
            <Users className="h-4 w-4" />
            Ученики
          </Link>
          <Link to={`/app/versions/${course.id}`} className="vs-btn-ghost min-h-10 flex-1 justify-center sm:flex-none">
            <History className="h-4 w-4" />
            Версии
          </Link>
          <button type="button" onClick={() => onDelete(course)} className="vs-btn-ghost min-h-10 flex-1 justify-center text-red-600 hover:bg-red-50 sm:flex-none">
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        </>
      ) : (
        <Link to={`/learn/${course.id}`} className="vs-btn-ghost min-h-10 flex-1 justify-center sm:flex-none">
          <BookOpen className="h-4 w-4" />
          Проходить
        </Link>
      )}
    </div>
  );
}

function CourseCard({ course, onDelete }: { course: MyCourseListItem; onDelete: (course: MyCourseListItem) => void }) {
  const navigate = useNavigate();
  const lessonLabel = course.lessonCount > 0
    ? `${course.lessonCount} ${pluralRu(course.lessonCount, "урок", "урока", "уроков")}`
    : "уроков нет";
  const moduleLabel = course.moduleCount > 0
    ? `${course.moduleCount} ${pluralRu(course.moduleCount, "модуль", "модуля", "модулей")}`
    : "модулей нет";

  return (
    <article
      className="group flex min-w-0 cursor-pointer flex-col rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5 transition hover:border-[var(--border-md)] hover:shadow-sm"
      onClick={() => navigate(course.accessRole === "owner" ? `/app/editor/${course.id}` : `/learn/${course.id}`)}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={course.status} />
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gray-100)] px-2.5 py-1 text-[11px] font-bold text-[var(--gray-600)]">
            {course.accessRole === "owner" ? <UserCheck className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
            {course.accessRole === "owner" ? "Автор" : "Обучающийся"}
          </span>
        </div>
        <span className={cn("text-xs font-extrabold tabular-nums", scoreTone(course.qaScore))}>
          QA {course.qaScore ?? "—"}
        </span>
      </div>

      <h3 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-[var(--gray-900)] group-hover:text-[var(--brand-blue)]">
        {course.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-[var(--gray-500)]">
        {course.topic}
      </p>

      <div className="mt-5 space-y-2 rounded-2xl bg-[var(--gray-100)] p-4">
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--gray-600)]">
          <span>Прогресс прохождения</span>
          <span>{course.completedLessons}/{course.totalLessons || course.lessonCount}</span>
        </div>
        <ProgressBar value={course.progressPercent} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-[var(--gray-500)]">
        <div className="rounded-2xl border border-[var(--border-xs)] p-3">
          <p className="font-extrabold text-[var(--gray-900)]">{moduleLabel}</p>
          <p className="mt-1">Структура</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-xs)] p-3">
          <p className="font-extrabold text-[var(--gray-900)]">{lessonLabel}</p>
          <p className="mt-1">Наполнение: {course.filledLessonCount}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs font-semibold text-[var(--gray-500)]">
        <p className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          Создан: <span className="text-[var(--gray-800)]">{course.createdAtLabel}</span>
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          Обновлён: <span className="text-[var(--gray-800)]">{course.updatedAtLabel}</span>
        </p>
        <p className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          Последний урок: <span className="truncate text-[var(--gray-800)]">{course.lastOpenedLessonTitle ?? course.nextRecommendedLessonTitle ?? "ещё не открыт"}</span>
        </p>
      </div>

      <div className="mt-auto pt-5">
        <CourseActions course={course} onDelete={onDelete} />
      </div>
    </article>
  );
}

function CourseRow({ course, onDelete }: { course: MyCourseListItem; onDelete: (course: MyCourseListItem) => void }) {
  const navigate = useNavigate();
  return (
    <article
      className="group flex cursor-pointer flex-col gap-4 rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--border-md)] hover:bg-[var(--gray-100)] sm:flex-row sm:items-center"
      onClick={() => navigate(course.accessRole === "owner" ? `/app/editor/${course.id}` : `/learn/${course.id}`)}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(74,144,226,0.08)] text-[var(--brand-blue)]">
        <BookOpen className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusPill status={course.status} />
          <span className="rounded-full bg-[var(--gray-150)] px-2.5 py-1 text-[11px] font-bold text-[var(--gray-500)]">
            {course.moduleCount} мод. · {course.lessonCount} ур.
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gray-150)] px-2.5 py-1 text-[11px] font-bold text-[var(--gray-500)]">
            {course.accessRole === "owner" ? <UserCheck className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
            {course.accessRole === "owner" ? "Автор" : "Обучающийся"}
          </span>
        </div>
        <h3 className="truncate text-base font-extrabold text-[var(--gray-900)] group-hover:text-[var(--brand-blue)]">{course.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--gray-500)]">{course.topic}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[var(--gray-500)]">
          <span>Создан: {course.createdAtLabel}</span>
          <span>Обновлён: {course.updatedAtLabel}</span>
          <span>Последний урок: {course.lastOpenedLessonTitle ?? course.nextRecommendedLessonTitle ?? "—"}</span>
        </div>
      </div>
      <div className="w-full shrink-0 sm:w-44">
        <ProgressBar value={course.progressPercent} />
        <p className="mt-1 text-right text-[11px] font-bold text-[var(--gray-500)]">
          {course.completedLessons}/{course.totalLessons || course.lessonCount} уроков · QA {course.qaScore ?? "—"}
        </p>
      </div>
      <div className="w-full sm:w-auto">
        <CourseActions course={course} onDelete={onDelete} />
      </div>
    </article>
  );
}

export default function MyCourses() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const profileRole = normalizeProfileRole(profile?.app_role);
  const canCreate = canCreateCourses(profileRole);
  const [courses, setCourses] = useState<MyCourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [courseToDelete, setCourseToDelete] = useState<MyCourseListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCourses = useCallback(async () => {
    if (profileLoading) {
      setLoading(true);
      return;
    }
    if (!user?.id) {
      setLoading(false);
      setError("Войдите в систему.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await listMyCourses(user.id, { profileRole });
    if (result.error) {
      setCourses([]);
      setError(toUserErrorMessage(result.error, "Не удалось загрузить курсы. Попробуйте ещё раз."));
    } else {
      setCourses(result.courses);
    }
    setLoading(false);
  }, [user?.id, profileLoading, profileRole]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const filteredCourses = useMemo(() => {
    const q = normalizeForSearch(search);
    const items = courses.filter((course) => {
      const matchesQuery = !q || normalizeForSearch(`${course.title} ${course.topic}`).includes(q);
      const matchesStatus = statusMatchesFilter(course.status, statusFilter);
      return matchesQuery && matchesStatus;
    });

    return [...items].sort((a, b) => {
      if (sortMode === "oldest") return timestamp(a.createdAt) - timestamp(b.createdAt);
      if (sortMode === "recently_opened") {
        const byOpen = timestamp(b.lastOpenedAt) - timestamp(a.lastOpenedAt);
        return byOpen || timestamp(b.updatedAt) - timestamp(a.updatedAt);
      }
      if (sortMode === "title") return a.title.localeCompare(b.title, "ru");
      return timestamp(b.createdAt) - timestamp(a.createdAt);
    });
  }, [courses, search, sortMode, statusFilter]);

  const stats = useMemo(() => {
    const ready = courses.filter((course) => course.status === "ready").length;
    const inProgress = courses.filter((course) => !["ready", "archived", "failed", "error"].includes(course.status)).length;
    const avgProgress = courses.length ? Math.round(courses.reduce((sum, course) => sum + course.progressPercent, 0) / courses.length) : 0;
    const totalLessons = courses.reduce((sum, course) => sum + course.lessonCount, 0);
    return { ready, inProgress, avgProgress, totalLessons };
  }, [courses]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSortMode("newest");
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    if (courseToDelete.accessRole !== "owner") {
      setDeleting(false);
      toast.error("Удалять курс может только автор.");
      return;
    }
    const result = await deleteCourse(courseToDelete.id);
    setDeleting(false);
    if (result.error) {
      toast.error(toUserErrorMessage(result.error, "Не удалось удалить курс. Попробуйте ещё раз."));
      return;
    }
    setCourses((items) => items.filter((item) => item.id !== courseToDelete.id));
    toast.success("Курс удалён");
    setCourseToDelete(null);
  };

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  return (
    <div className="min-h-screen bg-[var(--bg-page)]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <DeleteConfirmModal
        course={courseToDelete}
        deleting={deleting}
        onCancel={() => {
          if (!deleting) setCourseToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <header className="border-b border-[var(--border-xs)] bg-[var(--bg-surface)] px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand-blue)]">Рабочая область</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--gray-900)]">Мои курсы</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--gray-500)]">
              {canCreate
                ? "Управляйте своими курсами, проходите личные и назначенные курсы, открывайте редактор и прогресс из одного места."
                : "Проходите курсы, в которые вас добавили преподаватели или авторы."}
            </p>
          </div>
          {canCreate && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/app/create-source" className="vs-btn vs-btn-secondary vs-btn-md min-h-11 justify-center">
                <FileText className="h-4 w-4" />
                По источникам
              </Link>
              <Link to="/app/create" className="vs-btn vs-btn-primary vs-btn-md min-h-11 justify-center">
                <Plus className="h-4 w-4" />
                Создать курс
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={loadCourses} retrying={loading} />
        ) : courses.length === 0 ? (
          <EmptyCoursesState canCreate={canCreate} />
        ) : (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Всего курсов" value={courses.length} />
              <Metric label="В работе" value={stats.inProgress} />
              <Metric label="Готово" value={stats.ready} />
              <Metric label="Средний прогресс" value={`${stats.avgProgress}%`} />
            </section>

            <section className="mb-6 rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 shadow-sm">
              <div className="grid gap-3 xl:grid-cols-[1fr_220px_220px_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Поиск по названию или теме"
                    className="vs-input h-12 w-full rounded-2xl text-sm"
                    style={{ paddingLeft: "2.75rem" }}
                  />
                </label>

                <label className="relative block">
                  <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="vs-input h-12 w-full appearance-none rounded-2xl text-sm font-semibold"
                    style={{ paddingLeft: "2.75rem", paddingRight: "2.25rem" }}
                  >
                    {STATUS_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="relative block">
                  {sortMode === "title" ? (
                    <ArrowDownAZ className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
                  ) : (
                    <SortDesc className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
                  )}
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="vs-input h-12 w-full appearance-none rounded-2xl text-sm font-semibold"
                    style={{ paddingLeft: "2.75rem", paddingRight: "2.25rem" }}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-between gap-2 xl:justify-end">
                  {hasActiveFilters && (
                    <button type="button" onClick={resetFilters} className="vs-btn-ghost h-12 justify-center px-4 text-xs">
                      <X className="h-4 w-4" />
                      Сбросить
                    </button>
                  )}
                  <div className="flex overflow-hidden rounded-2xl border border-[var(--border-sm)]">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cn("flex h-12 w-12 items-center justify-center transition", viewMode === "grid" ? "bg-[var(--brand-blue)] text-white" : "bg-[var(--gray-100)] text-[var(--gray-500)]")}
                      aria-label="Карточки"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={cn("flex h-12 w-12 items-center justify-center transition", viewMode === "list" ? "bg-[var(--brand-blue)] text-white" : "bg-[var(--gray-100)] text-[var(--gray-500)]")}
                      aria-label="Список"
                    >
                      <BookOpen className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_FILTERS.map((option) => {
                  const active = statusFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatusFilter(option.value)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-extrabold transition",
                        active ? "bg-[var(--brand-blue)] text-white" : "bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-150)]",
                      )}
                    >
                      {option.label} · {option.value === "all" ? courses.length : statusFilterCount(courses, option.value)}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[var(--gray-900)]">Список курсов</h2>
                <p className="text-sm font-semibold text-[var(--gray-500)]">
                  Показано {filteredCourses.length} из {courses.length}; всего уроков: {stats.totalLessons}
                </p>
              </div>
              <button type="button" onClick={loadCourses} className="vs-btn-ghost min-h-10 justify-center">
                <RefreshCw className="h-4 w-4" />
                Обновить
              </button>
            </div>

            {filteredCourses.length === 0 ? (
              <EmptySearchState query={search || STATUS_FILTERS.find((item) => item.value === statusFilter)?.label || "фильтр"} onReset={resetFilters} />
            ) : viewMode === "grid" ? (
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} onDelete={setCourseToDelete} />
                ))}
              </section>
            ) : (
              <section className="space-y-3">
                {filteredCourses.map((course) => (
                  <CourseRow key={course.id} course={course} onDelete={setCourseToDelete} />
                ))}
              </section>
            )}

            {canCreate && (
              <div className="mt-6 flex items-center justify-center rounded-3xl border-2 border-dashed border-[var(--border-md)] p-5">
                <Link to="/app/create" className="vs-btn vs-btn-secondary min-h-11 justify-center">
                  <Plus className="h-4 w-4" />
                  Создать ещё один курс
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
