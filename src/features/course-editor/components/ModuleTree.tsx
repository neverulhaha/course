import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Plus, CheckCircle2, Edit2, Trash2, ArrowUp, ArrowDown } from "lucide-react";
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
  onAddModule?: () => void;
  onEditModule?: (module: ModuleSummary) => void;
  onDeleteModule?: (module: ModuleSummary) => void;
  onMoveModule?: (moduleId: string, direction: "up" | "down") => void;
  onAddLesson?: (module: ModuleSummary) => void;
  onDeleteLesson?: (lesson: LessonSummary) => void;
  onMoveLesson?: (module: ModuleSummary, lessonId: string, direction: "up" | "down") => void;
  className?: string;
}

function IconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled || !onClick}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-xs)] bg-transparent text-[var(--gray-400)] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function StatusDot({ status, hasIssues }: { status: string; hasIssues: boolean }) {
  if (hasIssues) return <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F1C40F", flexShrink: 0 }} />;
  if (status === "ready") return <CheckCircle2 style={{ width: 12, height: 12, color: "#2ECC71", flexShrink: 0 }} />;
  const dot = StatusBadgeMap[status as keyof typeof StatusBadgeMap];
  return <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot?.dot ?? "var(--gray-300)", flexShrink: 0 }} />;
}

function LessonItem({
  lesson,
  index,
  isActive,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  lesson: LessonSummary;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className="group flex items-center">
      <button
        onClick={onSelect}
        style={{
          display: "flex", alignItems: "center", gap: 9,
          width: "100%", textAlign: "left",
          padding: "7px 4px 7px 28px",
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
      >
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "10px", color: isActive ? "var(--brand-blue)" : "var(--gray-400)", minWidth: 16, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ fontFamily: FONT, fontWeight: isActive ? 700 : 500, fontSize: "12.5px", lineHeight: "var(--leading-snug)", color: isActive ? "var(--gray-900)" : "var(--gray-600)", flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {lesson.title}
        </span>
        <StatusDot status={lesson.status} hasIssues={lesson.hasIssues} />
      </button>
      <div className="mr-2 hidden shrink-0 items-center gap-1 group-hover:flex">
        <IconButton title="Переместить урок вверх" onClick={onMoveUp} disabled={!onMoveUp}><ArrowUp className="size-3" /></IconButton>
        <IconButton title="Переместить урок вниз" onClick={onMoveDown} disabled={!onMoveDown}><ArrowDown className="size-3" /></IconButton>
        <IconButton title="Удалить урок" onClick={onDelete}><Trash2 className="size-3" /></IconButton>
      </div>
    </div>
  );
}

function ModuleItem({
  module,
  index,
  modulesCount,
  isExpanded,
  selectedLessonId,
  onToggle,
  onSelectLesson,
  onEditModule,
  onDeleteModule,
  onMoveModule,
  onAddLesson,
  onDeleteLesson,
  onMoveLesson,
}: {
  module: ModuleSummary;
  index: number;
  modulesCount: number;
  isExpanded: boolean;
  selectedLessonId: string;
  onToggle: () => void;
  onSelectLesson: (lesson: LessonSummary) => void;
  onEditModule?: (module: ModuleSummary) => void;
  onDeleteModule?: (module: ModuleSummary) => void;
  onMoveModule?: (moduleId: string, direction: "up" | "down") => void;
  onAddLesson?: (module: ModuleSummary) => void;
  onDeleteLesson?: (lesson: LessonSummary) => void;
  onMoveLesson?: (module: ModuleSummary, lessonId: string, direction: "up" | "down") => void;
}) {
  const completedCount = module.lessons.filter((l) => l.status !== "empty").length;
  const hasActive = module.lessons.some((l) => l.id === selectedLessonId);

  return (
    <div>
      <button
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left", padding: "8px 10px 8px 14px", fontFamily: FONT, background: "transparent", border: "none", cursor: "pointer", transition: "background 0.1s" }}
      >
        <div style={{ color: "var(--gray-400)", flexShrink: 0, marginTop: 1 }}>
          {isExpanded ? <ChevronDown style={{ width: 12, height: 12 }} /> : <ChevronRight style={{ width: 12, height: 12 }} />}
        </div>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: "10px", color: "var(--gray-400)", letterSpacing: "0.03em", flexShrink: 0 }}>{index + 1}</span>
        <span style={{ fontFamily: FONT, fontWeight: hasActive ? 700 : 600, fontSize: "12px", color: hasActive ? "var(--gray-900)" : "var(--gray-700)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.005em" }}>
          {module.title}
        </span>
        {completedCount > 0 && <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "10px", flexShrink: 0, color: completedCount === module.lessons.length ? "#2ECC71" : "var(--brand-blue)" }}>{completedCount}/{module.lessons.length}</span>}
        <div className="hidden items-center gap-1 group-hover:flex sm:flex">
          <IconButton title="Переместить модуль вверх" onClick={index > 0 ? () => onMoveModule?.(module.id, "up") : undefined}><ArrowUp className="size-3" /></IconButton>
          <IconButton title="Переместить модуль вниз" onClick={index < modulesCount - 1 ? () => onMoveModule?.(module.id, "down") : undefined}><ArrowDown className="size-3" /></IconButton>
          <IconButton title="Редактировать модуль" onClick={() => onEditModule?.(module)}><Edit2 className="size-3" /></IconButton>
          <IconButton title="Удалить модуль" onClick={() => onDeleteModule?.(module)}><Trash2 className="size-3" /></IconButton>
        </div>
      </button>

      {isExpanded && (
        <div style={{ marginBottom: 4 }}>
          {module.lessons.map((lesson, lessonIndex) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex}
              isActive={selectedLessonId === lesson.id}
              onSelect={() => onSelectLesson(lesson)}
              onDelete={() => onDeleteLesson?.(lesson)}
              onMoveUp={lessonIndex > 0 ? () => onMoveLesson?.(module, lesson.id, "up") : undefined}
              onMoveDown={lessonIndex < module.lessons.length - 1 ? () => onMoveLesson?.(module, lesson.id, "down") : undefined}
            />
          ))}
          <button
            type="button"
            onClick={() => onAddLesson?.(module)}
            className="ml-7 mt-1 inline-flex min-h-8 items-center gap-1 rounded-md border border-dashed border-[var(--border-md)] px-2 text-[11px] font-semibold text-[var(--gray-500)]"
          >
            <Plus className="size-3" />
            Добавить урок
          </button>
        </div>
      )}
    </div>
  );
}

