import { AlertCircle, ChevronDown, ChevronRight, Plus, CheckCircle2 } from "lucide-react";
import type { LessonSummary, ModuleSummary } from "@/entities/course/types";
import { StatusBadgeMap } from "@/features/course-editor/courseEditorModel";
import { cn } from "@/app/components/ui/utils";

const FONT = "'Montserrat', sans-serif";

interface ModuleTreeProps {
  modules: ModuleSummary[];
  selectedLessonId: string;
  expandedModules: string[];
  onToggleModule: (moduleId: string) => void;
  onSelectLesson: (lesson: LessonSummary) => void;
  className?: string;
}

/* ─── Status dot ──────────────────────────────────────────── */

function StatusDot({ status, hasIssues }: { status: string; hasIssues: boolean }) {
  if (hasIssues) return (
    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F1C40F", flexShrink: 0 }} />
  );
  if (status === "ready") return (
    <CheckCircle2 style={{ width: 12, height: 12, color: "#2ECC71", flexShrink: 0 }} />
  );
  const dot = StatusBadgeMap[status as keyof typeof StatusBadgeMap];
  return (
    <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot?.dot ?? "var(--gray-300)", flexShrink: 0 }} />
  );
}

/* ─── Lesson item ─────────────────────────────────────────── */

function LessonItem({
  lesson,
  index,
  isActive,
  onSelect,
}: {
  lesson: LessonSummary;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        width: "100%", textAlign: "left",
        padding: "7px 14px 7px 28px",
        fontFamily: FONT,
        background: isActive ? "rgba(74,144,226,0.07)" : "transparent",
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 3,
        borderTopStyle: "none",
        borderRightStyle: "none",
        borderBottomStyle: "none",
        borderLeftStyle: "solid",
        borderLeftColor: isActive ? "var(--brand-blue)" : "transparent",
        cursor: "pointer",
        transition: "all 0.1s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Lesson number */}
      <span
        style={{
          fontFamily: FONT, fontWeight: 700, fontSize: "10px",
          color: isActive ? "var(--brand-blue)" : "var(--gray-400)",
          minWidth: 16, letterSpacing: "0.02em",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>

      {/* Title */}
      <span
        style={{
          fontFamily: FONT, fontWeight: isActive ? 700 : 500,
          fontSize: "12.5px", lineHeight: "var(--leading-snug)",
          color: isActive ? "var(--gray-900)" : "var(--gray-600)",
          flex: 1, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        }}
      >
        {lesson.title}
      </span>

      {/* Status indicator */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        <StatusDot status={lesson.status} hasIssues={lesson.hasIssues} />
      </div>
    </button>
  );
}

/* ─── Module item ─────────────────────────────────────────── */

function ModuleItem({
  module,
  index,
  isExpanded,
  selectedLessonId,
  onToggle,
  onSelectLesson,
}: {
  module: ModuleSummary;
  index: number;
  isExpanded: boolean;
  selectedLessonId: string;
  onToggle: () => void;
  onSelectLesson: (lesson: LessonSummary) => void;
}) {
  const completedCount = module.lessons.filter((l) => l.status === "ready").length;
  const hasActive = module.lessons.some((l) => l.id === selectedLessonId);

  return (
    <div>
      {/* Module header */}
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          width: "100%", textAlign: "left",
          padding: "8px 14px",
          fontFamily: FONT, background: "transparent",
          border: "none", cursor: "pointer",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* Expand/collapse */}
        <div style={{ color: "var(--gray-400)", flexShrink: 0, marginTop: 1 }}>
          {isExpanded
            ? <ChevronDown style={{ width: 12, height: 12 }} />
            : <ChevronRight style={{ width: 12, height: 12 }} />}
        </div>

        {/* Module number badge */}
        <span
          style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "10px", color: "var(--gray-400)",
            letterSpacing: "0.03em", flexShrink: 0,
          }}
        >
          {index + 1}
        </span>

        {/* Module title */}
        <span
          style={{
            fontFamily: FONT, fontWeight: hasActive ? 700 : 600,
            fontSize: "12px", color: hasActive ? "var(--gray-900)" : "var(--gray-700)",
            flex: 1, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
            letterSpacing: "-0.005em",
          }}
        >
          {module.title}
        </span>

        {/* Progress */}
        {completedCount > 0 && (
          <span
            style={{
              fontFamily: FONT, fontWeight: 700,
              fontSize: "10px", flexShrink: 0,
              color: completedCount === module.lessons.length ? "#2ECC71" : "var(--brand-blue)",
            }}
          >
            {completedCount}/{module.lessons.length}
          </span>
        )}
      </button>

      {/* Lessons list */}
      {isExpanded && (
        <div style={{ marginBottom: 4 }}>
          {module.lessons.map((lesson, lessonIndex) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex}
              isActive={selectedLessonId === lesson.id}
              onSelect={() => onSelectLesson(lesson)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Module tree panel ───────────────────────────────────── */

export function ModuleTree({
  modules,
  selectedLessonId,
  expandedModules,
  onToggleModule,
  onSelectLesson,
  className,
}: ModuleTreeProps) {
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => l.status === "ready").length,
    0
  );
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--bg-surface)]",
        className,
      )}
      style={{ fontFamily: FONT }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 14px 12px",
          borderBottom: "1px solid var(--border-xs)",
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontFamily: FONT, fontWeight: 700, fontSize: "10px",
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--gray-400)", marginBottom: 6,
          }}
        >
          Структура курса
        </p>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              flex: 1, height: 3, borderRadius: 99,
              background: "var(--gray-100)", overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%", borderRadius: 99,
                background: pct === 100 ? "#2ECC71" : "var(--brand-blue)",
                width: `${pct}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: FONT, fontWeight: 700, fontSize: "10px",
              color: pct === 100 ? "#2ECC71" : "var(--brand-blue)",
              minWidth: 28, textAlign: "right",
            }}
          >
            {pct}%
          </span>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "10px", color: "var(--gray-400)", marginTop: 4 }}>
          {completedLessons} из {totalLessons} уроков · {modules.length} модулей
        </p>
      </div>

      {/* Module list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {modules.map((module, i) => (
          <ModuleItem
            key={module.id}
            module={module}
            index={i}
            isExpanded={expandedModules.includes(module.id)}
            selectedLessonId={selectedLessonId}
            onToggle={() => onToggleModule(module.id)}
            onSelectLesson={onSelectLesson}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-xs)", flexShrink: 0 }}>
        <button
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px",
            fontFamily: FONT, fontWeight: 600, fontSize: "11.5px",
            color: "var(--gray-400)",
            background: "transparent",
            border: "1.5px dashed var(--border-md)",
            borderRadius: 9, cursor: "pointer",
            transition: "all 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--brand-blue)";
            e.currentTarget.style.borderColor = "var(--brand-blue)";
            e.currentTarget.style.background = "rgba(74,144,226,0.03)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--gray-400)";
            e.currentTarget.style.borderColor = "var(--border-md)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          Добавить модуль
        </button>
      </div>
    </aside>
  );
}
