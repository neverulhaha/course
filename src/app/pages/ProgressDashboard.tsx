import { useState } from "react";
import { Link } from "react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  Award,
  Play,
  ArrowRight,
  Zap,
  ChevronRight,
  BarChart2,
  Flame,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────── */

interface CourseProgress {
  id: string;
  title: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastActivity: string;
  quizScores: number[];
  completed?: boolean;
  nextLesson?: string;
}

interface ActivityItem {
  type: "lesson" | "quiz" | "assignment";
  title: string;
  course: string;
  score?: number;
  date: string;
}

interface Achievement {
  emoji: string;
  title: string;
  description: string;
  earned: boolean;
}

/* ─── Mock data ───────────────────────────────────────────── */

const COURSES: CourseProgress[] = [
  {
    id: "1",
    title: "Основы Python для начинающих",
    progress: 35,
    completedLessons: 8,
    totalLessons: 24,
    lastActivity: "Сегодня",
    quizScores: [90, 85, 78],
    nextLesson: "Функции в Python",
  },
  {
    id: "2",
    title: "Введение в Machine Learning",
    progress: 15,
    completedLessons: 4,
    totalLessons: 30,
    lastActivity: "Вчера",
    quizScores: [92, 88],
    nextLesson: "Линейная регрессия",
  },
  {
    id: "3",
    title: "Веб-разработка: HTML, CSS, JavaScript",
    progress: 100,
    completedLessons: 36,
    totalLessons: 36,
    lastActivity: "3 дня назад",
    quizScores: [95, 90, 88, 92, 87],
    completed: true,
  },
];

const ACTIVITY: ActivityItem[] = [
  { type: "lesson",     title: "Переменные и типы данных", course: "Основы Python",    date: "Сегодня, 14:30" },
  { type: "quiz",       title: "Квиз: Введение в Python",  course: "Основы Python",    score: 85, date: "Сегодня, 13:15" },
  { type: "assignment", title: "Первая программа на Python",course: "Основы Python",    date: "Вчера, 16:20" },
  { type: "lesson",     title: "Что такое Machine Learning",course: "Machine Learning", date: "2 дня назад" },
];

const ACHIEVEMENTS: Achievement[] = [
  { emoji: "🎯", title: "Первый курс",  description: "Завершили первый курс",     earned: true  },
  { emoji: "⚡", title: "Отличник",     description: "Средний балл выше 80%",     earned: true  },
  { emoji: "🔥", title: "Серия 7 дней", description: "Занимались 7 дней подряд", earned: false },
  { emoji: "🏆", title: "Мастер",       description: "Завершите 3 курса",         earned: false },
];

const STATS = {
  totalCourses: 3,
  completedCourses: 1,
  totalLessons: 45,
  completedLessons: 12,
  averageScore: 88,
  studyTime: "12 ч",
  streak: 4,
};

/* ─── Small helpers ───────────────────────────────────────── */

const FONT = "'Montserrat', sans-serif";

function scoreColor(s: number) {
  return s >= 85 ? "#2ECC71" : s >= 70 ? "var(--brand-blue)" : "#F1C40F";
}
function scoreBg(s: number) {
  return s >= 85 ? "rgba(46,204,113,0.08)" : s >= 70 ? "rgba(74,144,226,0.08)" : "rgba(241,196,15,0.08)";
}

