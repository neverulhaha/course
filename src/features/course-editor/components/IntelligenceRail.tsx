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
import type { CourseEditorMeta, LessonContent, LessonSummary, ModuleSummary } from "@/entities/course/types";
import type { CourseSourceSummary } from "@/entities/course/readModels";
import { cn } from "@/app/components/ui/utils";
import type { AiBlockCommand, AiBlockType } from "@/services/aiGeneration.service";

const FONT = "'Montserrat', sans-serif";

interface IntelligenceRailProps {
  courseId: string;
  lesson: LessonSummary;
  content: LessonContent;
  course: CourseEditorMeta;
  modules: ModuleSummary[];
  sources: CourseSourceSummary[];
  className?: string;
  busy?: boolean;
  onGenerateLesson?: () => void;
  onGenerateCourseContent?: () => void;
  onRegenerateBlock?: (blockType: AiBlockType, command: AiBlockCommand) => void;
  onGenerateLessonQuiz?: () => void;
  onGenerateCourseQuiz?: () => void;
}

const AI_ACTIONS: ReadonlyArray<{
  icon: React.ElementType;
  label: string;
  sub: string;
  color: string;
  blockType: AiBlockType;
  command: AiBlockCommand;
}> = [
  { icon: Scissors, label: "Сократить теорию", sub: "Убрать лишнее", color: "#9B59B6", blockType: "theory_text", command: "shorten" },
  { icon: Wand2, label: "Упростить теорию", sub: "Для начинающих", color: "#F1C40F", blockType: "theory_text", command: "simplify" },
  { icon: BookOpen, label: "Расширить теорию", sub: "Сделать подробнее", color: "var(--brand-blue)", blockType: "theory_text", command: "expand" },
  { icon: RefreshCw, label: "Ясность теории", sub: "Ровнее и понятнее", color: "var(--brand-blue)", blockType: "theory_text", command: "improve_clarity" },
  { icon: BookOpen, label: "Добавить примеры", sub: "Усилить примеры", color: "#2ECC71", blockType: "examples_text", command: "add_examples" },
  { icon: Wand2, label: "Упростить примеры", sub: "Понятнее кейсы", color: "#2ECC71", blockType: "examples_text", command: "simplify" },
  { icon: Dumbbell, label: "Добавить практику", sub: "Закрепить изученное", color: "#E74C3C", blockType: "practice_text", command: "add_practice" },
  { icon: RefreshCw, label: "Ясность практики", sub: "Уточнить шаги", color: "#E74C3C", blockType: "practice_text", command: "improve_clarity" },
  { icon: Wand2, label: "Упростить чек-лист", sub: "Короче и яснее", color: "#F1C40F", blockType: "checklist_text", command: "simplify" },
  { icon: BookOpen, label: "Расширить чек-лист", sub: "Добавить критерии", color: "#F1C40F", blockType: "checklist_text", command: "expand" },
];

