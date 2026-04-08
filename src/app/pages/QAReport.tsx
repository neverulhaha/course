import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  Shield,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit2,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Play,
  XCircle,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────── */

type Severity = "high" | "medium" | "low";
type QaStatus = "not-run" | "running" | "passed" | "has-issues";

interface QaIssue {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  lesson: string;
  module: string;
  courseId: string;
  description: string;
  suggestion: string;
}

interface QaCategory { name: string; score: number }

/* ─── Mock data ───────────────────────────────────────────── */

const COURSE_TITLE = "Основы Python для начинающих";

const CATEGORIES: QaCategory[] = [
  { name: "Структура курса",       score: 92 },
  { name: "Связность контента",    score: 88 },
  { name: "Понятность изложения",  score: 85 },
  { name: "Соответствие уровню",   score: 90 },
  { name: "Соответствие целям",    score: 78 },
  { name: "Подтверждение источн.", score: 75 },
];

const ISSUES: QaIssue[] = [
  {
    id: "i1", severity: "high", category: "Источники",
    title: "Несоответствие версий Python",
    lesson: "Урок 2: Установка Python", module: "Модуль 1: Введение",
    courseId: "1",
    description: "Информация о версиях Python не соответствует источнику python_guide.pdf. В источнике — версия 3.11, в курсе — 3.10.",
    suggestion: "Обновите информацию о версии согласно исходному материалу",
  },
  {
    id: "i2", severity: "medium", category: "Связность",
    title: "Слабый переход между уроками",
    lesson: "Урок 3: Переменные и типы данных", module: "Модуль 1: Введение",
    courseId: "1",
    description: "Переход от урока 2 к уроку 3 недостаточно плавный. Отсутствует связующий абзац.",
    suggestion: "Добавьте вводный параграф с примером из предыдущего урока",
  },
  {
    id: "i3", severity: "low", category: "Примеры",
    title: "Недостаточно практических примеров",
    lesson: "Урок 4: Условные операторы", module: "Модуль 2: Управляющие конструкции",
    courseId: "1",
    description: "Текущий набор примеров ограничен базовыми случаями. Рекомендуется добавить примеры с реальными сценариями.",
    suggestion: "Добавьте 2–3 примера с реальными сценариями использования",
  },
];

const RECOMMENDATIONS = [
  "Добавить больше практических примеров в уроки 1–3",
  "Улучшить связность между модулями 1 и 2",
  "Проверить соответствие терминологии во всех уроках",
  "Добавить промежуточные квизы после каждого модуля",
];

/* ─── Constants ───────────────────────────────────────────── */

const FONT = "'Montserrat', sans-serif";

const SEVERITY_CFG = {
  high:   { label: "Критично",  color: "#E74C3C", bg: "rgba(231,76,60,0.04)",  border: "rgba(231,76,60,0.16)",  icon: AlertTriangle },
  medium: { label: "Важно",     color: "#F1C40F", bg: "rgba(241,196,15,0.04)", border: "rgba(241,196,15,0.16)", icon: AlertCircle   },
  low:    { label: "Замечание", color: "#F1C40F", bg: "rgba(241,196,15,0.04)",  border: "rgba(241,196,15,0.14)",  icon: AlertCircle   },
} as const;

function scoreLabel(s: number) {
  if (s >= 90) return { label: "Отлично",          color: "#2ECC71" };
  if (s >= 80) return { label: "Хорошо",            color: "var(--brand-blue)" };
  if (s >= 70) return { label: "Удовлетворительно", color: "#F1C40F" };
  return             { label: "Требует доработки", color: "#E74C3C" };
}

function catColor(s: number) {
  if (s >= 88) return "#2ECC71";
  if (s >= 80) return "var(--brand-blue)";
  if (s >= 70) return "#F1C40F";
  return "#E74C3C";
}

