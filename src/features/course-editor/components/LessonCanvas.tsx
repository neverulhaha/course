import { AlertCircle, Check, Edit2, FileText, Plus, RefreshCw, Shield, Sparkles, Trash2 } from "lucide-react";
import type { LessonContent, LessonSummary } from "@/entities/course/types";
import { getSeverityConfig, StatusBadgeMap } from "@/features/course-editor/courseEditorModel";

const FONT = "'Montserrat', sans-serif";

interface LessonCanvasProps {
  lesson: LessonSummary;
  content: LessonContent;
}

/* ─── Block type label config ─────────────────────────────── */

const BLOCK_ACCENT: Record<string, string> = {
  theory:   "var(--brand-blue)",
  example:  "#2ECC71",
  practice: "#F1C40F",
  code:     "#9B59B6",
  summary:  "var(--gray-600)",
};

/* ─── Content block ───────────────────────────────────────── */

function ContentBlock({ block }: { block: LessonContent["blocks"][number] }) {
  const hasIssue = !!block.qaIssue;
  const severity = hasIssue ? getSeverityConfig(block.qaIssue!.severity) : null;
  const SeverityIcon = severity?.icon;
  const accent = BLOCK_ACCENT[block.type] ?? "var(--gray-500)";

  return (
    <div
      className="group"
      style={{
        borderRadius: 14,
        border: `1px solid var(--border-xs)`,
        borderLeft: hasIssue ? `3px solid ${severity!.color}` : `3px solid ${accent}22`,
        background: "var(--bg-surface)",
        overflow: "hidden",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)";
        if (!hasIssue) (e.currentTarget as HTMLElement).style.borderLeftColor = `${accent}60`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        if (!hasIssue) (e.currentTarget as HTMLElement).style.borderLeftColor = `${accent}22`;
      }}
    >
      {/* Block header */}
      <div
        className="flex flex-col gap-2 border-b border-[var(--border-xs)] bg-[var(--gray-50)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5"
      >
        {/* Left: label + badges */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            style={{
              fontFamily: FONT, fontWeight: 800, fontSize: "9px",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: hasIssue ? severity!.color : accent,
            }}
          >
            {block.label}
          </span>

          {block.aiGenerated && (
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "1px 6px", borderRadius: 5,
                background: "rgba(74,144,226,0.1)", color: "var(--brand-blue)",
                fontFamily: FONT, fontWeight: 700, fontSize: "10px",
              }}
            >
              <Sparkles style={{ width: 9, height: 9 }} />
              ИИ
            </span>
          )}

          {block.hasSource && (
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "1px 6px", borderRadius: 5,
                background: "rgba(46,204,113,0.08)", color: "#2ECC71",
                fontFamily: FONT, fontWeight: 700, fontSize: "10px",
              }}
            >
              <Check style={{ width: 9, height: 9 }} />
              Источник
            </span>
          )}
        </div>

        {/* Right: action icons on hover */}
        <div
          className="flex items-center gap-1 opacity-100 transition-opacity duration-150 lg:opacity-0 lg:group-hover:opacity-100"
        >
          {[
            { icon: Edit2,     title: "Редактировать"   },
            { icon: RefreshCw, title: "Перегенерировать" },
            { icon: Trash2,    title: "Удалить"          },
          ].map(({ icon: Icon, title }) => (
            <button
              key={title}
              title={title}
              style={{
                width: 26, height: 26,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 7, border: "none", cursor: "pointer",
                background: "transparent", color: "var(--gray-400)",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-surface)";
                e.currentTarget.style.color = "var(--gray-800)";
                e.currentTarget.style.boxShadow = "var(--shadow-xs)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--gray-400)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Block content */}
      <div className="px-3 pb-4 pt-3 sm:px-[18px] sm:pb-[18px] sm:pt-4">
        {block.type === "code" ? (
          <pre
            className="overflow-x-auto rounded-lg p-3 text-xs leading-relaxed sm:p-4 sm:text-[13px]"
            style={{
              background: "#000000",
              color: "#FFFFFF",
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              margin: 0,
            }}
          >
            <code>{block.content}</code>
          </pre>
        ) : (
          <p
            className="text-[length:var(--text-base)] leading-[1.75] text-[var(--gray-800)] sm:text-[14.5px]"
            style={{
              fontFamily: FONT,
              margin: 0,
            }}
          >
            {block.content}
          </p>
        )}

        {block.description && (
          <p
            style={{
              fontFamily: FONT, fontStyle: "italic",
              fontSize: "13px", color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            {block.description}
          </p>
        )}
      </div>

      {/* QA issue panel */}
      {hasIssue && SeverityIcon && severity && (
        <div
          style={{
            padding: "12px 18px 14px",
            borderTop: `1px solid ${severity.color}18`,
            background: `${severity.color}04`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: `${severity.color}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginTop: 1,
              }}
            >
              <SeverityIcon style={{ width: 13, height: 13, color: severity.color }} />
            </div>

            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: FONT, fontWeight: 800, fontSize: "9px",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: severity.color, marginBottom: 4,
                }}
              >
                {severity.label}
              </p>
              <p
                style={{
                  fontFamily: FONT, fontWeight: 700, fontSize: "13px",
                  color: "var(--gray-900)", marginBottom: 4,
                }}
              >
                {block.qaIssue!.message}
              </p>
              <p
                style={{
                  fontFamily: FONT, fontSize: "12.5px",
                  color: "var(--gray-600)", marginBottom: 10, lineHeight: 1.5,
                }}
              >
                <span style={{ fontWeight: 700 }}>Рекомендация: </span>
                {block.qaIssue!.suggestion}
              </p>

              <div className="flex flex-wrap gap-2">
                {["Исправить", "Перегенерировать", "Игнорировать"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="touch-manipulation rounded-md border border-[var(--border-sm)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-semibold sm:px-2.5"
                    style={{
                      fontFamily: FONT,
                      color: "var(--gray-700)",
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = severity.color;
                      e.currentTarget.style.color = severity.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-sm)";
                      e.currentTarget.style.color = "var(--gray-700)";
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────── */

function LessonEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12 text-center sm:px-8 sm:py-16"
    >
      <div
        style={{
          width: 52, height: 52, borderRadius: 14,
          background: "rgba(74,144,226,0.07)",
          border: "1px solid rgba(74,144,226,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <FileText style={{ width: 24, height: 24, color: "var(--brand-blue)" }} />
      </div>
      <h3
        style={{
          fontFamily: FONT, fontWeight: 800, fontSize: "18px",
          color: "var(--gray-900)", letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        Урок пуст
      </h3>
      <p
        style={{
          fontFamily: FONT, fontSize: "14px",
          color: "var(--gray-500)", lineHeight: 1.6,
          maxWidth: 360, marginBottom: 28,
        }}
      >
        Сгенерируйте содержание урока с помощью ИИ или добавьте блоки вручную
      </p>
      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-bold text-white sm:w-auto sm:px-[18px]"
          style={{
            fontFamily: FONT,
            background: "var(--brand-blue)",
            border: "none", cursor: "pointer",
          }}
        >
          <Sparkles className="size-3.5 shrink-0" />
          Сгенерировать урок
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-[10px] border border-[var(--border-sm)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-bold text-[var(--gray-700)] sm:w-auto sm:px-[18px]"
          style={{
            fontFamily: FONT,
            cursor: "pointer",
          }}
        >
          <Plus className="size-3.5 shrink-0" />
          Добавить блок
        </button>
      </div>
    </div>
  );
}

/* ─── Lesson canvas ───────────────────────────────────────── */

export function LessonCanvas({ lesson, content }: LessonCanvasProps) {
  const isEmpty = content.blocks.length === 0;
  const issueCount = content.blocks.filter((b) => b.qaIssue).length;
  const badge = StatusBadgeMap[lesson.status];

  return (
    <main
      className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--gray-50)]"
      style={{ fontFamily: FONT }}
    >
      <div className="mx-auto max-w-[720px] px-4 pb-28 pt-6 sm:px-6 sm:pb-24 sm:pt-8 lg:px-10 lg:pb-20 lg:pt-9 xl:px-10">

        {/* Lesson header */}
        <header className="mb-6 sm:mb-8 lg:mb-8">
          {/* Status row */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              flexWrap: "wrap", marginBottom: 14,
            }}
          >
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 9px", borderRadius: 6,
                fontFamily: FONT, fontWeight: 700, fontSize: "10px",
                background: "var(--gray-100)", color: "var(--gray-600)",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot }} />
              {badge.label}
            </span>

            {lesson.hasIssues && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px", borderRadius: 6,
                  fontFamily: FONT, fontWeight: 700, fontSize: "10px",
                  background: "rgba(241,196,15,0.09)", color: "#F1C40F",
                  border: "1px solid rgba(241,196,15,0.18)",
                }}
              >
                <AlertCircle style={{ width: 10, height: 10 }} />
                {issueCount} замечания
              </span>
            )}

            {lesson.qaScore !== null && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px", borderRadius: 6,
                  fontFamily: FONT, fontWeight: 700, fontSize: "10px",
                  background: "rgba(74,144,226,0.08)", color: "var(--brand-blue)",
                }}
              >
                <Shield style={{ width: 10, height: 10 }} />
                {lesson.qaScore}
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            className="text-xl font-extrabold leading-tight tracking-tight text-[var(--gray-900)] sm:text-2xl lg:text-[26px]"
            style={{
              fontFamily: FONT,
              marginBottom: 8,
            }}
          >
            {lesson.title}
          </h2>
          <p className="text-[11px] text-[var(--gray-400)] sm:text-xs" style={{ fontFamily: FONT }}>
            Изменено 31 марта · Создано с помощью ИИ
          </p>
        </header>

        {/* Learning goal */}
        {content.goal && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(74,144,226,0.15)",
              background: "rgba(74,144,226,0.03)",
              overflow: "hidden",
              marginBottom: 28,
            }}
          >
            <div
              className="flex flex-col gap-2 border-b border-[rgba(74,144,226,0.1)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 18, height: 18, borderRadius: 5,
                    background: "var(--brand-blue)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <FileText style={{ width: 10, height: 10, color: "white" }} />
                </div>
                <span
                  style={{
                    fontFamily: FONT, fontWeight: 800, fontSize: "9px",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "var(--brand-blue)",
                  }}
                >
                  Цель урока
                </span>
              </div>
              <button
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 9px", borderRadius: 7,
                  fontFamily: FONT, fontWeight: 600, fontSize: "11px",
                  color: "var(--gray-500)", background: "transparent",
                  border: "none", cursor: "pointer", transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--brand-blue)";
                  e.currentTarget.style.background = "rgba(74,144,226,0.07)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--gray-500)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Edit2 style={{ width: 11, height: 11 }} />
                Изменить
              </button>
            </div>
            <div className="px-3 py-3 sm:px-4 sm:py-3.5">
              <p
                style={{
                  fontFamily: FONT, fontSize: "14px",
                  color: "var(--gray-700)", lineHeight: 1.7, margin: 0,
                }}
              >
                {content.goal}
              </p>
            </div>
          </div>
        )}

        {/* Blocks */}
        {isEmpty ? (
          <LessonEmptyState />
        ) : (
          <>
            <div className="flex flex-col gap-2.5 sm:gap-2.5">
              {content.blocks.map((block) => (
                <ContentBlock key={block.id} block={block} />
              ))}
            </div>

            {/* Add block */}
            <button
              type="button"
              className="mt-3 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[var(--border-md)] bg-transparent px-3 py-3 text-sm font-semibold text-[var(--gray-400)] sm:mt-3.5 sm:py-3.5"
              style={{
                fontFamily: FONT,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-blue)";
                e.currentTarget.style.color = "var(--brand-blue)";
                e.currentTarget.style.background = "rgba(74,144,226,0.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-md)";
                e.currentTarget.style.color = "var(--gray-400)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Добавить блок содержания
            </button>
          </>
        )}
      </div>
    </main>
  );
}
