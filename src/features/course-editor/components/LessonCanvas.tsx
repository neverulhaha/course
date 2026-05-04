import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, Dumbbell, FileText, RefreshCw, Save, Scissors, Shield, Sparkles, Wand2 } from "lucide-react";
import type { LessonContent, LessonSummary } from "@/entities/course/types";
import type { LessonContentPatch } from "@/services/courseEditor.service";
import type { AiBlockCommand, AiBlockType } from "@/services/aiGeneration.service";
import { StatusBadgeMap } from "@/features/course-editor/courseEditorModel";

const FONT = "'Montserrat', sans-serif";

interface LessonCanvasProps {
  lesson: LessonSummary;
  content: LessonContent;
  onGenerateLesson?: () => void;
  generatingLesson?: boolean;
  onRegenerateBlock?: (blockType: AiBlockType, command: AiBlockCommand) => void;
  regeneratingBlockKey?: string;
  onSaveLessonMeta?: (patch: {
    title: string;
    objective: string | null;
    summary: string | null;
    estimated_duration: number | null;
    learning_outcome: string | null;
  }) => void;
  onSaveLessonContent?: (patch: LessonContentPatch) => void;
  savingKey?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
}

const BLOCK_ACTIONS: Record<AiBlockType, Array<{ label: string; title: string; command: AiBlockCommand; icon: typeof RefreshCw }>> = {
  theory_text: [
    { label: "Сократить", title: "Сократить текст", command: "shorten", icon: Scissors },
    { label: "Упростить", title: "Упростить объяснение", command: "simplify", icon: Wand2 },
    { label: "Подробнее", title: "Сделать подробнее", command: "expand", icon: BookOpen },
    { label: "Яснее", title: "Улучшить ясность", command: "improve_clarity", icon: RefreshCw },
  ],
  examples_text: [
    { label: "Примеры", title: "Добавить примеры", command: "add_examples", icon: BookOpen },
    { label: "Упростить", title: "Упростить примеры", command: "simplify", icon: Wand2 },
    { label: "Подробнее", title: "Сделать подробнее", command: "expand", icon: RefreshCw },
  ],
  practice_text: [
    { label: "Практика", title: "Добавить практику", command: "add_practice", icon: Dumbbell },
    { label: "Упростить", title: "Упростить практическое задание", command: "simplify", icon: Wand2 },
    { label: "Яснее", title: "Улучшить ясность", command: "improve_clarity", icon: RefreshCw },
  ],
  checklist_text: [
    { label: "Упростить", title: "Упростить чек-лист", command: "simplify", icon: Wand2 },
    { label: "Подробнее", title: "Сделать чек-лист подробнее", command: "expand", icon: BookOpen },
    { label: "Яснее", title: "Улучшить ясность", command: "improve_clarity", icon: RefreshCw },
  ],
};

const BLOCK_LABELS: Array<{ id: AiBlockType; type: string; label: string; placeholder: string }> = [
  { id: "theory_text", type: "theory", label: "Теория", placeholder: "Введите теоретический материал урока…" },
  { id: "examples_text", type: "example", label: "Примеры", placeholder: "Введите примеры по теме урока…" },
  { id: "practice_text", type: "practice", label: "Практика", placeholder: "Введите практическое задание…" },
  { id: "checklist_text", type: "checklist", label: "Чек-лист", placeholder: "Введите критерии выполнения или чек-лист…" },
];

const BLOCK_ACCENT: Record<string, string> = {
  theory: "var(--brand-blue)",
  example: "#2ECC71",
  practice: "#F1C40F",
  checklist: "var(--gray-600)",
};

function blockValue(content: LessonContent, id: AiBlockType): string {
  return content.blocks.find((b) => b.id === id)?.content ?? "";
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--gray-400)]">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-y rounded-lg border border-[var(--border-xs)] bg-[var(--bg-surface)] px-3 py-2 text-sm leading-relaxed text-[var(--gray-800)] outline-none focus:border-[var(--brand-blue)]"
          style={{ fontFamily: FONT }}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[var(--border-xs)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--gray-800)] outline-none focus:border-[var(--brand-blue)]"
          style={{ fontFamily: FONT }}
        />
      )}
    </label>
  );
}

