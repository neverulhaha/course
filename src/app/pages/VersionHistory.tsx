import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  History,
  RotateCcw,
  GitCompare,
  Clock,
  FileText,
  Edit3,
  CheckCircle2,
  Layers,
  Sparkles,
  X,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Shield,
} from "lucide-react";

/* ─── Constants ───────────────────────────────────────────── */

const FONT = "'Montserrat', sans-serif";
const COURSE_TITLE = "Основы Python для начинающих";

/* ─── Types ───────────────────────────────────────────────── */

type ChangeType =
  | "creation"
  | "content"
  | "structure"
  | "quiz"
  | "qa"
  | "rollback"
  | "generation";

interface Version {
  id: string;
  date: string;
  type: ChangeType;
  description: string;
  author: string;
  changes: { added: number; modified: number; deleted: number };
  qaScore: number;
  isCurrent?: boolean;
}

/* ─── Mock data ───────────────────────────────────────────── */

const VERSIONS: Version[] = [
  {
    id: "v1.5", date: "31 марта, 14:30",
    type: "content", isCurrent: true,
    description: "Обновлён урок «Переменные и типы данных» — добавлены 3 примера, улучшены объяснения",
    author: "Иван Петров",
    changes: { added: 3, modified: 1, deleted: 0 },
    qaScore: 87,
  },
  {
    id: "v1.4", date: "30 марта, 16:45",
    type: "quiz",
    description: "Добавлены 2 новых вопроса в квиз модуля 1, обновлены объяснения к ответам",
    author: "Иван Петров",
    changes: { added: 2, modified: 3, deleted: 0 },
    qaScore: 85,
  },
  {
    id: "v1.3", date: "29 марта, 11:20",
    type: "structure",
    description: "Добавлен новый урок «Работа со словарями» в модуль 2",
    author: "Иван Петров",
    changes: { added: 1, modified: 0, deleted: 0 },
    qaScore: 84,
  },
  {
    id: "v1.2", date: "28 марта, 09:15",
    type: "qa",
    description: "Исправлены замечания QA: опечатки в уроках 1–3, улучшена формулировка целей",
    author: "Иван Петров",
    changes: { added: 0, modified: 5, deleted: 0 },
    qaScore: 82,
  },
  {
    id: "v1.1", date: "27 марта, 18:30",
    type: "rollback",
    description: "Откат к v1.0 из-за некорректной генерации контента в модуле 3",
    author: "Система",
    changes: { added: 0, modified: 0, deleted: 4 },
    qaScore: 80,
  },
  {
    id: "v1.0", date: "27 марта, 15:00",
    type: "creation",
    description: "Первая версия курса создана на основе источников",
    author: "Иван Петров",
    changes: { added: 12, modified: 0, deleted: 0 },
    qaScore: 80,
  },
];

/* ─── Type visual config ──────────────────────────────────── */

const TYPE_CFG: Record<
  ChangeType,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  creation:  { label: "Создание",   color: "#2ECC71", bg: "rgba(46,204,113,0.08)",   icon: Sparkles  },
  content:   { label: "Контент",    color: "#4A90E2", bg: "rgba(74,144,226,0.08)",  icon: FileText  },
  structure: { label: "Структура",  color: "#9B59B6", bg: "rgba(155,89,182,0.08)",  icon: Layers    },
  quiz:      { label: "Квиз",       color: "#4A90E2", bg: "rgba(74,144,226,0.08)",   icon: CheckCircle2 },
  qa:        { label: "QA-проверка",color: "#F1C40F", bg: "rgba(241,196,15,0.08)",   icon: Shield    },
  rollback:  { label: "Откат",      color: "#E74C3C", bg: "rgba(231,76,60,0.08)",   icon: RotateCcw },
  generation:{ label: "Генерация",  color: "#4A90E2", bg: "rgba(74,144,226,0.08)",  icon: Sparkles  },
};

