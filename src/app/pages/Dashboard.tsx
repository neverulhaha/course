import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Plus,
  Search,
  Shield,
  Clock,
  ChevronRight,
  Sparkles,
  FileText,
  Play,
  BookOpen,
  Edit,
  LayoutGrid,
  List,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listDashboardCourses, type DashboardCourse } from "@/services/courseQuery.service";
import { COURSE_STATUS_UI, type CourseStatus } from "@/entities/course/courseStatus";

/* ─── Types ───────────────────────────────────────────────── */

interface Course {
  id: string;
  title: string;
  status: CourseStatus;
  progress: number;
  modules: number;
  lessons: number;
  lastModified: string;
  qaScore: number | null;
}

function mapDashboardCourse(c: DashboardCourse): Course {
  return {
    id: c.id,
    title: c.title,
    status: c.status,
    progress: c.progress,
    modules: c.modules,
    lessons: c.lessons,
    lastModified: c.lastModified,
    qaScore: c.qaScore,
  };
}

/* ─── Tiny helpers ────────────────────────────────────────── */

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
}

function StatusPill({ status }: { status: CourseStatus }) {
  const s = COURSE_STATUS_UI[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg font-semibold"
      style={{
        fontSize: "11px",
        padding: "3px 8px",
        background: s.bg,
        color: s.color,
      }}
    >
      <div
        className="rounded-full flex-shrink-0"
        style={{ width: "5px", height: "5px", background: s.dot }}
      />
      {s.label}
    </span>
  );
}

function QaChip({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold tabular-nums" style={{ fontSize: "11px", color: "var(--gray-400)" }}>
        <Shield className="w-3 h-3" />
        —
      </span>
    );
  }
  const color =
    score >= 85 ? "#2ECC71" :
    score >= 70 ? "var(--brand-blue)" :
    "#F1C40F";
  return (
    <span
      className="inline-flex items-center gap-1 font-bold tabular-nums"
      style={{ fontSize: "11px", color }}
    >
      <Shield className="w-3 h-3" />
      {score}
    </span>
  );
}

function ThinBar({ value, color }: { value: number; color: string }) {
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ height: "3px", background: "var(--gray-150)", flex: 1 }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

/* ─── Summary stats ───────────────────────────────────────── */