function ThinBar({ value, color = "var(--brand-blue)", height = 4 }: { value: number; color?: string; height?: number }) {
  return (
    <div
      className="min-w-0 rounded-full w-full overflow-hidden"
      style={{ height: `${height}px`, background: "var(--gray-150)" }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

/* ─── Summary strip ───────────────────────────────────────── */

function SummaryStrip() {
  const pct = Math.round((STATS.completedLessons / STATS.totalLessons) * 100);

  const items = [
    { value: STATS.completedLessons, suffix: `/ ${STATS.totalLessons}`, label: "Уроков пройдено", color: "var(--brand-blue)" },
    { value: STATS.completedCourses, suffix: `/ ${STATS.totalCourses}`, label: "Курсов завершено", color: "#2ECC71" },
    { value: `${STATS.averageScore}%`,  suffix: "",                        label: "Средний балл",     color: "#F1C40F"          },
    { value: STATS.studyTime,           suffix: "",                        label: "Время обучения",   color: "var(--gray-700)"  },
  ];

  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 lg:flex-row lg:items-stretch lg:gap-0 lg:overflow-hidden lg:rounded-xl lg:border lg:border-[var(--border-sm)] lg:bg-[var(--bg-surface)] lg:shadow-[var(--shadow-xs)]">
      {/* Overall progress — full width card on mobile/tablet; strip cell on lg+ */}
      <div
        className="flex flex-col justify-between rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)] sm:p-5 lg:min-w-0 lg:flex-shrink-0 lg:rounded-none lg:border-0 lg:border-r lg:border-[var(--border-xs)] lg:px-5 lg:py-4 lg:shadow-none xl:min-w-[180px] xl:px-6"
      >
        <div className="mb-2 flex flex-wrap items-end gap-x-1 gap-y-0.5">
          <span
            className="text-2xl font-bold tabular-nums leading-none lg:text-[var(--text-2xl)]"
            style={{ color: "var(--brand-blue)" }}
          >
            {pct}%
          </span>
          <span className="text-[11px] font-medium sm:text-[var(--text-xs)]" style={{ color: "var(--gray-500)", marginBottom: "2px" }}>
            общий прогресс
          </span>
        </div>
        <ThinBar value={pct} color="var(--brand-blue)" height={5} />
      </div>

      {/* Stats — 2×2 grid &lt; lg; single row lg+ */}
      <div className="grid grid-cols-2 gap-3 lg:contents">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] p-3.5 shadow-[var(--shadow-xs)] sm:p-4 last:lg:border-r-0 lg:min-w-[100px] lg:flex-1 lg:rounded-none lg:border-0 lg:border-r lg:border-[var(--border-xs)] lg:px-4 lg:py-3.5 lg:shadow-none xl:px-5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0">
                <span
                  className="text-lg font-bold tabular-nums leading-none sm:text-xl lg:text-[var(--text-xl)]"
                  style={{ color: item.color }}
                >
                  {item.value}
                </span>
                {item.suffix && (
                  <span className="text-[10px] font-semibold sm:text-[11px]" style={{ color: "var(--gray-400)" }}>
                    {item.suffix}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] leading-snug sm:text-[11px]" style={{ color: "var(--gray-400)" }}>
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Next step hero card ─────────────────────────────────── */

function NextStepCard() {
  const active = COURSES.find((c) => !c.completed && c.nextLesson);
  if (!active) return null;

  return (
    <div
      className="mb-6 overflow-hidden rounded-2xl sm:mb-8"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid rgba(74,144,226,0.2)",
        boxShadow: "0 1px 16px rgba(74,144,226,0.08)",
      }}
    >
      {/* Accent top bar */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, var(--brand-blue) 0%, rgba(74,144,226,0.3) 100%)" }} />

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5 md:gap-6 md:px-6 md:py-5">
        {/* Play icon */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl max-sm:mx-auto"
          style={{ background: "rgba(74,144,226,0.1)", border: "1px solid rgba(74,144,226,0.15)" }}
        >
          <Play className="h-5 w-5" style={{ color: "var(--brand-blue)" }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 max-sm:text-center">
          <p
            className="mb-1 font-semibold"
            style={{ fontSize: "11px", color: "var(--brand-blue)", letterSpacing: "0.04em" }}
          >
            ПРОДОЛЖИТЬ ОБУЧЕНИЕ
          </p>
          <h3
            className="text-base font-bold leading-tight sm:text-[var(--text-md)]"
            style={{ color: "var(--gray-900)", letterSpacing: "-0.01em" }}
          >
            {active.nextLesson}
          </h3>
          <p className="mt-1 text-[11px] sm:text-[var(--text-xs)]" style={{ color: "var(--gray-400)" }}>
            <span className="block sm:inline">{active.title}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">Урок {active.completedLessons + 1} из {active.totalLessons}</span>
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 sm:hidden">
            <p className="font-bold tabular-nums text-[var(--text-md)]" style={{ color: "var(--brand-blue)" }}>
              {active.progress}%
            </p>
            <span className="text-[11px]" style={{ color: "var(--gray-400)" }}>пройдено</span>
          </div>
        </div>

        {/* Progress + CTA */}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-shrink-0 sm:flex-row sm:items-center sm:gap-4">
          <div className="hidden text-right sm:block">
            <p
              className="font-bold tabular-nums"
              style={{ fontSize: "var(--text-md)", color: "var(--brand-blue)" }}
            >
              {active.progress}%
            </p>
            <p style={{ fontSize: "11px", color: "var(--gray-400)" }}>пройдено</p>
          </div>
          <Link
            to={`/learn/${active.id}`}
            className="vs-btn vs-btn-primary vs-btn-md inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 sm:w-auto"
          >
            Продолжить
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Section header ──────────────────────────────────────── */

function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <h2
        className="text-sm font-bold sm:text-[var(--text-sm)]"
        style={{ color: "var(--gray-900)", letterSpacing: "-0.01em" }}
      >
        {title}
      </h2>
      {action ? <div className="min-w-0 sm:shrink-0">{action}</div> : null}
    </div>
  );
}

/* ─── Course progress card ────────────────────────────────── */

function CourseCard({ course }: { course: CourseProgress }) {
  const barColor = course.completed ? "#2ECC71" : "var(--brand-blue)";
  const avgScore =
    course.quizScores.length > 0
      ? Math.round(course.quizScores.reduce((a, b) => a + b, 0) / course.quizScores.length)
      : null;

  return (
    <div
      className="rounded-2xl p-4 transition-all sm:p-5 md:px-[22px] md:py-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {/* Header row */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            {course.completed ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg font-semibold"
                style={{ fontSize: "11px", padding: "3px 8px", background: "rgba(46,204,113,0.08)", color: "#2ECC71" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                Завершён
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg font-semibold"
                style={{ fontSize: "11px", padding: "3px 8px", background: "rgba(74,144,226,0.08)", color: "#4A90E2" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-blue)]" />
                В процессе
              </span>
            )}
            <span
              className="flex items-center gap-1"
              style={{ fontSize: "11px", color: "var(--gray-400)" }}
            >
              <Clock className="w-3 h-3" />
              {course.lastActivity}
            </span>
          </div>

          <h3
            className="text-[15px] font-bold leading-snug sm:text-[var(--text-md)]"
            style={{ color: "var(--gray-900)", letterSpacing: "-0.01em" }}
          >
            {course.title}
          </h3>
        </div>

        {course.completed && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.12)" }}
          >
            <Award className="w-5 h-5" style={{ color: "#2ECC71" }} />
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: "11px", color: "var(--gray-500)" }}>
            {course.completedLessons} из {course.totalLessons} уроков
          </span>
          <span
            className="font-bold tabular-nums"
            style={{ fontSize: "11px", color: barColor }}
          >
            {course.progress}%
          </span>
        </div>
        <ThinBar value={course.progress} color={barColor} height={5} />
      </div>

      {/* Quiz scores */}
      {course.quizScores.length > 0 && (
        <div
          className="mb-4 flex flex-col gap-2 border-t border-[var(--border-xs)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
        >
          <span className="shrink-0 text-[11px]" style={{ color: "var(--gray-400)" }}>Квизы:</span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:flex-initial">
            {course.quizScores.map((score, i) => (
              <span
                key={i}
                className="rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                style={{
                  color: scoreColor(score),
                  background: scoreBg(score),
                }}
              >
                {score}%
              </span>
            ))}
          </div>
          {avgScore !== null && (
            <span className="text-[11px] sm:ml-auto" style={{ color: "var(--gray-400)" }}>
              сред.{" "}
              <span className="font-bold" style={{ color: scoreColor(avgScore) }}>
                {avgScore}%
              </span>
            </span>
          )}
        </div>
      )}

      {/* Action */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <Link
          to={`/learn/${course.id}`}
          className="vs-btn vs-btn-primary inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 sm:w-auto"
          style={{ padding: "6px 14px", fontSize: "12px" }}
        >
          {course.completed ? "Повторить" : "Продолжить"}
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
        {!course.completed && course.nextLesson && (
          <span className="line-clamp-2 text-[11px] sm:min-w-0 sm:flex-1" style={{ color: "var(--gray-400)" }}>
            Следующий: {course.nextLesson}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Activity feed ───────────────────────────────────────── */

const ACTIVITY_CONFIG = {
  lesson:     { icon: BookOpen,    color: "var(--brand-blue)",  bg: "rgba(74,144,226,0.08)",  label: "Урок"      },
  quiz:       { icon: Target,      color: "#2ECC71",            bg: "rgba(46,204,113,0.08)",   label: "Квиз"      },
  assignment: { icon: BarChart2,   color: "#F1C40F",            bg: "rgba(241,196,15,0.08)",  label: "Задание"   },
};

function ActivityFeed() {
  return (
    <div
      className="rounded-2xl px-4 py-4 sm:px-5 sm:py-[18px]"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <SectionHead title="Последняя активность" />

      <div className="flex flex-col">
        {ACTIVITY.map((item, i) => {
          const cfg = ACTIVITY_CONFIG[item.type];
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className="flex min-w-0 items-start gap-3 py-2.5 touch-manipulation sm:py-2.5"
              style={{
                borderBottom: i < ACTIVITY.length - 1 ? "1px solid var(--border-xs)" : "none",
              }}
            >
              {/* Icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: cfg.bg }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold truncate"
                  style={{ fontSize: "12px", color: "var(--gray-900)", marginBottom: "2px" }}
                >
                  {item.title}
                </p>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "11px", color: "var(--gray-400)" }}>{item.course}</span>
                  {item.score !== undefined && (
                    <span
                      className="font-bold rounded"
                      style={{
                        fontSize: "10px",
                        padding: "1px 5px",
                        color: scoreColor(item.score),
                        background: scoreBg(item.score),
                      }}
                    >
                      {item.score}%
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <span
                className="mt-0.5 max-w-[5.5rem] shrink-0 text-right text-[10px] leading-tight sm:max-w-none"
                style={{ color: "var(--gray-400)" }}
              >
                {item.date.split(",")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Achievements ────────────────────────────────────────── */

function AchievementsCard() {
  return (
    <div
      className="mb-0 rounded-2xl px-4 py-4 sm:px-5 sm:py-[18px]"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <SectionHead title="Достижения" />

      <div className="flex flex-col gap-2 sm:gap-2">
        {ACHIEVEMENTS.map((a) => (
          <div
            key={a.title}
            className="flex min-h-11 items-center gap-3 rounded-xl touch-manipulation"
            style={{
              padding: "10px 12px",
              background: a.earned ? "var(--gray-50)" : "transparent",
              border: a.earned ? "1px solid var(--border-xs)" : "1px solid transparent",
              opacity: a.earned ? 1 : 0.45,
            }}
          >
            <span style={{ fontSize: "20px", lineHeight: 1, filter: a.earned ? "none" : "grayscale(1)" }}>
              {a.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="font-bold truncate"
                style={{ fontSize: "12px", color: "var(--gray-900)" }}
              >
                {a.title}
              </p>
              <p
                className="truncate"
                style={{ fontSize: "11px", color: "var(--gray-400)" }}
              >
                {a.description}
              </p>
            </div>
            {a.earned && (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#2ECC71" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Streak card ─────────────────────────────────────────── */

function StreakCard() {
  return (
    <div
      className="rounded-2xl px-4 py-4 sm:px-5 sm:py-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.12)" }}
        >
          <Flame className="h-5 w-5" style={{ color: "#E74C3C" }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span
              className="text-lg font-bold tabular-nums sm:text-[var(--text-xl)]"
              style={{ color: "var(--gray-900)" }}
            >
              {STATS.streak}
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "var(--gray-500)" }}>дня</span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--gray-400)" }}>текущая серия</p>
        </div>
        <div className="ml-auto flex max-w-full shrink-0 items-end gap-0.5 overflow-x-auto pb-0.5 sm:ml-auto sm:pb-0">
          {[1, 1, 1, 1, 0, 0, 0].map((active, i) => (
            <div
              key={i}
              className="shrink-0 rounded-sm"
              style={{
                width: "8px",
                height: active ? `${12 + i * 2}px` : "8px",
                background: active ? "#E74C3C" : "var(--gray-150)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────── */

function EmptyProgress() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-4 py-16 text-center sm:py-20"
      style={{
        background: "var(--bg-surface)",
        border: "1.5px dashed var(--border-md)",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(74,144,226,0.08)", border: "1px solid rgba(74,144,226,0.15)" }}
      >
        <BookOpen className="w-7 h-7" style={{ color: "var(--brand-blue)" }} />
      </div>
      <h3
        className="mb-2 text-lg font-bold sm:text-[var(--text-xl)]"
        style={{ color: "var(--gray-900)", letterSpacing: "-0.02em" }}
      >
        Нет данных о прогрессе
      </h3>
      <p
        className="mb-8 mx-auto"
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--gray-500)",
          maxWidth: "360px",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        Начните изучать курс, и ваш прогресс, результаты квизов и достижения появятся здесь.
      </p>
      <Link to="/app" className="vs-btn vs-btn-primary vs-btn-md inline-flex min-h-11 w-full max-w-sm touch-manipulation items-center justify-center gap-2 sm:w-auto">
        <BookOpen className="h-4 w-4 shrink-0" />
        Перейти к курсам
      </Link>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */

export default function ProgressDashboard() {
  const [hasProgress] = useState(true);

  return (
    <div className="min-h-dvh min-h-[100vh]" style={{ fontFamily: FONT, background: "var(--bg-page)" }}>

      {/* ── Page header ── */}
      <div
        className="border-b border-[var(--border-xs)] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7 lg:px-8 lg:pb-6 lg:pt-8"
        style={{
          background: "var(--bg-surface)",
        }}
      >
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p
              className="mb-1.5 font-semibold sm:mb-1.5"
              style={{ fontSize: "var(--text-xs)", color: "var(--brand-blue)", letterSpacing: "0.04em" }}
            >
              МОЙ ПРОГРЕСС
            </p>
            <h1
              className="text-[22px] font-bold leading-tight tracking-tight sm:text-2xl lg:text-[var(--text-2xl)] lg:leading-none"
              style={{ color: "var(--gray-900)", letterSpacing: "-0.025em" }}
            >
              Прогресс обучения
            </h1>
            <p
              className="mt-2 max-w-xl text-[11px] leading-relaxed sm:mt-1.5 sm:text-[var(--text-xs)]"
              style={{ color: "var(--gray-400)" }}
            >
              <span className="block sm:inline">{STATS.completedLessons} из {STATS.totalLessons} уроков пройдено</span>
              <span className="hidden sm:inline"> · </span>
              <span className="block sm:inline">{STATS.completedCourses} из {STATS.totalCourses} курсов завершено</span>
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link
              to="/app"
              className="vs-btn vs-btn-secondary vs-btn-md inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 sm:w-auto"
            >
              <Zap className="h-4 w-4 shrink-0" />
              Мои курсы
            </Link>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        {!hasProgress ? (
          <EmptyProgress />
        ) : (
          <>
            {/* Summary strip */}
            <SummaryStrip />

            {/* Next step */}
            <NextStepCard />

            {/* Main + sidebar: single column &lt; lg; two columns lg+ */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
              {/* Left: courses */}
              <div className="min-w-0">
                <SectionHead
                  title="Мои курсы"
                  action={
                    <Link
                      to="/app"
                      className="inline-flex min-h-10 touch-manipulation items-center gap-1 py-1 text-xs font-semibold sm:min-h-0 sm:py-0"
                      style={{ color: "var(--brand-blue)" }}
                    >
                      Все курсы
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                  }
                />
                <div className="flex flex-col gap-3 sm:gap-3.5">
                  {COURSES.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </div>
              </div>

              {/* Right: streak, activity, achievements */}
              <div className="flex min-w-0 flex-col gap-3.5 lg:sticky lg:top-4 lg:self-start">
                <StreakCard />
                <ActivityFeed />
                <AchievementsCard />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