/* ─── Small helpers ───────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2.5 text-[9px] font-extrabold uppercase tracking-widest sm:mb-3"
      style={{
        fontFamily: FONT,
        color: "var(--gray-400)",
      }}
    >
      {children}
    </p>
  );
}

function TypeBadge({ type }: { type: ChangeType }) {
  const cfg = TYPE_CFG[type];
  const Icon = cfg.icon;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "2px 9px", borderRadius: 7,
        fontFamily: FONT, fontWeight: 700, fontSize: "10px",
        background: cfg.bg, color: cfg.color,
      }}
    >
      <Icon style={{ width: 10, height: 10 }} />
      {cfg.label}
    </span>
  );
}

function ChangePills({ changes }: { changes: Version["changes"] }) {
  const pills = [
    { value: changes.added,    symbol: "+", color: "#2ECC71", bg: "rgba(46,204,113,0.07)",  label: "добавлено" },
    { value: changes.modified, symbol: "~", color: "#4A90E2", bg: "rgba(74,144,226,0.07)", label: "изменено"  },
    { value: changes.deleted,  symbol: "−", color: "#E74C3C", bg: "rgba(231,76,60,0.07)",  label: "удалено"   },
  ].filter((p) => p.value > 0);

  if (!pills.length) return null;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {pills.map((p) => (
        <span
          key={p.symbol}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 6,
            fontFamily: FONT, fontWeight: 700, fontSize: "10px",
            background: p.bg, color: p.color,
          }}
        >
          {p.symbol}{p.value} {p.label}
        </span>
      ))}
    </div>
  );
}

/* ─── Single version card ─────────────────────────────────── */