/* ─── Sub-components ──────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3 text-[9px] font-extrabold uppercase tracking-widest sm:mb-3.5"
      style={{
        fontFamily: FONT,
        color: "var(--gray-400)",
      }}
    >
      {children}
    </p>
  );
}

/* Score summary */
function ScoreSummary({ score, lastCheck }: { score: number; lastCheck: string }) {
  const { label, color } = scoreLabel(score);

  return (
    <div
      className="mb-5 grid grid-cols-1 gap-5 rounded-[18px] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)] sm:p-5 lg:grid-cols-[minmax(0,auto)_1fr] lg:gap-7 lg:p-6"
      style={{ fontFamily: FONT }}
    >
      {/* Left: score number */}
      <div
        className="mx-auto flex w-full max-w-[220px] flex-col items-center justify-center rounded-[14px] px-5 py-4 sm:max-w-none sm:px-6 lg:mx-0 lg:min-w-[120px]"
        style={{
          background: `${color === "var(--brand-blue)" ? "rgba(74,144,226,0.06)" : `${color}08`}`,
          border: `1px solid ${color === "var(--brand-blue)" ? "rgba(74,144,226,0.15)" : `${color}20`}`,
        }}
      >
        <span
          className="text-[40px] leading-none tracking-tight sm:text-5xl lg:text-[52px]"
          style={{
            fontFamily: FONT, fontWeight: 800, color,
          }}
        >
          {score}
        </span>
        <span
          style={{
            fontFamily: FONT, fontWeight: 700,
            fontSize: "11px", color, marginTop: 6,
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: FONT, fontSize: "10px",
            color: "var(--gray-400)", marginTop: 4,
          }}
        >
          из 100
        </span>
      </div>

      {/* Right: categories */}
      <div className="min-w-0">
        <SectionTitle>Критерии оценки</SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2">
          {CATEGORIES.map((cat) => {
            const c = catColor(cat.score);
            return (
              <div key={cat.name}>
                <div
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT, fontWeight: 600,
                      fontSize: "11px", color: "var(--gray-700)",
                    }}
                  >
                    {cat.name}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT, fontWeight: 800,
                      fontSize: "11px", color: c, minWidth: 24,
                      textAlign: "right",
                    }}
                  >
                    {cat.score}
                  </span>
                </div>
                <div
                  style={{
                    height: 4, borderRadius: 99,
                    background: "var(--gray-100)", overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%", borderRadius: 99,
                      width: `${cat.score}%`,
                      background: c,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p
          style={{
            fontFamily: FONT, fontSize: "10px",
            color: "var(--gray-400)", marginTop: 12,
          }}
        >
          Последняя проверка: {lastCheck}
        </p>
      </div>
    </div>
  );
}

/* Single issue card */
function IssueCard({ issue }: { issue: QaIssue }) {
  const [dismissed, setDismissed] = useState(false);
  const cfg = SEVERITY_CFG[issue.severity];
  const Icon = cfg.icon;

  if (dismissed) return null;

  return (
    <div
      className="rounded-r-xl rounded-tl-none rounded-bl-none p-3.5 sm:p-4 sm:pr-[18px]"
      style={{
        background: cfg.bg,
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 3,
        borderTopStyle: "solid",
        borderRightStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderTopColor: cfg.border,
        borderRightColor: cfg.border,
        borderBottomColor: cfg.border,
        borderLeftColor: cfg.color,
        fontFamily: FONT,
      }}
    >
      {/* Top row */}
      <div className="mb-2.5 flex flex-col gap-3 sm:mb-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 pr-1 sm:gap-2.5">
          {/* Severity badge + title */}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 6,
                  fontFamily: FONT, fontWeight: 800, fontSize: "9px",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  background: `${cfg.color}14`, color: cfg.color,
                }}
              >
                <Icon style={{ width: 10, height: 10 }} />
                {cfg.label}
              </span>
              <span
                style={{
                  fontFamily: FONT, fontWeight: 700, fontSize: "10px",
                  color: "var(--gray-400)", letterSpacing: "0.03em",
                }}
              >
                {issue.category}
              </span>
            </div>

            <p
              className="mb-1 text-sm font-bold tracking-tight text-[var(--gray-900)] sm:text-[14px]"
              style={{ fontFamily: FONT }}
            >
              {issue.title}
            </p>

            {/* Location breadcrumb */}
            <div
              className="flex flex-wrap items-center gap-1 text-[11px] text-[var(--gray-500)]"
              style={{ fontFamily: FONT }}
            >
              <span className="min-w-0 break-words">{issue.module}</span>
              <ChevronRight className="size-2.5 shrink-0 text-[var(--gray-400)]" />
              <span className="min-w-0 break-words font-semibold text-[var(--gray-700)]">{issue.lesson}</span>
            </div>
          </div>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex size-10 shrink-0 touch-manipulation items-center justify-center self-end rounded-md sm:size-9 sm:self-start"
          style={{
            border: "none", cursor: "pointer",
            background: "transparent", color: "var(--gray-400)",
            transition: "all 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.06)";
            e.currentTarget.style.color = "var(--gray-700)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--gray-400)";
          }}
          title="Игнорировать"
        >
          <XCircle style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: FONT, fontSize: "13px",
          color: "var(--gray-700)", lineHeight: 1.6,
          marginBottom: 8,
        }}
      >
        {issue.description}
      </p>

      {/* Suggestion */}
      <div
        className="mb-3 flex items-start gap-2 rounded-lg border border-[rgba(74,144,226,0.12)] bg-[rgba(74,144,226,0.05)] px-3 py-2 sm:mb-3 sm:px-3 sm:py-2"
      >
        <Sparkles style={{ width: 12, height: 12, color: "var(--brand-blue)", flexShrink: 0, marginTop: 2 }} />
        <p
          style={{
            fontFamily: FONT, fontSize: "12.5px",
            color: "var(--gray-700)", lineHeight: 1.5, margin: 0,
          }}
        >
          <span style={{ fontWeight: 700 }}>Рекомендация: </span>
          {issue.suggestion}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <Link
          to={`/app/editor/${issue.courseId}`}
          className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold text-white sm:w-auto sm:px-3 sm:py-1.5 sm:text-[11.5px]"
          style={{
            fontFamily: FONT,
            background: cfg.color,
            textDecoration: "none", transition: "opacity 0.12s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          <Edit2 style={{ width: 12, height: 12 }} />
          Исправить
        </Link>

        <button
          type="button"
          className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-[var(--border-sm)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--gray-700)] sm:w-auto sm:px-3 sm:py-1.5 sm:text-[11.5px]"
          style={{
            fontFamily: FONT,
            cursor: "pointer", transition: "all 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--brand-blue)";
            e.currentTarget.style.color = "var(--brand-blue)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-sm)";
            e.currentTarget.style.color = "var(--gray-700)";
          }}
        >
          <RefreshCw style={{ width: 11, height: 11 }} />
          Перегенерировать
        </button>
      </div>
    </div>
  );
}