function RailSection({ title, children, borderTop = false }: { title: string; children: React.ReactNode; borderTop?: boolean }) {
  return (
    <div style={{ padding: "16px 16px 0", borderTop: borderTop ? "1px solid var(--border-xs)" : "none" }}>
      <p
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--gray-400)",
          marginBottom: 10,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function QaSection({ courseId, lesson, content }: { courseId: string; lesson: LessonSummary; content: LessonContent }) {
  const high = content.blocks.filter((b) => b.qaIssue?.severity === "high").length;
  const medium = content.blocks.filter((b) => b.qaIssue?.severity === "medium").length;

  if (!lesson.hasIssues) {
    return (
      <RailSection title="QA-статус">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(46,204,113,0.06)",
            border: "1px solid rgba(46,204,113,0.12)",
            marginBottom: 16,
          }}
        >
          <Check style={{ width: 14, height: 14, color: "#2ECC71", flexShrink: 0 }} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "12px", color: "#2ECC71" }}>Нет замечаний</span>
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 12px",
              borderRadius: 9,
              background: "rgba(231,76,60,0.05)",
              border: "1px solid rgba(231,76,60,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <AlertTriangle style={{ width: 13, height: 13, color: "#E74C3C" }} />
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "12px", color: "var(--gray-800)" }}>Высокий риск</span>
            </div>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: "16px", color: "#E74C3C" }}>{high}</span>
          </div>
        )}

        {medium > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 12px",
              borderRadius: 9,
              background: "rgba(241,196,15,0.05)",
              border: "1px solid rgba(241,196,15,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <AlertCircle style={{ width: 13, height: 13, color: "#F1C40F" }} />
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "12px", color: "var(--gray-800)" }}>Средний риск</span>
            </div>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: "16px", color: "#F1C40F" }}>{medium}</span>
          </div>
        )}
      </div>

      <Link
        to={`/app/qa/${courseId}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: "11.5px",
          color: "var(--gray-500)",
          textDecoration: "none",
          transition: "color 0.12s",
          marginBottom: 16,
        }}
      >
        Полный QA-отчёт
        <ExternalLink style={{ width: 11, height: 11 }} />
      </Link>
    </RailSection>
  );
}

function GenerationProgressSection({ modules }: { modules: ModuleSummary[] }) {
  const lessons = modules.flatMap((module) => module.lessons);
  const total = lessons.length;
  const generated = lessons.filter((lesson) => lesson.status !== "empty" && lesson.status !== "draft").length;
  const empty = total - generated;

  if (total === 0) return null;

  if (empty === total) {
    return (
      <RailSection title="Генерация">
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold leading-5 text-slate-600">
          Контент уроков ещё не создан. Сначала сгенерируйте содержание курса или отдельного урока.
        </div>
      </RailSection>
    );
  }

  if (empty > 0) {
    return (
      <RailSection title="Генерация">
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800">
          Сгенерированы не все уроки: {generated} из {total}. Можно повторить генерацию для оставшихся {empty}.
        </div>
      </RailSection>
    );
  }

  return (
    <RailSection title="Генерация">
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold leading-5 text-emerald-700">
        Все уроки имеют сгенерированное содержание.
      </div>
    </RailSection>
  );
}

function AiActionsSection({ onGenerateLesson, onGenerateCourseContent, onRegenerateBlock, onGenerateLessonQuiz, onGenerateCourseQuiz, busy = false, sources = [], content }: Pick<IntelligenceRailProps, "onGenerateLesson" | "onGenerateCourseContent" | "onRegenerateBlock" | "onGenerateLessonQuiz" | "onGenerateCourseQuiz" | "busy" | "content"> & { sources?: CourseSourceSummary[] }) {
  const hasSources = sources.length > 0;
  const onlySource = sources.some((source) => source.onlySourceMode);
  const hasBlockContent = (blockType: AiBlockType) => Boolean(content.blocks.find((block) => block.id === blockType)?.content.trim());
  return (
    <RailSection title="AI-действия" borderTop>
      {hasSources && (
        <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-semibold leading-5 text-blue-800">
          {onlySource
            ? "Включён строгий режим: ИИ не будет добавлять факты вне источника."
            : "Материал будет сгенерирован с учётом источника."}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onGenerateLesson}
          disabled={busy || !onGenerateLesson}
          className="rounded-xl bg-[var(--brand-blue)] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {busy ? "Генерация…" : "Сгенерировать урок"}
        </button>
        <button
          type="button"
          onClick={onGenerateCourseContent}
          disabled={busy || !onGenerateCourseContent}
          className="rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-bold text-[var(--gray-700)] disabled:opacity-50"
        >
          Сгенерировать весь курс
        </button>
        <button
          type="button"
          onClick={onGenerateLessonQuiz}
          disabled={busy || !onGenerateLessonQuiz}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 disabled:opacity-50"
        >
          Сгенерировать квиз урока
        </button>
        <button
          type="button"
          onClick={onGenerateCourseQuiz}
          disabled={busy || !onGenerateCourseQuiz}
          className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-700 disabled:opacity-50"
        >
          Сгенерировать итоговый квиз
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[360px]:gap-1.5">
        {AI_ACTIONS.map(({ icon: Icon, label, sub, color, blockType, command }) => {
          const disabled = busy || !onRegenerateBlock || !hasBlockContent(blockType);
          return (
          <button
            key={blockType + ":" + command}
            title={hasBlockContent(blockType) ? sub : "Этот блок ещё не создан"}
            type="button"
            disabled={disabled}
            onClick={() => onRegenerateBlock?.(blockType, command)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "10px 11px",
              borderRadius: 10,
              fontFamily: FONT,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-xs)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.55 : 1,
              transition: "all 0.12s",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: `${color}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 7,
              }}
            >
              <Icon style={{ width: 13, height: 13, color }} />
            </div>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "11px", color: "var(--gray-900)", lineHeight: 1.3 }}>{label}</span>
            <span style={{ fontFamily: FONT, fontSize: "10px", color: "var(--gray-400)", marginTop: 2, lineHeight: 1.3 }}>{sub}</span>
          </button>
          );
        })}
      </div>
    </RailSection>
  );
}