function SummaryStrip({ courses }: { courses: Course[] }) {
  const inProgress = courses.filter((c) => c.status !== "ready" && c.status !== "archived").length;
  const ready = courses.filter((c) => c.status === "ready").length;
  const withQa = courses.map((c) => c.qaScore).filter((s): s is number => s != null);
  const avgQa = withQa.length ? Math.round(withQa.reduce((s, c) => s + c, 0) / withQa.length) : 0;

  const stats = [
    { value: courses.length, label: "Курсов",     color: "var(--brand-blue)" },
    { value: inProgress,     label: "В работе",   color: "#F1C40F"           },
    { value: ready,          label: "Готово",      color: "#2ECC71"           },
    { value: avgQa,          label: "Средний QA",  color: "var(--gray-700)"   },
  ];

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden mb-6 sm:mb-8 lg:mb-9"
      style={{
        border: "1px solid var(--border-sm)",
        background: "var(--border-xs)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 sm:gap-3 min-w-0"
          style={{
            padding: "clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 20px)",
            background: "var(--bg-surface)",
          }}
        >
          <span
            className="font-bold tabular-nums leading-none shrink-0"
            style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", color: s.color }}
          >
            {s.value}
          </span>
          <span
            className="min-w-0 leading-snug"
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--gray-500)",
              lineHeight: "var(--leading-snug)",
            }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Section header ──────────────────────────────────────── */

function SectionHead({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 min-w-0">
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <h2
          className="font-bold truncate"
          style={{ fontSize: "var(--text-sm)", color: "var(--gray-900)", letterSpacing: "-0.01em" }}
        >
          {title}
        </h2>
        {count !== undefined && (
          <span
            className="rounded-md font-bold tabular-nums shrink-0"
            style={{
              fontSize: "11px",
              padding: "1px 6px",
              background: "var(--gray-100)",
              color: "var(--gray-500)",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {action && <div className="w-full sm:w-auto min-w-0 flex sm:justify-end">{action}</div>}
    </div>
  );
}

/* ─── Recent course card ──────────────────────────────────── */

function RecentCard({ course }: { course: Course }) {
  const navigate = useNavigate();
  const barColor =
    course.progress === 100 ? "#2ECC71" : "var(--brand-blue)";

  return (
    <div
      className="group rounded-xl sm:rounded-2xl transition-all cursor-pointer min-w-0"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
        boxShadow: "var(--shadow-xs)",
        padding: "clamp(16px, 3vw, 22px) clamp(16px, 3vw, 24px)",
      }}
      onClick={() => navigate(`/app/editor/${course.id}`)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-xs)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)";
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <StatusPill status={course.status} />
        <span
          className="flex items-center gap-1"
          style={{ fontSize: "11px", color: "var(--gray-400)", flexShrink: 0 }}
        >
          <Clock className="w-3 h-3" />
          {course.lastModified}
        </span>
      </div>

      {/* Title */}
      <h3
        className="font-bold leading-snug mb-4 group-hover:text-[var(--brand-blue)] transition-colors line-clamp-3 sm:line-clamp-2"
        style={{ fontSize: "clamp(0.9375rem, 2.5vw, 1.0625rem)", color: "var(--gray-900)", letterSpacing: "-0.01em" }}
      >
        {course.title}
      </h3>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-1.5">
          <ThinBar value={course.progress} color={barColor} />
          <span
            className="font-bold tabular-nums flex-shrink-0"
            style={{ fontSize: "11px", color: barColor }}
          >
            {course.progress}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "11px", color: "var(--gray-400)" }}>
            {course.modules} мод. · {course.lessons} ур.
          </span>
          <QaChip score={course.qaScore} />
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-4 touch-manipulation"
        style={{ borderTop: "1px solid var(--border-xs)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          to={`/app/editor/${course.id}`}
          className="vs-btn vs-btn-primary w-full min-[400px]:w-auto justify-center min-h-10 sm:min-h-0"
          style={{ padding: "5px 12px", fontSize: "11px" }}
        >
          <Edit className="w-3 h-3 shrink-0" />
          Редактировать
        </Link>
        <Link
          to={`/app/qa/${course.id}`}
          className="vs-btn-ghost flex-1 min-[400px]:flex-none min-h-10 sm:min-h-0 justify-center"
          style={{ padding: "5px 10px", fontSize: "11px" }}
        >
          <Shield className="w-3 h-3 shrink-0" />
          QA
        </Link>
        <Link
          to={`/learn/${course.id}`}
          className="vs-btn-ghost flex-1 min-[400px]:flex-none min-h-10 sm:min-h-0 justify-center"
          style={{ padding: "5px 10px", fontSize: "11px" }}
        >
          <Play className="w-3 h-3 shrink-0" />
          Учиться
        </Link>
      </div>
    </div>
  );
}

/* ─── Course row (compact list) ───────────────────────────── */

function CourseRow({ course }: { course: Course }) {
  const navigate = useNavigate();
  const barColor =
    course.progress === 100 ? "#2ECC71" : "var(--brand-blue)";

  return (
    <div
      className="group flex flex-wrap items-center gap-x-3 gap-y-2.5 md:flex-nowrap md:items-center md:gap-4 rounded-xl transition-all cursor-pointer min-w-0 touch-manipulation"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
        padding: "10px 12px",
      }}
      onClick={() => navigate(`/app/editor/${course.id}`)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)";
        (e.currentTarget as HTMLElement).style.background = "var(--gray-150)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-xs)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--gray-100)" }}
      >
        <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--gray-500)" }} />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0 basis-[calc(100%-2.75rem)] sm:basis-auto md:min-w-[120px]">
        <p
          className="font-semibold line-clamp-2 sm:truncate group-hover:text-[var(--brand-blue)] transition-colors"
          style={{ fontSize: "var(--text-sm)", color: "var(--gray-900)", marginBottom: "3px" }}
        >
          {course.title}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={course.status} />
          <span
            className="flex items-center gap-1"
            style={{ fontSize: "11px", color: "var(--gray-400)" }}
          >
            <Clock className="w-3 h-3 shrink-0" />
            {course.lastModified}
          </span>
        </div>
      </div>

      {/* Очень узкие экраны: прогресс + QA отдельной строкой */}
      <div className="flex sm:hidden w-full basis-full items-center gap-2 pl-10">
        <ThinBar value={course.progress} color={barColor} />
        <span
          className="font-bold tabular-nums flex-shrink-0"
          style={{ fontSize: "11px", color: barColor, minWidth: "28px" }}
        >
          {course.progress}%
        </span>
        <QaChip score={course.qaScore} />
      </div>

      {/* Modules / lessons — tablet+ */}
      <div
        className="hidden sm:block text-center flex-shrink-0"
        style={{ minWidth: "72px" }}
      >
        <p
          className="font-semibold tabular-nums"
          style={{ fontSize: "var(--text-xs)", color: "var(--gray-700)" }}
        >
          {course.lessons}
        </p>
        <p style={{ fontSize: "11px", color: "var(--gray-400)" }}>уроков</p>
      </div>

      {/* Progress — desktop */}
      <div
        className="hidden md:flex items-center gap-2 flex-shrink-0"
        style={{ width: "100px" }}
      >
        <ThinBar value={course.progress} color={barColor} />
        <span
          className="font-bold tabular-nums flex-shrink-0"
          style={{ fontSize: "11px", color: barColor, minWidth: "28px" }}
        >
          {course.progress}%
        </span>
      </div>

      {/* QA — sm+ */}
      <div className="hidden sm:block flex-shrink-0">
        <QaChip score={course.qaScore} />
      </div>

      {/* Actions: всегда видны на touch; hover на md+ */}
      <div
        className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity w-full sm:w-auto justify-end sm:justify-start basis-full sm:basis-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          to={`/app/editor/${course.id}`}
          className="vs-btn-ghost min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 justify-center"
          style={{ padding: "4px 8px", fontSize: "11px" }}
        >
          <Edit className="w-3 h-3" />
        </Link>
        <Link
          to={`/app/qa/${course.id}`}
          className="vs-btn-ghost min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 justify-center"
          style={{ padding: "4px 8px", fontSize: "11px" }}
        >
          <Shield className="w-3 h-3" />
        </Link>
        <Link
          to={`/learn/${course.id}`}
          className="vs-btn-ghost min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 justify-center"
          style={{ padding: "4px 8px", fontSize: "11px" }}
        >
          <Play className="w-3 h-3" />
        </Link>
      </div>

      <ChevronRight
        className="hidden md:block w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--brand-blue)" }}
      />
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────── */