export function ModuleTree({
  modules,
  selectedLessonId,
  expandedModules,
  onToggleModule,
  onSelectLesson,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onMoveModule,
  onAddLesson,
  onDeleteLesson,
  onMoveLesson,
  className,
}: ModuleTreeProps) {
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = modules.reduce((acc, m) => acc + m.lessons.filter((l) => l.status !== "empty").length, 0);
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <aside className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--bg-surface)]", className)} style={{ fontFamily: FONT }}>
      <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid var(--border-xs)", flexShrink: 0 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 6 }}>Структура курса</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 99, background: "var(--gray-100)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: pct === 100 ? "#2ECC71" : "var(--brand-blue)", width: `${pct}%`, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "10px", color: pct === 100 ? "#2ECC71" : "var(--brand-blue)", minWidth: 28, textAlign: "right" }}>{pct}%</span>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "10px", color: "var(--gray-400)", marginTop: 4 }}>{completedLessons} из {totalLessons} уроков · {modules.length} модулей</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {modules.map((module, i) => (
          <ModuleItem
            key={module.id}
            module={module}
            index={i}
            modulesCount={modules.length}
            isExpanded={expandedModules.includes(module.id)}
            selectedLessonId={selectedLessonId}
            onToggle={() => onToggleModule(module.id)}
            onSelectLesson={onSelectLesson}
            onEditModule={onEditModule}
            onDeleteModule={onDeleteModule}
            onMoveModule={onMoveModule}
            onAddLesson={onAddLesson}
            onDeleteLesson={onDeleteLesson}
            onMoveLesson={onMoveLesson}
          />
        ))}
      </div>

      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-xs)", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onAddModule}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", fontFamily: FONT, fontWeight: 600, fontSize: "11.5px", color: "var(--gray-500)", background: "transparent", border: "1.5px dashed var(--border-md)", borderRadius: 9, cursor: "pointer", transition: "all 0.12s" }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          Добавить модуль
        </button>
      </div>
    </aside>
  );
}