function SourcesSection({ sources }: { sources: CourseSourceSummary[] }) {
  const onlySource = sources.some((src) => src.onlySourceMode);
  return (
    <RailSection title="Источники" borderTop>
      {sources.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-blue-700">
            Курс по источнику
          </span>
          {onlySource && (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
              Только источник
            </span>
          )}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        {sources.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold leading-5 text-slate-500">
            Источники не добавлены.
          </div>
        ) : (
          sources.map((src, i) => (
            <div
              key={src.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
                borderBottom: i < sources.length - 1 ? "1px solid var(--border-xs)" : "none",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  flexShrink: 0,
                  background: "rgba(46,204,113,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText style={{ width: 13, height: 13, color: "#2ECC71" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: FONT,
                    fontWeight: 700,
                    fontSize: "11.5px",
                    color: "var(--gray-800)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {src.label}
                </p>
                <p style={{ fontFamily: FONT, fontSize: "10px", color: "var(--gray-400)" }}>
                  {src.description}{src.onlySourceMode ? " · только источник" : ""}{src.isTooShort ? " · короткий" : ""}
                </p>
                {src.warnings?.map((warning) => (
                  <p key={warning} className="mt-1 text-[10px] font-semibold leading-4 text-amber-700">
                    {warning}
                  </p>
                ))}
              </div>
              <Check style={{ width: 12, height: 12, color: "#2ECC71", flexShrink: 0 }} />
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        disabled
        title="Добавление источников выполняется на экране создания курса"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: "11px",
          color: "var(--gray-400)",
          background: "transparent",
          border: "none",
          cursor: "not-allowed",
          opacity: 0.7,
          marginBottom: 16,
        }}
      >
        <Plus style={{ width: 11, height: 11 }} />
        Добавить источник
      </button>
    </RailSection>
  );
}

function VersionSection({ courseId, course }: { courseId: string; course: CourseEditorMeta }) {
  return (
    <RailSection title="Версия" borderTop>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {([
          ["Версия", course.version ?? "нет версий"],
          ["Сохранено", course.lastSaved ?? "—"],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: FONT, fontSize: "11.5px", color: "var(--gray-400)" }}>{k}</span>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "11.5px", color: "var(--gray-700)" }}>{v}</span>
          </div>
        ))}
      </div>

      <Link
        to={`/app/versions/${courseId}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: "11.5px",
          color: "var(--gray-500)",
          textDecoration: "none",
          transition: "color 0.12s",
          marginBottom: 24,
        }}
      >
        <HistoryIcon style={{ width: 11, height: 11 }} />
        История версий
      </Link>
    </RailSection>
  );
}

export function IntelligenceRail({ courseId, lesson, content, course, onGenerateLesson, onGenerateCourseContent, onRegenerateBlock, onGenerateLessonQuiz, onGenerateCourseQuiz, busy = false, modules, sources, className }: IntelligenceRailProps) {
  return (
    <aside
      className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-y-auto bg-[var(--editor-assistant-rail)]", className)}
      style={{ fontFamily: FONT }}
    >
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-xs)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: "color-mix(in srgb, var(--brand-blue) 14%, var(--editor-assistant-rail))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles style={{ width: 11, height: 11, color: "var(--brand-blue)" }} />
        </div>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: "11px", color: "var(--gray-700)", letterSpacing: "0.01em" }}>
          Ассистент
        </span>
      </div>

      <div style={{ flex: 1 }}>
        <QaSection courseId={courseId} lesson={lesson} content={content} />
        <GenerationProgressSection modules={modules} />
        <AiActionsSection onGenerateLesson={onGenerateLesson} onGenerateCourseContent={onGenerateCourseContent} onRegenerateBlock={onRegenerateBlock} onGenerateLessonQuiz={onGenerateLessonQuiz} onGenerateCourseQuiz={onGenerateCourseQuiz} busy={busy} sources={sources} content={content} />
        <SourcesSection sources={sources} />
        <VersionSection courseId={courseId} course={course} />
      </div>
    </aside>
  );
}