/* Issues list */
function IssueList({ issues }: { issues: QaIssue[] }) {
  const sorted = [...issues].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const countBySeverity = {
    high:   issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low:    issues.filter((i) => i.severity === "low").length,
  };

  return (
    <div
      className="mb-5 overflow-hidden rounded-[18px] border border-[var(--border-xs)] bg-[var(--bg-surface)] shadow-[var(--shadow-xs)]"
      style={{ fontFamily: FONT }}
    >
      {/* List header */}
      <div
        className="flex flex-col gap-3 border-b border-[var(--border-xs)] bg-[var(--gray-50)] px-4 py-3.5 sm:flex-row sm:items-end sm:justify-between sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <SectionTitle>Замечания</SectionTitle>
          <div className="-mt-1 flex flex-wrap gap-1.5 sm:mb-0 sm:mt-0 sm:gap-1.5">
            {(["high", "medium", "low"] as Severity[]).map((s) => {
              const cnt = countBySeverity[s];
              if (!cnt) return null;
              const { color, label } = SEVERITY_CFG[s];
              return (
                <span
                  key={s}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 6,
                    fontFamily: FONT, fontWeight: 700, fontSize: "10px",
                    background: `${color}10`, color,
                  }}
                >
                  {cnt} {label.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
        <span
          className="shrink-0 text-xs font-bold text-[var(--gray-500)] sm:mb-3.5"
          style={{ fontFamily: FONT }}
        >
          {issues.length} замечания
        </span>
      </div>

      {/* Issue items */}
      <div className="flex flex-col gap-2.5 p-4 sm:gap-2.5 sm:p-5">
        {sorted.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

/* Recommendations */
function Recommendations({ items }: { items: string[] }) {
  return (
    <div
      className="mb-5 rounded-[18px] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)] sm:p-5"
      style={{ fontFamily: FONT }}
    >
      <SectionTitle>Рекомендации</SectionTitle>
      <div className="flex flex-col gap-2 sm:gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "10px 12px", borderRadius: 10,
              background: "var(--gray-50)",
              border: "1px solid var(--border-xs)",
            }}
          >
            <span
              style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: "rgba(74,144,226,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONT, fontWeight: 800, fontSize: "10px",
                color: "var(--brand-blue)",
              }}
            >
              {i + 1}
            </span>
            <p
              style={{
                fontFamily: FONT, fontSize: "13px",
                color: "var(--gray-700)", lineHeight: 1.5, margin: 0,
              }}
            >
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Passed state */
function PassedState({ courseId }: { courseId?: string }) {
  return (
    <div
      className="flex flex-col items-center rounded-[18px] border border-[var(--border-xs)] bg-[var(--bg-surface)] px-4 py-12 text-center shadow-[var(--shadow-xs)] sm:px-8 sm:py-16"
      style={{ fontFamily: FONT }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: 18, marginBottom: 20,
          background: "rgba(46,204,113,0.08)",
          border: "1px solid rgba(46,204,113,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <CheckCircle2 style={{ width: 32, height: 32, color: "#2ECC71" }} />
      </div>
      <h3
        className="mb-2.5 text-lg font-extrabold tracking-tight text-[var(--gray-900)] sm:text-[22px]"
        style={{ fontFamily: FONT }}
      >
        Курс выглядит отлично
      </h3>
      <p
        className="mb-7 max-w-sm text-sm leading-relaxed text-[var(--gray-500)] sm:mb-7 sm:max-w-[380px] sm:text-sm"
        style={{ fontFamily: FONT }}
      >
        Замечаний не найдено. Качество контента соответствует всем критериям.
      </p>
      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to={`/app/editor/${courseId}`}
          className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-bold text-white sm:w-auto sm:px-[18px]"
          style={{
            fontFamily: FONT,
            background: "var(--brand-blue)",
            textDecoration: "none",
          }}
        >
          <Edit2 className="size-3.5 shrink-0" />
          Открыть редактор
        </Link>
        <button
          type="button"
          className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-[10px] border border-[var(--border-sm)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-bold text-[var(--gray-700)] sm:w-auto sm:px-[18px]"
          style={{
            fontFamily: FONT,
            cursor: "pointer",
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          Проверить снова
        </button>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */

export default function QAReport() {
  const { courseId } = useParams();
  const [qaStatus] = useState<QaStatus>("has-issues");

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: FONT, background: "var(--bg-page)" }}>

      {/* Page header */}
      <div
        className="border-b border-[var(--border-xs)] bg-[var(--bg-surface)] px-4 py-4 sm:px-6 sm:py-5 lg:px-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <Link
              to={`/app/editor/${courseId}`}
              className="mb-2 inline-flex min-h-9 touch-manipulation items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-400)] no-underline transition-colors hover:text-[var(--brand-blue)]"
              style={{ fontFamily: FONT }}
            >
              <ArrowLeft className="size-3.5 shrink-0" />
              Назад к редактору
            </Link>

            <div className="flex items-start gap-2.5 sm:items-center sm:gap-2.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] sm:size-[36px]"
                style={{ background: "rgba(74,144,226,0.1)" }}
              >
                <Shield className="size-[18px] text-[var(--brand-blue)]" />
              </div>
              <div className="min-w-0">
                <h1
                  className="text-lg font-extrabold leading-none tracking-tight text-[var(--gray-900)] sm:text-xl"
                  style={{ fontFamily: FONT, marginBottom: 4 }}
                >
                  QA-отчёт
                </h1>
                <p className="text-[11px] leading-snug text-[var(--gray-500)] sm:text-xs" style={{ fontFamily: FONT }}>
                  <span className="block sm:inline">{COURSE_TITLE}</span>
                  <span className="hidden sm:inline"> · </span>
                  <span className="mt-0.5 block sm:mt-0 sm:inline">Проверка от 31 марта, 14:30</span>
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <Link
              to={`/app/editor/${courseId}`}
              className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-[var(--border-sm)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--gray-700)] no-underline transition-colors hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-xs"
              style={{ fontFamily: FONT }}
            >
              <Edit2 className="size-3.5 shrink-0" />
              Открыть редактор
            </Link>

            <button
              type="button"
              className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg border-none px-4 py-2.5 text-xs font-bold text-white sm:min-h-0 sm:px-4 sm:py-2 sm:text-xs"
              style={{
                fontFamily: FONT,
                background: "var(--brand-blue)",
                cursor: "pointer", transition: "opacity 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Play className="size-3.5 shrink-0" />
              Проверить снова
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
        {qaStatus === "passed" ? (
          <PassedState courseId={courseId} />
        ) : (
          <>
            <ScoreSummary score={mockQAReport.overallScore} lastCheck={mockQAReport.lastCheck} />
            <IssueList issues={ISSUES} />
            <Recommendations items={RECOMMENDATIONS} />
          </>
        )}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
const mockQAReport = {
  overallScore: 87,
  lastCheck: "31 марта, 14:30",
};
