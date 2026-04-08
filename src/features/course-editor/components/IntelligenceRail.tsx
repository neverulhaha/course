import { Link } from "react-router";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ExternalLink,
  History as HistoryIcon,
  Plus,
  RefreshCw,
  Sparkles,
  FileText,
  Wand2,
  BookOpen,
  Scissors,
  Dumbbell,
} from "lucide-react";
import type { CourseEditorMeta, LessonContent, LessonSummary } from "@/entities/course/types";
import { cn } from "@/app/components/ui/utils";

const FONT = "'Montserrat', sans-serif";

interface IntelligenceRailProps {
  courseId: string;
  lesson: LessonSummary;
  content: LessonContent;
  course: CourseEditorMeta;
  className?: string;
}

/* ─── AI actions config ───────────────────────────────────── */

const AI_ACTIONS = [
  { icon: RefreshCw, label: "Перегенерировать", sub: "Учесть замечания QA",  color: "var(--brand-blue)"  },
  { icon: Scissors,  label: "Сократить",         sub: "Убрать лишнее",        color: "#9B59B6"             },
  { icon: Wand2,     label: "Упростить",          sub: "Для начинающих",       color: "#F1C40F"             },
  { icon: BookOpen,  label: "Добавить примеры",   sub: "Улучшить понимание",   color: "#2ECC71"             },
  { icon: Dumbbell,  label: "Добавить практику",  sub: "Закрепить изученное",  color: "#E74C3C"             },
] as const;

const SOURCES = [
  { name: "Python Basics.pdf", blocks: 12 },
  { name: "python.org/docs",   blocks: 8  },
];

/* ─── Rail section wrapper ────────────────────────────────── */

