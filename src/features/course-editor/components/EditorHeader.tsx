import { Link } from "react-router";
import { ArrowLeft, Save, Eye, Shield, History as HistoryIcon, CheckCircle2, Sparkles, Edit2 } from "lucide-react";
import type { CourseEditorMeta } from "@/entities/course/types";

const FONT = "'Montserrat', sans-serif";

interface EditorHeaderProps {
  courseId: string;
  course: CourseEditorMeta;
  showSaveIndicator: boolean;
  onSave: () => void;
  onPreview: () => void;
  onEditTitle?: () => void;
}

export function EditorHeader({ courseId, course, showSaveIndicator, onSave, onPreview, onEditTitle }: EditorHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 flex h-[52px] min-h-[52px] shrink-0 items-center justify-between gap-2 border-b border-[var(--border-xs)] bg-[var(--bg-surface)] px-3 sm:h-[54px] sm:min-h-[54px] sm:gap-3 sm:px-5 lg:px-6"
      style={{ fontFamily: FONT }}
    >
      {/* Left: back + course title */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          to="/app"
          className="flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-lg sm:size-[30px]"
          style={{
            color: "var(--gray-400)",
            transition: "all 0.12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--gray-100)";
            (e.currentTarget as HTMLElement).style.color = "var(--gray-800)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--gray-400)";
          }}
        >
          <ArrowLeft className="size-3.5 sm:size-[15px]" />
        </Link>

        <div className="hidden h-[18px] w-px shrink-0 bg-[var(--border-sm)] sm:block" />

        {/* Brand mark */}
        <div
          className="hidden size-[22px] shrink-0 items-center justify-center rounded-md sm:flex"
          style={{ background: "var(--brand-blue)" }}
        >
          <Sparkles className="size-2.5 text-white" />
        </div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onEditTitle}
            className="inline-flex max-w-full items-center gap-1 truncate text-left text-xs font-bold leading-none tracking-tight text-[var(--gray-900)] sm:text-[13px] lg:max-w-[400px]"
            style={{ fontFamily: FONT, marginBottom: 3, background: "transparent", border: "none", padding: 0, cursor: onEditTitle ? "pointer" : "default" }}
            title={onEditTitle ? "Изменить название курса" : undefined}
          >
            <span className="truncate">{course.title}</span>
            {onEditTitle && <Edit2 className="size-3 shrink-0 text-[var(--gray-400)]" />}
          </button>
          <div
            className="mt-0.5 hidden flex-wrap items-center gap-1.5 text-[11px] text-[var(--gray-400)] sm:flex"
            style={{ fontFamily: FONT }}
          >
            <span>Сохранено {course.lastSaved}</span>
            <span style={{ color: "var(--border-md)" }}>·</span>
            <span style={{ fontWeight: 700, color: "var(--gray-500)" }}>{course.version ?? "нет версий"}</span>
            <span style={{ color: "var(--border-md)" }}>·</span>
            <span
              style={{
                fontWeight: 700, color: "var(--brand-blue)",
                display: "flex", alignItems: "center", gap: 3,
              }}
            >
              <Shield style={{ width: 10, height: 10 }} />
              {course.qaScore}
            </span>
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {[
          { to: `/app/qa/${courseId}`,       icon: Shield,       label: "QA"      },
          { to: `/app/versions/${courseId}`, icon: HistoryIcon,  label: "Версии"  },
        ].map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className="inline-flex min-h-9 min-w-9 touch-manipulation items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold no-underline sm:min-h-0 sm:min-w-0 sm:justify-start sm:gap-1.5 sm:px-2.5 sm:text-[11.5px]"
            style={{
              fontFamily: FONT,
              color: "var(--gray-600)",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--gray-100)";
              (e.currentTarget as HTMLElement).style.color = "var(--gray-900)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--gray-600)";
            }}
          >
            <Icon className="size-3 sm:size-[13px]" />
            <span className="hidden md:inline">{label}</span>
          </Link>
        ))}

        <div className="mx-0.5 hidden h-4 w-px bg-[var(--border-sm)] sm:mx-1 sm:block" />

        <button
          type="button"
          onClick={onPreview}
          className="inline-flex touch-manipulation items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold sm:gap-1.5 sm:px-2.5 sm:text-[11.5px]"
          style={{
            fontFamily: FONT,
            color: "var(--gray-600)", background: "transparent",
            border: "none", cursor: "pointer", transition: "all 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--gray-100)";
            e.currentTarget.style.color = "var(--gray-900)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--gray-600)";
          }}
        >
          <Eye className="size-3 sm:size-[13px]" />
          <span className="hidden sm:inline">Просмотр</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          className="ml-1 inline-flex touch-manipulation items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold text-white sm:ml-2 sm:px-3.5 sm:py-1.5 sm:text-xs"
          style={{
            fontFamily: FONT,
            background: "var(--brand-blue)",
            border: "none", cursor: "pointer", transition: "opacity 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Save className="size-3 sm:size-[13px]" />
          Сохранить
        </button>
      </div>

      {/* Save toast */}
      {showSaveIndicator && (
        <div
          className="fixed right-3 top-16 z-[60] flex items-center gap-1.5 rounded-lg border border-[rgba(46,204,113,0.2)] px-3 py-2 text-xs font-bold shadow-[var(--shadow-md)] sm:right-6 sm:text-xs"
          style={{
            background: "#ECFDF5",
            color: "#2ECC71",
            fontFamily: FONT,
          }}
        >
          <CheckCircle2 style={{ width: 13, height: 13 }} />
          Сохранено
        </div>
      )}
    </header>
  );
}