function NoCourses({ searchQuery }: { searchQuery: string }) {
  if (searchQuery) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center rounded-xl sm:rounded-2xl py-10 px-4 sm:py-16 sm:px-6 min-w-0"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-xs)",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "var(--gray-100)" }}
        >
          <Search className="w-5 h-5" style={{ color: "var(--gray-400)" }} />
        </div>
        <p
          className="font-bold mb-1 text-balance px-2"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.0625rem)", color: "var(--gray-900)" }}
        >
          Ничего не найдено
        </p>
        <p className="text-pretty px-2" style={{ fontSize: "var(--text-sm)", color: "var(--gray-400)" }}>
          По запросу «{searchQuery}» курсы не найдены
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center text-center rounded-xl sm:rounded-2xl py-12 px-4 sm:py-20 sm:px-6 min-w-0"
      style={{
        background: "var(--bg-surface)",
        border: "1.5px dashed var(--border-md)",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(74,144,226,0.08)", border: "1px solid rgba(74,144,226,0.15)" }}
      >
        <Sparkles className="w-7 h-7" style={{ color: "var(--brand-blue)" }} />
      </div>
      <h3
        className="font-bold mb-2 text-balance px-2"
        style={{ fontSize: "clamp(1.125rem, 3vw, 1.375rem)", color: "var(--gray-900)", letterSpacing: "-0.02em" }}
      >
        Курсов пока нет
      </h3>
      <p
        className="mb-6 sm:mb-8 mx-auto text-pretty px-2"
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--gray-500)",
          maxWidth: "360px",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        Создайте первый курс с помощью ИИ. Задайте тему — и уже через минуту получите готовую структуру.
      </p>
      <div className="flex flex-col w-full max-w-sm sm:max-w-none sm:flex-row items-stretch sm:items-center justify-center gap-3 touch-manipulation">
        <Link
          to="/app/create"
          className="vs-btn vs-btn-primary vs-btn-md w-full sm:w-auto justify-center min-h-11"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Создать курс
        </Link>
        <Link
          to="/app/create-source"
          className="vs-btn vs-btn-secondary vs-btn-md w-full sm:w-auto justify-center min-h-11"
        >
          <FileText className="w-4 h-4 shrink-0" />
          По источникам
        </Link>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */

export default function Dashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const { courses: rows, error } = await listDashboardCourses(user.id);
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setCourses([]);
        return;
      }
      setLoadError(null);
      setCourses(rows.map(mapDashboardCourse));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? courses.filter((c) => c.title.toLowerCase().includes(q)) : courses;
  }, [searchQuery, courses]);

  const recent = courses.slice(0, 2);
  const showEmpty = courses.length === 0 && !loadError;

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ fontFamily: "'Montserrat', sans-serif", background: "var(--bg-page)" }}
    >
      {/* ── Page header ── */}
      <div
        className="border-b"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-xs)",
          padding: "clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px) clamp(14px, 2.5vw, 24px)",
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0">
          <div className="min-w-0 flex-1">
            {/* Greeting */}
            <p
              className="font-semibold"
              style={{ fontSize: "var(--text-xs)", color: "var(--brand-blue)", marginBottom: "6px", letterSpacing: "0.04em" }}
            >
              {getGreeting()}
            </p>

            {/* Title */}
            <h1
              className="font-bold tracking-tight leading-tight text-balance"
              style={{
                fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
                color: "var(--gray-900)",
                letterSpacing: "-0.025em",
              }}
            >
              Мои курсы
            </h1>

            {/* Meta */}
            {courses.length > 0 && (
              <p
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5"
                style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)" }}
              >
                <span>{courses.length} курса</span>
                <span aria-hidden>·</span>
                <span>Последнее изменение: {courses[0]?.lastModified ?? "—"}</span>
              </p>
            )}
            {loadError && (
              <p className="mt-1.5 text-[var(--text-xs)] text-red-600">Не удалось загрузить курсы: {loadError}</p>
            )}
          </div>

          {/* Actions — на мобиле полная ширина, primary сверху */}
          <div className="flex flex-col-reverse sm:flex-row w-full lg:w-auto gap-2 shrink-0 touch-manipulation">
            <Link
              to="/app/create-source"
              className="vs-btn vs-btn-secondary vs-btn-md w-full sm:w-auto justify-center min-h-11 sm:min-h-0"
            >
              <FileText className="w-4 h-4 shrink-0" />
              По источникам
            </Link>
            <Link
              to="/app/create"
              className="vs-btn vs-btn-primary vs-btn-md w-full sm:w-auto justify-center min-h-11 sm:min-h-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Создать курс
            </Link>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div
        className="w-full max-w-[1600px] mx-auto"
        style={{ padding: "clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)" }}
      >
        {showEmpty ? (
          <NoCourses searchQuery="" />
        ) : loadError && courses.length === 0 ? (
          <NoCourses searchQuery="" />
        ) : (
          <>
            {/* Summary strip */}
            <SummaryStrip courses={courses} />

            {/* Recent / continue working */}
            <section className="mb-8 sm:mb-10 lg:mb-12">
              <SectionHead
                title="Продолжить работу"
                count={recent.length}
              />
              <div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-3.5 min-w-0"
              >
                {recent.map((c) => (
                  <RecentCard key={c.id} course={c} />
                ))}

                {/* Quick start card */}
                <Link
                  to="/app/create"
                  className="group rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-3 transition-all min-h-[160px] sm:min-h-[180px] touch-manipulation"
                  style={{
                    background: "transparent",
                    border: "1.5px dashed var(--border-md)",
                    padding: "clamp(16px, 3vw, 22px) clamp(16px, 3vw, 24px)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--brand-blue)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(74,144,226,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[rgba(74,144,226,0.12)]"
                    style={{ background: "var(--gray-100)" }}
                  >
                    <Plus className="w-5 h-5" style={{ color: "var(--gray-400)" }} />
                  </div>
                  <div className="text-center">
                    <p
                      className="font-semibold"
                      style={{ fontSize: "var(--text-sm)", color: "var(--gray-600)" }}
                    >
                      Новый курс
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--gray-400)", marginTop: "2px" }}>
                      С нуля или по источникам
                    </p>
                  </div>
                </Link>
              </div>
            </section>

            {/* All courses */}
            <section>
              <SectionHead
                title="Все курсы"
                count={filtered.length}
                action={
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto min-w-0">
                    {/* Search */}
                    <div className="relative w-full sm:w-auto min-w-0 flex-1 sm:flex-none sm:max-w-[200px]">
                      <Search
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                        style={{
                          left: "10px",
                          color: "var(--gray-400)",
                        }}
                      />
                      <input
                        type="search"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="vs-input w-full min-w-0 touch-manipulation"
                        style={{
                          paddingLeft: "30px",
                          height: "36px",
                          fontSize: "max(14px, 11px)",
                        }}
                      />
                    </div>

                    {/* View mode toggle */}
                    <div
                      className="flex rounded-lg overflow-hidden shrink-0 self-start sm:self-auto"
                      style={{ border: "1px solid var(--border-sm)" }}
                    >
                      {(["list", "cards"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setViewMode(mode)}
                          className="flex items-center justify-center transition-colors touch-manipulation min-h-9 min-w-9"
                          style={{
                            width: "36px",
                            height: "36px",
                            background: viewMode === mode ? "var(--brand-blue)" : "var(--gray-100)",
                            color: viewMode === mode ? "#FFFFFF" : "var(--gray-500)",
                            border: "none",
                            cursor: "pointer",
                          }}
                          aria-pressed={viewMode === mode}
                        >
                          {mode === "list" ? (
                            <List className="w-3.5 h-3.5" />
                          ) : (
                            <LayoutGrid className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                }
              />

              {filtered.length === 0 ? (
                <NoCourses searchQuery={searchQuery} />
              ) : viewMode === "list" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filtered.map((c) => (
                    <CourseRow key={c.id} course={c} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-3.5 min-w-0">
                  {filtered.map((c) => (
                    <RecentCard key={c.id} course={c} />
                  ))}
                </div>
              )}

              {/* Add new row */}
              {filtered.length > 0 && viewMode === "list" && (
                <Link
                  to="/app/create"
                  className="group flex items-center justify-center gap-2 rounded-xl mt-2 transition-all min-h-11 touch-manipulation"
                  style={{
                    padding: "11px 14px",
                    border: "1.5px dashed var(--border-md)",
                    color: "var(--gray-400)",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--brand-blue)";
                    (e.currentTarget as HTMLElement).style.color = "var(--brand-blue)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(74,144,226,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)";
                    (e.currentTarget as HTMLElement).style.color = "var(--gray-400)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Создать новый курс
                </Link>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