function ContentBlock({
  blockId,
  label,
  type,
  value,
  placeholder,
  onChange,
  onRegenerateBlock,
  regeneratingBlockKey,
}: {
  blockId: AiBlockType;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onRegenerateBlock?: (blockType: AiBlockType, command: AiBlockCommand) => void;
  regeneratingBlockKey?: string;
}) {
  const accent = BLOCK_ACCENT[type] ?? "var(--gray-500)";
  const actions = BLOCK_ACTIONS[blockId];
  const canRegenerate = Boolean(onRegenerateBlock && value.trim());

  return (
    <section
      style={{
        borderRadius: 14,
        border: "1px solid var(--border-xs)",
        borderLeft: `3px solid ${accent}44`,
        background: "var(--bg-surface)",
        overflow: "hidden",
      }}
    >
      <div className="flex flex-col gap-2 border-b border-[var(--border-xs)] bg-[var(--gray-50)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: accent }}>
            {label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-[rgba(74,144,226,0.1)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand-blue)]">
            <Sparkles className="size-2.5" />
            ИИ / ручное
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {actions.map(({ icon: Icon, label: actionLabel, title, command }) => {
            const key = blockId + ":" + command;
            const isBusy = regeneratingBlockKey === key;
            return (
              <button
                key={command}
                type="button"
                title={title}
                disabled={!canRegenerate || Boolean(regeneratingBlockKey)}
                onClick={() => onRegenerateBlock?.(blockId, command)}
                className="inline-flex min-h-7 items-center gap-1 rounded-md border border-[var(--border-xs)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-bold text-[var(--gray-600)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Icon className="size-3" />
                {isBusy ? "..." : actionLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 pb-4 pt-3 sm:px-[18px] sm:pb-[18px]">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={Math.max(5, Math.min(12, Math.ceil(value.length / 180)))}
          className="w-full resize-y rounded-lg border border-[var(--border-xs)] bg-[var(--gray-50)] px-3 py-3 text-[14px] leading-[1.7] text-[var(--gray-800)] outline-none focus:border-[var(--brand-blue)]"
          style={{ fontFamily: FONT }}
        />
      </div>
    </section>
  );
}

function LessonEmptyState({ onGenerateLesson, generatingLesson = false }: { onGenerateLesson?: () => void; generatingLesson?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center sm:px-8 sm:py-12">
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(74,144,226,0.07)", border: "1px solid rgba(74,144,226,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <FileText className="size-6 text-[var(--brand-blue)]" />
      </div>
      <h3 className="mb-2 text-lg font-extrabold text-[var(--gray-900)]">Урок пуст</h3>
      <p className="mb-6 max-w-md text-sm leading-relaxed text-[var(--gray-500)]">
        Сгенерируйте содержание урока с помощью ИИ или введите блоки вручную и нажмите «Сохранить содержимое».
      </p>
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--brand-blue)] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onGenerateLesson}
        disabled={generatingLesson || !onGenerateLesson}
      >
        <Sparkles className="size-3.5" />
        {generatingLesson ? "Генерация…" : "Сгенерировать урок"}
      </button>
    </div>
  );
}

export function LessonCanvas({
  lesson,
  content,
  onGenerateLesson,
  generatingLesson = false,
  onRegenerateBlock,
  regeneratingBlockKey,
  onSaveLessonMeta,
  onSaveLessonContent,
  savingKey,
  onDirtyChange,
}: LessonCanvasProps) {
  const [title, setTitle] = useState(lesson.title);
  const [objective, setObjective] = useState(lesson.objective ?? content.goal ?? "");
  const [summary, setSummary] = useState(lesson.summary ?? "");
  const [duration, setDuration] = useState(lesson.estimatedDuration != null ? String(lesson.estimatedDuration) : "");
  const [learningOutcome, setLearningOutcome] = useState(lesson.learningOutcome ?? "");
  const [blocks, setBlocks] = useState<Record<AiBlockType, string>>({
    theory_text: blockValue(content, "theory_text"),
    examples_text: blockValue(content, "examples_text"),
    practice_text: blockValue(content, "practice_text"),
    checklist_text: blockValue(content, "checklist_text"),
  });

  useEffect(() => {
    setTitle(lesson.title);
    setObjective(lesson.objective ?? content.goal ?? "");
    setSummary(lesson.summary ?? "");
    setDuration(lesson.estimatedDuration != null ? String(lesson.estimatedDuration) : "");
    setLearningOutcome(lesson.learningOutcome ?? "");
    setBlocks({
      theory_text: blockValue(content, "theory_text"),
      examples_text: blockValue(content, "examples_text"),
      practice_text: blockValue(content, "practice_text"),
      checklist_text: blockValue(content, "checklist_text"),
    });
    onDirtyChange?.(false);
  }, [lesson.id, content, lesson.title, lesson.objective, lesson.summary, lesson.estimatedDuration, lesson.learningOutcome, onDirtyChange]);

  const initial = useMemo(() => ({
    title: lesson.title,
    objective: lesson.objective ?? content.goal ?? "",
    summary: lesson.summary ?? "",
    duration: lesson.estimatedDuration != null ? String(lesson.estimatedDuration) : "",
    learningOutcome: lesson.learningOutcome ?? "",
    theory_text: blockValue(content, "theory_text"),
    examples_text: blockValue(content, "examples_text"),
    practice_text: blockValue(content, "practice_text"),
    checklist_text: blockValue(content, "checklist_text"),
  }), [lesson, content]);

  const dirty = title !== initial.title ||
    objective !== initial.objective ||
    summary !== initial.summary ||
    duration !== initial.duration ||
    learningOutcome !== initial.learningOutcome ||
    blocks.theory_text !== initial.theory_text ||
    blocks.examples_text !== initial.examples_text ||
    blocks.practice_text !== initial.practice_text ||
    blocks.checklist_text !== initial.checklist_text;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const hasAnyBlockText = Object.values(blocks).some((value) => value.trim().length > 0);
  const issueCount = content.blocks.filter((b) => b.qaIssue).length;
  const badge = StatusBadgeMap[lesson.status] ?? StatusBadgeMap.empty;

  const saveMeta = () => {
    onSaveLessonMeta?.({
      title: title.trim() || "Без названия",
      objective: toNullableText(objective),
      summary: toNullableText(summary),
      estimated_duration: toNullableNumber(duration),
      learning_outcome: toNullableText(learningOutcome),
    });
  };

  const saveContent = () => {
    onSaveLessonContent?.({
      theory_text: toNullableText(blocks.theory_text),
      examples_text: toNullableText(blocks.examples_text),
      practice_text: toNullableText(blocks.practice_text),
      checklist_text: toNullableText(blocks.checklist_text),
    });
  };

  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--gray-50)]" style={{ fontFamily: FONT }}>
      <div className="mx-auto max-w-[760px] px-4 pb-28 pt-6 sm:px-6 sm:pb-24 sm:pt-8 lg:px-10 lg:pb-20 lg:pt-9">
        <header className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--gray-100)] px-2 py-1 text-[10px] font-bold text-[var(--gray-600)]">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot }} />
              {badge.label}
            </span>
            {lesson.hasIssues && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(241,196,15,0.18)] bg-[rgba(241,196,15,0.09)] px-2 py-1 text-[10px] font-bold text-[#F1C40F]">
                <AlertCircle className="size-3" />
                {issueCount} замечания
              </span>
            )}
            {lesson.qaScore !== null && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[rgba(74,144,226,0.08)] px-2 py-1 text-[10px] font-bold text-[var(--brand-blue)]">
                <Shield className="size-3" />
                {lesson.qaScore}
              </span>
            )}
            {dirty && <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Есть несохранённые изменения</span>}
          </div>

          <div className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 shadow-sm">
            <div className="grid gap-3">
              <Field label="Название урока" value={title} onChange={setTitle} />
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <Field label="Цель урока" value={objective} onChange={setObjective} multiline />
                <Field label="Минуты" value={duration} onChange={setDuration} placeholder="15" />
              </div>
              <Field label="Краткое описание" value={summary} onChange={setSummary} multiline />
              <Field label="Результат обучения" value={learningOutcome} onChange={setLearningOutcome} multiline />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={saveMeta}
                  disabled={savingKey === "lesson-meta" || !onSaveLessonMeta}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--border-sm)] px-3 text-xs font-bold text-[var(--gray-700)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="size-3.5" />
                  {savingKey === "lesson-meta" ? "Сохранение…" : "Сохранить параметры урока"}
                </button>
              </div>
            </div>
          </div>
        </header>

        {!hasAnyBlockText && <LessonEmptyState onGenerateLesson={onGenerateLesson} generatingLesson={generatingLesson} />}

        <div className="flex flex-col gap-3">
          {BLOCK_LABELS.map((block) => (
            <ContentBlock
              key={block.id}
              blockId={block.id}
              label={block.label}
              type={block.type}
              value={blocks[block.id]}
              placeholder={block.placeholder}
              onChange={(value) => setBlocks((previous) => ({ ...previous, [block.id]: value }))}
              onRegenerateBlock={onRegenerateBlock}
              regeneratingBlockKey={regeneratingBlockKey}
            />
          ))}
        </div>

        <div className="sticky bottom-4 mt-4 flex flex-wrap justify-end gap-2 rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)]/95 p-3 shadow-md backdrop-blur">
          <button
            type="button"
            onClick={saveContent}
            disabled={savingKey === "lesson-content" || !onSaveLessonContent || !hasAnyBlockText}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="size-4" />
            {savingKey === "lesson-content" ? "Сохранение…" : "Сохранить содержимое"}
          </button>
        </div>
      </div>
    </main>
  );
}