function RailSection({ title, children, borderTop = false }: { title: string; children: React.ReactNode; borderTop?: boolean }) {
  return (
    <div
      style={{
        padding: "16px 16px 0",
        borderTop: borderTop ? "1px solid var(--border-xs)" : "none",
      }}
    >
      <p
        style={{
          fontFamily: FONT, fontWeight: 800, fontSize: "9px",
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--gray-400)", marginBottom: 10,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

/* ─── QA issues section ───────────────────────────────────── */

function QaSection({ courseId, lesson, content }: { courseId: string; lesson: LessonSummary; content: LessonContent }) {
  const high   = content.blocks.filter((b) => b.qaIssue?.severity === "high").length;
  const medium = content.blocks.filter((b) => b.qaIssue?.severity === "medium").length;

  if (!lesson.hasIssues) {
    return (
      <RailSection title="QA-статус">
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 12px", borderRadius: 10,
            background: "rgba(46,204,113,0.06)",
            border: "1px solid rgba(46,204,113,0.12)",
            marginBottom: 16,
          }}
        >
          <Check style={{ width: 14, height: 14, color: "#2ECC71", flexShrink: 0 }} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "12px", color: "#2ECC71" }}>
            Нет замечаний
          </span>
        </div>
      </RailSection>
    );
  }

  return (
    <RailSection title="Требует внимания">
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {high > 0 && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 12px", borderRadius: 9,
              background: "rgba(231,76,60,0.05)",
              border: "1px solid rgba(231,76,60,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <AlertTriangle style={{ width: 13, height: 13, color: "#E74C3C" }} />
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "12px", color: "var(--gray-800)" }}>
                Высокий риск
              </span>
            </div>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: "16px", color: "#E74C3C" }}>
              {high}
            </span>
          </div>
        )}

        {medium > 0 && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 12px", borderRadius: 9,
              background: "rgba(241,196,15,0.05)",
              border: "1px solid rgba(241,196,15,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <AlertCircle style={{ width: 13, height: 13, color: "#F1C40F" }} />
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "12px", color: "var(--gray-800)" }}>
                Средний риск
              </span>
            </div>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: "16px", color: "#F1C40F" }}>
              {medium}
            </span>
          </div>
        )}
      </div>

      <Link
        to={`/app/qa/${courseId}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: FONT, fontWeight: 600, fontSize: "11.5px",
          color: "var(--gray-500)", textDecoration: "none",
          transition: "color 0.12s",
          marginBottom: 16,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-blue)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-500)")}
      >
        Полный QA-отчёт
        <ExternalLink style={{ width: 11, height: 11 }} />
      </Link>
    </RailSection>
  );
}

/* ─── AI actions ──────────────────────────────────────────── */

function AiActionsSection() {
  return (
    <RailSection title="AI-действия" borderTop>
      <div className="mb-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[360px]:gap-1.5">
        {AI_ACTIONS.map(({ icon: Icon, label, sub, color }) => (
          <button
            key={label}
            title={sub}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              padding: "10px 11px",
              borderRadius: 10,
              fontFamily: FONT,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-xs)",
              cursor: "pointer",
              transition: "all 0.12s",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${color}10`;
              e.currentTarget.style.background = `${color}04`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-xs)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "var(--bg-surface)";
            }}
          >
            <div
              style={{
                width: 26, height: 26, borderRadius: 7,
                background: `${color}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 7,
              }}
            >
              <Icon style={{ width: 13, height: 13, color }} />
            </div>
            <span
              style={{
                fontFamily: FONT, fontWeight: 700,
                fontSize: "11px", color: "var(--gray-900)",
                lineHeight: 1.3,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: FONT, fontSize: "10px",
                color: "var(--gray-400)", marginTop: 2,
                lineHeight: 1.3,
              }}
            >
              {sub}
            </span>
          </button>
        ))}
      </div>
    </RailSection>
  );
}

/* ─── Sources section ─────────────────────────────────────── */

function SourcesSection() {
  return (
    <RailSection title="Источники" borderTop>
      <div style={{ marginBottom: 12 }}>
        {SOURCES.map((src, i) => (
          <div
            key={src.name}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 0",
              borderBottom: i < SOURCES.length - 1 ? "1px solid var(--border-xs)" : "none",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: "rgba(46,204,113,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <FileText style={{ width: 13, height: 13, color: "#2ECC71" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: FONT, fontWeight: 700,
                  fontSize: "11.5px", color: "var(--gray-800)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {src.name}
              </p>
              <p style={{ fontFamily: FONT, fontSize: "10px", color: "var(--gray-400)" }}>
                {src.blocks} блоков
              </p>
            </div>
            <Check style={{ width: 12, height: 12, color: "#2ECC71", flexShrink: 0 }} />
          </div>
        ))}
      </div>

      <button
        style={{
          display: "flex", alignItems: "center", gap: 5,
          fontFamily: FONT, fontWeight: 600, fontSize: "11px",
          color: "var(--gray-400)", background: "transparent",
          border: "none", cursor: "pointer",
          transition: "color 0.12s",
          marginBottom: 16,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand-blue)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-400)")}
      >
        <Plus style={{ width: 11, height: 11 }} />
        Добавить источник
      </button>
    </RailSection>
  );
}

/* ─── Version section ─────────────────────────────────────── */

function VersionSection({ courseId, course }: { courseId: string; course: CourseEditorMeta }) {
  return (
    <RailSection title="Версия" borderTop>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {([
          ["Версия",       course.version     ],
          ["Изменено",     "31 мар, 14:20"    ],
          ["Создано",      "ИИ"               ],
        ] as [string, string][]).map(([k, v]) => (
          <div
            key={k}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ fontFamily: FONT, fontSize: "11.5px", color: "var(--gray-400)" }}>{k}</span>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "11.5px", color: "var(--gray-700)" }}>{v}</span>
          </div>
        ))}
      </div>

      <Link
        to={`/app/versions/${courseId}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: FONT, fontWeight: 600, fontSize: "11.5px",
          color: "var(--gray-500)", textDecoration: "none",
          transition: "color 0.12s",
          marginBottom: 24,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-blue)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-500)")}
      >
        <HistoryIcon style={{ width: 11, height: 11 }} />
        История версий
      </Link>
    </RailSection>
  );
}

/* ─── Assembled rail ──────────────────────────────────────── */

export function IntelligenceRail({ courseId, lesson, content, course, className }: IntelligenceRailProps) {
  return (
    <aside
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-y-auto bg-[var(--editor-assistant-rail)]",
        className,
      )}
      style={{ fontFamily: FONT }}
    >
      {/* Rail header */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-xs)",
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 7,
        }}
      >
        <div
          style={{
            width: 20, height: 20, borderRadius: 6,
            background: "color-mix(in srgb, var(--brand-blue) 14%, var(--editor-assistant-rail))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Sparkles style={{ width: 11, height: 11, color: "var(--brand-blue)" }} />
        </div>
        <span
          style={{
            fontFamily: FONT, fontWeight: 800, fontSize: "11px",
            color: "var(--gray-700)", letterSpacing: "0.01em",
          }}
        >
          Ассистент
        </span>
      </div>

      {/* Sections */}
      <div style={{ flex: 1 }}>
        <QaSection courseId={courseId} lesson={lesson} content={content} />
        <AiActionsSection />
        <SourcesSection />
        <VersionSection courseId={courseId} course={course} />
      </div>
    </aside>
  );
}