function VersionCard({
  version,
  isLast,
  onCompare,
  onRestore,
}: {
  version: Version;
  isLast: boolean;
  onCompare: (v: Version) => void;
  onRestore: (v: Version) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = TYPE_CFG[version.type];

  return (
    <div className="flex gap-0" style={{ fontFamily: FONT }}>
      {/* Timeline column */}
      <div
        className="flex w-8 shrink-0 flex-col items-center pt-1 sm:w-10"
      >
        {/* Node */}
        <div
          style={{
            width: 18, height: 18, borderRadius: "50%",
            flexShrink: 0,
            background: version.isCurrent ? "var(--brand-blue)" : "var(--bg-surface)",
            border: `2px solid ${version.isCurrent ? "var(--brand-blue)" : "var(--border-sm)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1, position: "relative",
          }}
        >
          {version.isCurrent && (
            <div
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--bg-surface)",
              }}
            />
          )}
          {!version.isCurrent && (
            <div
              style={{
                width: 7, height: 7, borderRadius: "50%",
                background: cfg.color,
              }}
            />
          )}
        </div>

        {/* Connector line */}
        {!isLast && (
          <div
            style={{
              flex: 1, width: 1,
              background: "var(--border-xs)",
              marginTop: 6, marginBottom: 0,
            }}
          />
        )}
      </div>

      {/* Card */}
      <div
        className={`min-w-0 flex-1 overflow-hidden rounded-[14px] ml-3 sm:ml-4 ${isLast ? "mb-0" : "mb-4"}`}
        style={{
          background: "var(--bg-surface)",
          border: version.isCurrent
            ? "1px solid rgba(74,144,226,0.3)"
            : "1px solid var(--border-xs)",
          boxShadow: hovered ? "0 4px 18px rgba(0,0,0,0.07)" : "var(--shadow-xs)",
          transition: "all 0.15s",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Current accent top bar */}
        {version.isCurrent && (
          <div
            style={{
              height: 3,
              background: "var(--brand-blue)",
            }}
          />
        )}

        <div className="p-3.5 sm:p-4 sm:px-[18px]">
          {/* Top row */}
          <div className="mb-2.5 flex flex-col gap-2.5 sm:mb-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2">
              <span
                style={{
                  fontFamily: FONT, fontWeight: 800,
                  fontSize: "15px", color: "var(--gray-900)",
                  letterSpacing: "-0.01em",
                }}
              >
                {version.id}
              </span>

              {version.isCurrent && (
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "2px 9px", borderRadius: 7,
                    fontFamily: FONT, fontWeight: 800, fontSize: "10px",
                    background: "rgba(74,144,226,0.1)", color: "var(--brand-blue)",
                  }}
                >
                  <div
                    style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "var(--brand-blue)",
                    }}
                  />
                  Текущая
                </span>
              )}

              <TypeBadge type={version.type} />
            </div>

            {/* QA score */}
            <span
              className="shrink-0 self-start rounded-md px-2 py-0.5 text-[11px] font-bold sm:self-auto"
              style={{
                fontFamily: FONT,
                color: version.qaScore >= 85 ? "#2ECC71" : version.qaScore >= 75 ? "#F1C40F" : "#E74C3C",
                background: version.qaScore >= 85
                  ? "rgba(46,204,113,0.07)"
                  : version.qaScore >= 75
                  ? "rgba(241,196,15,0.07)"
                  : "rgba(231,76,60,0.07)",
              }}
            >
              QA {version.qaScore}
            </span>
          </div>

          {/* Description */}
          <p
            className="mb-2.5 text-[13px] leading-relaxed text-[var(--gray-700)] sm:text-[13.5px]"
            style={{ fontFamily: FONT }}
          >
            {version.description}
          </p>

          {/* Meta row */}
          <div className="mb-3 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontFamily: FONT, fontSize: "11px", color: "var(--gray-500)",
              }}
            >
              <Clock style={{ width: 11, height: 11 }} />
              {version.date}
            </span>
            <span
              style={{
                fontFamily: FONT, fontSize: "11px", color: "var(--gray-500)",
              }}
            >
              {version.author}
            </span>
            <ChangePills changes={version.changes} />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            {!version.isCurrent && (
              <>
                <button
                  type="button"
                  onClick={() => onCompare(version)}
                  className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-[var(--border-sm)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--gray-700)] sm:min-h-0 sm:w-auto sm:px-3 sm:py-1.5 sm:text-[11.5px]"
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
                  <GitCompare style={{ width: 12, height: 12 }} />
                  Сравнить
                </button>

                <button
                  type="button"
                  onClick={() => onRestore(version)}
                  className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-[rgba(74,144,226,0.15)] bg-[rgba(74,144,226,0.07)] px-3 py-2.5 text-xs font-semibold text-[var(--brand-blue)] sm:min-h-0 sm:w-auto sm:px-3 sm:py-1.5 sm:text-[11.5px]"
                  style={{
                    fontFamily: FONT,
                    cursor: "pointer", transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(74,144,226,0.13)";
                    e.currentTarget.style.borderColor = "rgba(74,144,226,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(74,144,226,0.07)";
                    e.currentTarget.style.borderColor = "rgba(74,144,226,0.15)";
                  }}
                >
                  <RotateCcw style={{ width: 12, height: 12 }} />
                  Восстановить
                </button>
              </>
            )}

            {version.isCurrent && (
              <span
                style={{
                  fontFamily: FONT, fontSize: "11px",
                  color: "var(--gray-400)", fontStyle: "italic",
                }}
              >
                Это активная версия курса
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stats sidebar ───────────────────────────────────────── */

function StatsSidebar({ courseId }: { courseId?: string }) {
  const current = VERSIONS.find((v) => v.isCurrent)!;

  const typeCount = VERSIONS.reduce<Record<string, number>>((acc, v) => {
    acc[v.type] = (acc[v.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="flex flex-col gap-3.5 lg:sticky lg:top-20 lg:gap-3.5"
    >
      {/* Stats card */}
      <div
        className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)] sm:p-5"
        style={{ fontFamily: FONT }}
      >
        <SectionLabel>Текущая версия</SectionLabel>

        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px", borderRadius: 12,
            background: "rgba(74,144,226,0.06)",
            border: "1px solid rgba(74,144,226,0.15)",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--brand-blue)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 style={{ width: 18, height: 18, color: "white" }} />
          </div>
          <div>
            <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: "16px", color: "var(--gray-900)" }}>
              {current.id}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "11px", color: "var(--gray-500)", marginTop: 1 }}>
              {current.date}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Всего версий",   value: String(VERSIONS.length) },
            { label: "QA-оценка",      value: `${current.qaScore}/100` },
            { label: "Автор",          value: current.author },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", borderRadius: 9,
                background: "var(--gray-50)",
                border: "1px solid var(--border-xs)",
              }}
            >
              <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: "11.5px", color: "var(--gray-600)" }}>
                {label}
              </span>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "12px", color: "var(--gray-900)" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Type legend */}
      <div
        className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)] sm:p-5"
        style={{ fontFamily: FONT }}
      >
        <SectionLabel>Типы изменений</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(Object.entries(typeCount) as [ChangeType, number][]).map(([type, count]) => {
            const cfg = TYPE_CFG[type];
            const Icon = cfg.icon;
            return (
              <div
                key={type}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "7px 10px", borderRadius: 9,
                  background: cfg.bg,
                }}
              >
                <Icon style={{ width: 13, height: 13, color: cfg.color, flexShrink: 0 }} />
                <span
                  style={{
                    flex: 1, fontFamily: FONT, fontWeight: 600,
                    fontSize: "12px", color: "var(--gray-800)",
                  }}
                >
                  {cfg.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT, fontWeight: 800, fontSize: "11px",
                    color: cfg.color,
                  }}
                >
                  ×{count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div
        className="rounded-2xl border border-[rgba(74,144,226,0.14)] bg-[rgba(74,144,226,0.04)] p-4 sm:p-[18px]"
        style={{ fontFamily: FONT }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <History style={{ width: 14, height: 14, color: "var(--brand-blue)" }} />
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: "12px", color: "var(--gray-900)" }}>
            Как работают версии
          </span>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "12px", color: "var(--gray-600)", lineHeight: 1.6, marginBottom: 10 }}>
          Каждое сохранение курса создаёт версию. Вы можете восстановить любую — это безопасно и не удаляет историю.
        </p>
        <Link
          to={`/app/editor/${courseId}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontFamily: FONT, fontWeight: 700, fontSize: "11.5px",
            color: "var(--brand-blue)", textDecoration: "none",
            transition: "opacity 0.12s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          Вернуться к редактору
          <ChevronRight style={{ width: 12, height: 12 }} />
        </Link>
      </div>
    </div>
  );
}

/* ─── Compare modal ───────────────────────────────────────── */

const COMPARE_CHANGES = [
  {
    kind: "added", label: "Добавлено",
    color: "#2ECC71", bg: "rgba(46,204,113,0.05)", border: "rgba(46,204,113,0.15)",
    title: "Модуль 1, Урок 3: Блок «Примеры использования переменных»",
    detail: "Добавлен новый текстовый блок с тремя практическими примерами использования переменных в Python.",
  },
  {
    kind: "modified", label: "Изменено",
    color: "#4A90E2", bg: "rgba(74,144,226,0.05)", border: "rgba(74,144,226,0.15)",
    title: "Модуль 1, Урок 3: Цель урока",
    before: "Познакомить с переменными",
    after:  "Познакомить с переменными и типами данных в Python, научить применять их на практике",
  },
];

function CompareModal({
  version,
  onClose,
}: {
  version: Version;
  onClose: () => void;
}) {
  const current = VERSIONS.find((v) => v.isCurrent)!;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4 sm:px-6"
      style={{ fontFamily: FONT }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[20px] bg-[var(--bg-surface)] shadow-2xl sm:max-h-[88vh] sm:rounded-[20px]"
      >
        {/* Modal header */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-xs)] px-4 py-3.5 sm:px-5 sm:py-4"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: "rgba(74,144,226,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <GitCompare style={{ width: 16, height: 16, color: "var(--brand-blue)" }} />
            </div>
            <div>
              <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: "14px", color: "var(--gray-900)", lineHeight: 1 }}>
                Сравнение версий
              </p>
              <p style={{ fontFamily: FONT, fontSize: "11px", color: "var(--gray-500)", marginTop: 2 }}>
                {current.id} → {version.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border-none sm:size-[30px]"
            style={{
              background: "none", cursor: "pointer",
              color: "var(--gray-400)", transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gray-100)";
              e.currentTarget.style.color = "var(--gray-700)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color = "var(--gray-400)";
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Version labels */}
        <div
          className="grid shrink-0 grid-cols-1 gap-3 border-b border-[var(--border-xs)] px-4 py-3 sm:grid-cols-2 sm:gap-3 sm:px-5 sm:py-4"
        >
          {[
            { v: current, label: "Текущая" },
            { v: version, label: "Выбранная" },
          ].map(({ v, label }) => (
            <div
              key={v.id}
              style={{
                padding: "12px 14px", borderRadius: 12,
                background: v.isCurrent ? "rgba(74,144,226,0.06)" : "var(--gray-50)",
                border: `1px solid ${v.isCurrent ? "rgba(74,144,226,0.18)" : "var(--border-xs)"}`,
              }}
            >
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 6 }}>
                {label}
              </p>
              <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: "16px", color: "var(--gray-900)" }}>
                {v.id}
              </p>
              <p style={{ fontFamily: FONT, fontSize: "11px", color: "var(--gray-500)", marginTop: 2 }}>
                {v.date} · QA {v.qaScore}
              </p>
            </div>
          ))}
        </div>

        {/* Diff list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          <SectionLabel>Изменения</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {COMPARE_CHANGES.map((item, i) => (
              <div
                key={i}
                className="rounded-xl p-3 sm:p-3.5"
                style={{
                  borderTopWidth: 1,
                  borderRightWidth: 1,
                  borderBottomWidth: 1,
                  borderLeftWidth: 3,
                  borderTopStyle: "solid",
                  borderRightStyle: "solid",
                  borderBottomStyle: "solid",
                  borderLeftStyle: "solid",
                  borderTopColor: item.border,
                  borderRightColor: item.border,
                  borderBottomColor: item.border,
                  borderLeftColor: item.color,
                  background: item.bg,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <span
                    style={{
                      fontFamily: FONT, fontWeight: 800, fontSize: "9px",
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: item.color,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "13px", color: "var(--gray-900)", marginBottom: 6 }}>
                  {item.title}
                </p>
                {item.detail && (
                  <p style={{ fontFamily: FONT, fontSize: "12.5px", color: "var(--gray-600)", lineHeight: 1.6 }}>
                    {item.detail}
                  </p>
                )}
                {(item.before || item.after) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {item.before && (
                      <div style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(231,76,60,0.05)", border: "1px solid rgba(231,76,60,0.12)" }}>
                        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "10px", color: "#E74C3C" }}>Было: </span>
                        <span style={{ fontFamily: FONT, fontSize: "12.5px", color: "var(--gray-700)" }}>{item.before}</span>
                      </div>
                    )}
                    {item.after && (
                      <div style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(46,204,113,0.05)", border: "1px solid rgba(46,204,113,0.12)" }}>
                        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "10px", color: "#2ECC71" }}>Стало: </span>
                        <span style={{ fontFamily: FONT, fontSize: "12.5px", color: "var(--gray-700)" }}>{item.after}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div
            style={{
              marginTop: 12, padding: "12px 14px", borderRadius: 12,
              background: "var(--gray-50)", border: "1px solid var(--border-xs)",
            }}
          >
            <SectionLabel>Итого</SectionLabel>
            <ChangePills changes={VERSIONS[0].changes} />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex shrink-0 justify-stretch border-t border-[var(--border-xs)] p-3 sm:justify-end sm:px-5 sm:py-3.5"
        >
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full touch-manipulation rounded-lg border border-[var(--border-sm)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-bold text-[var(--gray-700)] sm:w-auto sm:px-5 sm:py-2 sm:text-[12.5px]"
            style={{
              fontFamily: FONT,
              cursor: "pointer",
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Restore confirmation modal ──────────────────────────── */

function RestoreModal({
  version,
  onClose,
  onConfirm,
}: {
  version: Version;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4 sm:px-6"
      style={{ fontFamily: FONT }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[480px] rounded-t-[20px] bg-[var(--bg-surface)] shadow-2xl sm:rounded-[20px]"
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 border-b border-[var(--border-xs)] px-4 py-4 sm:items-center sm:gap-3 sm:px-5 sm:py-5"
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "rgba(241,196,15,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <AlertTriangle style={{ width: 18, height: 18, color: "#F1C40F" }} />
          </div>
          <div>
            <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: "15px", color: "var(--gray-900)" }}>
              Восстановить {version.id}?
            </p>
            <p style={{ fontFamily: FONT, fontSize: "11.5px", color: "var(--gray-500)", marginTop: 2 }}>
              {version.date} · {version.description.slice(0, 50)}…
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2.5 px-4 py-4 sm:px-5 sm:py-[18px]">
          {[
            { icon: CheckCircle2, color: "#2ECC71", bg: "rgba(46,204,113,0.05)", border: "rgba(46,204,113,0.12)",
              text: "Будет создана новая версия с содержимым из " + version.id },
            { icon: CheckCircle2, color: "#2ECC71", bg: "rgba(46,204,113,0.05)", border: "rgba(46,204,113,0.12)",
              text: "Текущая версия сохранится в истории" },
            { icon: CheckCircle2, color: "#2ECC71", bg: "rgba(46,204,113,0.05)", border: "rgba(46,204,113,0.12)",
              text: "Все последующие версии останутся доступны" },
          ].map(({ icon: Icon, color, bg, border, text }, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                background: bg, border: `1px solid ${border}`,
              }}
            >
              <Icon style={{ width: 14, height: 14, color, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT, fontSize: "12.5px", color: "var(--gray-700)" }}>
                {text}
              </span>
            </div>
          ))}

          <p style={{ fontFamily: FONT, fontSize: "11.5px", color: "var(--gray-400)", marginTop: 4, lineHeight: 1.5 }}>
            Это безопасная операция. Вы всегда сможете вернуться к любой версии, включая текущую.
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex flex-col-reverse gap-2 border-t border-[var(--border-xs)] p-3 sm:flex-row sm:justify-end sm:gap-2 sm:px-5 sm:py-3.5"
        >
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full touch-manipulation rounded-lg border border-[var(--border-sm)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--gray-700)] sm:w-auto sm:px-[18px] sm:py-2 sm:text-[12.5px]"
            style={{
              fontFamily: FONT,
              cursor: "pointer",
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border-none px-4 py-2.5 text-sm font-bold text-white sm:w-auto sm:px-[18px] sm:py-2 sm:text-[12.5px]"
            style={{
              fontFamily: FONT,
              background: "var(--brand-blue)",
              cursor: "pointer", transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <RotateCcw style={{ width: 13, height: 13 }} />
            Восстановить
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */

export default function VersionHistory() {
  const { courseId } = useParams();
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [restoreVersion, setRestoreVersion] = useState<Version | null>(null);

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
              className="mb-2.5 inline-flex min-h-9 touch-manipulation items-center gap-1.5 text-[11px] font-semibold text-[var(--gray-400)] no-underline transition-colors hover:text-[var(--brand-blue)]"
              style={{ fontFamily: FONT }}
            >
              <ArrowLeft className="size-3 shrink-0" />
              Назад к редактору
            </Link>

            <div className="flex items-start gap-2.5 sm:items-center sm:gap-2.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] sm:size-[36px]"
                style={{ background: "rgba(74,144,226,0.1)" }}
              >
                <History className="size-[18px] text-[var(--brand-blue)]" />
              </div>
              <div className="min-w-0">
                <h1
                  className="text-lg font-extrabold leading-none tracking-tight text-[var(--gray-900)] sm:text-xl"
                  style={{ fontFamily: FONT, marginBottom: 4 }}
                >
                  История версий
                </h1>
                <p className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--gray-500)] sm:text-xs" style={{ fontFamily: FONT }}>
                  <span className="min-w-0 break-words">{COURSE_TITLE}</span>
                  <span
                    className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold text-[var(--brand-blue)]"
                    style={{
                      fontFamily: FONT,
                      background: "rgba(74,144,226,0.08)",
                    }}
                  >
                    {VERSIONS.length} версий
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex w-full shrink-0 sm:w-auto">
            <Link
              to={`/app/editor/${courseId}`}
              className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-[var(--border-sm)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--gray-700)] no-underline transition-colors hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] sm:min-h-0 sm:w-auto sm:px-3.5 sm:py-2 sm:text-xs"
              style={{ fontFamily: FONT }}
            >
              <Edit3 className="size-3.5 shrink-0" />
              Редактор
            </Link>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="mx-auto grid max-w-[960px] grid-cols-1 items-start gap-8 px-4 py-6 sm:px-5 sm:py-7 lg:grid-cols-[1fr_260px] lg:gap-6 lg:px-8 lg:py-7"
      >
        {/* Timeline */}
        <div>
          <SectionLabel>Хронология изменений</SectionLabel>
          <div>
            {VERSIONS.map((version, i) => (
              <VersionCard
                key={version.id}
                version={version}
                isLast={i === VERSIONS.length - 1}
                onCompare={(v) => setCompareVersion(v)}
                onRestore={(v) => setRestoreVersion(v)}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <StatsSidebar courseId={courseId} />
      </div>

      {/* Modals */}
      {compareVersion && (
        <CompareModal
          version={compareVersion}
          onClose={() => setCompareVersion(null)}
        />
      )}

      {restoreVersion && (
        <RestoreModal
          version={restoreVersion}
          onClose={() => setRestoreVersion(null)}
          onConfirm={() => setRestoreVersion(null)}
        />
      )}
    </div>
  );
}
