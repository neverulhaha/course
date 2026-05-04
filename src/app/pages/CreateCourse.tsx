import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { createCourseDraft } from "@/services/courseCreation.service";
import { generateCourse } from "@/services/aiGeneration.service";
import {
  CREATE_COURSE_FORM_DEFAULT,
  mapCreateCourseFormToDraftInput,
  validateCreateCourseFormForSubmit,
  MIN_TEXT_SOURCE_LENGTH,
  type CreateCourseFormValues,
  type CreateCourseGenerationMode,
} from "@/entities/course/createCourseDraft";
import { GENERATION_DEPTH_OPTIONS, generationDepthLabel } from "@/entities/course/types";
import {
  Sparkles,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  Target,
  Clock,
  Layers,
  BookOpen,
  ChevronLeft,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────── */

type CourseType = CreateCourseGenerationMode;
type Level = "Начальный" | "Средний" | "Продвинутый";
type Format = "Теория" | "Практика" | "Смешанный";
type FormData = CreateCourseFormValues;

/* ─── Step map ────────────────────────────────────────────── */

type StepId = "type" | "info" | "source" | "options" | "review";

function getSteps(type: CourseType | null): { id: StepId; label: string }[] {
  const base = [
    { id: "type"    as StepId, label: "Тип"        },
    { id: "info"    as StepId, label: "Параметры"  },
    { id: "options" as StepId, label: "Настройки"  },
    { id: "review"  as StepId, label: "Обзор"      },
  ];
  if (type === "source") {
    return [
      base[0],
      base[1],
      { id: "source" as StepId, label: "Источник" },
      base[2],
      base[3],
    ];
  }
  return base;
}

function canProceed(id: StepId, data: FormData): boolean {
  if (id === "type")   return data.type !== null;
  if (id === "info")   return data.topic.trim().length > 2;
  if (id === "source") {
    return data.sourceType === "text" && data.sourceContent.trim().length >= MIN_TEXT_SOURCE_LENGTH;
  }
  return true;
}

/* ─── Constants ───────────────────────────────────────────── */

const FONT = "'Montserrat', sans-serif";

const LEVELS:    Level[]  = ["Начальный", "Средний", "Продвинутый"];
const DURATIONS: string[] = ["2–3 нед.", "4–6 нед.", "2–3 мес.", "3–6 мес."];
const FORMATS:   Format[] = ["Теория", "Практика", "Смешанный"];

/* ─── Primitives ──────────────────────────────────────────── */

/** Mobile / narrow: current step + segment bar — full indicator on md+ */
function StepProgressCompact({ steps, current }: { steps: { label: string }[]; current: number }) {
  const label = steps[current]?.label ?? "";
  return (
    <div className="mb-6 w-full md:hidden" style={{ fontFamily: FONT }}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-500)]"
        >
          Шаг {current + 1} из {steps.length}
        </span>
        <span
          className="max-w-[65%] truncate text-right text-sm font-bold text-[var(--brand-blue)] sm:max-w-[70%]"
          title={label}
        >
          {label}
        </span>
      </div>
      <div
        className="flex h-1.5 gap-1 rounded-full bg-[var(--gray-100)] p-px"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label={`Шаг ${current + 1} из ${steps.length}`}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            className="min-w-0 flex-1 rounded-full transition-colors duration-200"
            style={{
              background: i <= current ? "var(--brand-blue)" : "var(--border-md)",
              opacity: i === current ? 1 : i < current ? 0.9 : 0.45,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StepIndicator({ steps, current }: { steps: { label: string }[]; current: number }) {
  return (
    <div
      className="mb-8 hidden w-full items-start overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex lg:mb-10 [&::-webkit-scrollbar]:hidden"
      style={{ fontFamily: FONT }}
    >
      {steps.map(({ label }, i) => (
        <div
          key={label}
          className="flex min-w-[4.25rem] flex-1 items-start sm:min-w-[4.75rem] lg:min-w-0"
        >
          <div className="flex w-full min-w-0 flex-col items-center">
            <div
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 lg:size-7 lg:text-[11px]"
              style={{
                background:
                  i < current ? "var(--brand-blue)" :
                  i === current ? "var(--bg-surface)" : "var(--gray-100)",
                border:
                  i === current ? "2px solid var(--brand-blue)" :
                  i < current ? "none" :
                  "1.5px solid var(--border-md)",
                color:
                  i < current ? "#FFFFFF" :
                  i === current ? "var(--brand-blue)" : "var(--gray-400)",
              }}
            >
              {i < current ? <Check className="size-3" strokeWidth={2.5} /> : i + 1}
            </div>
            <span
              className="mt-1.5 max-w-[5.5rem] text-center text-[9px] font-semibold leading-tight tracking-wide sm:max-w-[6.5rem] sm:text-[10px] lg:max-w-[7rem]"
              style={{
                fontFamily: FONT,
                color:
                  i === current ? "var(--brand-blue)" :
                  i < current ? "var(--gray-600)" : "var(--gray-400)",
              }}
            >
              {label}
            </span>
          </div>

          {i < steps.length - 1 && (
            <div
              className="mt-3 min-w-[6px] flex-1 lg:mt-[13px]"
              style={{
                height: "1.5px",
                background: i < current ? "var(--brand-blue)" : "var(--border-md)",
                transition: "background 0.2s",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[20px] p-5 shadow-[var(--shadow-sm)] sm:p-7 sm:pb-8 lg:px-9 lg:pb-9 lg:pt-9"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
      }}
    >
      {children}
    </div>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 text-center sm:mb-7 lg:mb-8">
      <h2
        className="text-[length:var(--text-lg)] font-extrabold tracking-tight text-[var(--gray-900)] sm:text-[length:var(--text-xl)] lg:text-[length:1.375rem]"
        style={{
          fontFamily: FONT,
          marginBottom: subtitle ? "6px" : 0,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="mx-auto max-w-md px-1 text-[length:var(--text-xs)] leading-snug text-[var(--gray-500)] sm:text-[length:var(--text-sm)] sm:leading-normal"
          style={{ fontFamily: FONT }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function TypeCard({
  selected, onClick, icon: Icon, title, description,
}: {
  selected: boolean; onClick: () => void;
  icon: React.ElementType; title: string; description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-manipulation rounded-2xl px-4 py-6 sm:px-5 sm:py-7"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", width: "100%", cursor: "pointer",
        fontFamily: FONT, transition: "all 0.15s",
        background: selected ? "rgba(74,144,226,0.04)" : "var(--gray-50)",
        border: `1.5px solid ${selected ? "var(--brand-blue)" : "var(--border-md)"}`,
        boxShadow: selected ? "0 0 0 3px rgba(74,144,226,0.08)" : "none",
      }}
    >
      <div
        className="mb-3 size-11 rounded-[14px] sm:mb-3 sm:size-[52px]"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: selected ? "rgba(74,144,226,0.1)" : "var(--bg-surface)",
          border: `1px solid ${selected ? "rgba(74,144,226,0.2)" : "var(--border-sm)"}`,
          transition: "all 0.15s",
        }}
      >
        <Icon className="size-5 sm:size-6" style={{ color: selected ? "var(--brand-blue)" : "var(--gray-500)" }} />
      </div>
      <span
        style={{
          display: "block", fontWeight: 700, marginBottom: 6,
          fontSize: "var(--text-md)", color: selected ? "var(--brand-blue)" : "var(--gray-900)",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: "var(--text-xs)", color: "var(--gray-500)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        {description}
      </span>
    </button>
  );
}

function SegmentedPicker({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex flex-col divide-y divide-[var(--border-sm)] overflow-hidden rounded-[10px] border border-[var(--border-sm)] sm:flex-row sm:divide-x sm:divide-y-0"
      role="group"
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="min-h-11 w-full touch-manipulation px-3 py-2.5 text-center sm:min-h-0 sm:flex-1 sm:px-2.5 sm:py-2"
            style={{
              fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: 600,
              background: active ? "var(--brand-blue)" : "var(--gray-100)",
              color: active ? "#FFFFFF" : "var(--gray-600)",
              border: "none", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: 700,
          color: "var(--gray-700)", letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      {hint && (
        <p style={{ fontFamily: FONT, fontSize: "11px", color: "var(--gray-400)", marginTop: 2 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ─── Step contents ───────────────────────────────────────── */

function StepType({ data, update }: { data: FormData; update: (p: Partial<FormData>) => void }) {
  return (
    <>
      <StepTitle
        title="Как создадим курс?"
        subtitle="Выберите подход к созданию курса"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
        <TypeCard
          selected={data.type === "scratch"}
          onClick={() => update({ type: "scratch" })}
          icon={Sparkles}
          title="С нуля"
          description="ИИ создаст курс из темы и ваших пожеланий"
        />
        <TypeCard
          selected={data.type === "source"}
          onClick={() => update({ type: "source" })}
          icon={FileText}
          title="По источнику"
          description="Добавьте материал — курс будет основан на нём"
        />
      </div>
    </>
  );
}

function StepInfo({ data, update }: { data: FormData; update: (p: Partial<FormData>) => void }) {
  return (
    <>
      <StepTitle
        title="О вашем курсе"
        subtitle="Эти параметры помогут ИИ сгенерировать точную структуру"
      />
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* Topic */}
        <div>
          <FieldLabel label="Тема курса" hint="Чем конкретнее — тем лучше результат" />
          <input
            type="text"
            className="vs-input min-h-11 w-full text-[length:var(--text-base)] sm:min-h-12 sm:text-[length:var(--text-md)]"
            style={{ fontFamily: FONT }}
            placeholder="Например: Основы Python для начинающих"
            value={data.topic}
            onChange={(e) => update({ topic: e.target.value })}
            autoFocus
          />
        </div>

        {/* Level */}
        <div>
          <FieldLabel label="Уровень сложности" />
          <SegmentedPicker
            options={LEVELS}
            value={data.level}
            onChange={(v) => update({ level: v as Level })}
          />
        </div>

        {/* Duration */}
        <div>
          <FieldLabel label="Длительность" />
          <SegmentedPicker
            options={DURATIONS}
            value={data.duration}
            onChange={(v) => update({ duration: v })}
          />
        </div>

        {/* Goal */}
        <div>
          <FieldLabel
            label="Цель обучения"
            hint="Что студент будет уметь после курса (необязательно)"
          />
          <textarea
            className="vs-input min-h-20 w-full resize-y py-3 sm:min-h-[88px]"
            style={{ fontFamily: FONT }}
            placeholder="Например: Студенты смогут писать базовые программы на Python..."
            value={data.goal}
            onChange={(e) => update({ goal: e.target.value })}
            rows={3}
          />
        </div>
      </div>
    </>
  );
}

function StepSource({ data, update }: { data: FormData; update: (p: Partial<FormData>) => void }) {
  return (
    <>
      <StepTitle
        title="Добавьте источник"
        subtitle="ИИ создаст курс на основе ваших материалов"
      />
      <div className="flex flex-col gap-4 sm:gap-5">

        {data.sourceType === "text" && (
          <div>
            <FieldLabel label="Исходный текст" />
            <textarea
              className="vs-input w-full resize-y py-3 text-[length:var(--text-xs)] leading-relaxed min-h-[140px] max-h-[min(50vh,320px)] sm:min-h-[180px] sm:max-h-[min(55vh,380px)] lg:min-h-[200px]"
              style={{ fontFamily: FONT }}
              placeholder="Вставьте текст вашего материала здесь..."
              value={data.sourceContent}
              onChange={(e) => update({ sourceContent: e.target.value })}
              rows={7}
            />
            <p style={{ fontFamily: FONT, fontSize: "11px", color: data.sourceContent.trim().length >= MIN_TEXT_SOURCE_LENGTH ? "var(--gray-400)" : "#B45309", marginTop: 6 }}>
              {data.sourceContent.length > 0
                ? `${data.sourceContent.length} из ${MIN_TEXT_SOURCE_LENGTH} символов`
                : `Минимум ${MIN_TEXT_SOURCE_LENGTH} символов`}
            </p>
          </div>
        )}


        <label
          className="flex cursor-pointer flex-col gap-3 rounded-xl border border-[var(--border-xs)] bg-[var(--gray-50)] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
        >
          <div className="min-w-0 pr-1 sm:pr-2">
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--gray-900)" }}>
              Строго следовать источнику
            </p>
            <p style={{ fontFamily: FONT, fontSize: "11px", color: "var(--gray-500)", marginTop: 2 }}>
              Не добавлять информацию, отсутствующую в материале
            </p>
          </div>
          <button
            type="button"
            onClick={() => update({ useOnlySource: !data.useOnlySource })}
            className="touch-manipulation relative h-[22px] w-10 shrink-0 self-end rounded-[11px] border-none sm:self-center sm:ml-0"
            style={{
              background: data.useOnlySource ? "var(--brand-blue)" : "var(--gray-200)",
              cursor: "pointer", transition: "background 0.2s",
            }}
          >
            <span
              style={{
                position: "absolute", top: 2, width: 18, height: 18,
                borderRadius: "50%", background: "var(--bg-surface)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                transition: "left 0.2s",
                left: data.useOnlySource ? 20 : 2,
              }}
            />
          </button>
        </label>
      </div>
    </>
  );
}

function StepOptions({ data, update }: { data: FormData; update: (p: Partial<FormData>) => void }) {
  return (
    <>
      <StepTitle
        title="Настройки генерации"
        subtitle="Выберите, насколько подробным будет курс"
      />
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* Depth */}
        <div>
          <FieldLabel label="Глубина генерации" />
          <div className="flex flex-col gap-2">
            {GENERATION_DEPTH_OPTIONS.map((opt) => {
              const active = data.generationDepth === opt.value;
              return (
                <label
                  key={opt.value}
                  className="flex min-h-[3.25rem] cursor-pointer items-start gap-3 rounded-xl p-3.5 transition-all touch-manipulation sm:min-h-0 sm:items-center sm:gap-3.5 sm:p-4"
                  style={{
                    fontFamily: FONT,
                    background: active ? "rgba(74,144,226,0.04)" : "var(--bg-surface)",
                    border: `1.5px solid ${active ? "var(--brand-blue)" : "var(--border-md)"}`,
                    boxShadow: active ? "0 0 0 3px rgba(74,144,226,0.06)" : "none",
                  }}
                >
                  <input
                    type="radio"
                    name="generationDepth"
                    value={opt.value}
                    checked={active}
                    onChange={() => update({ generationDepth: opt.value })}
                    className="mt-0.5 size-4 shrink-0 sm:mt-0"
                    style={{ accentColor: "var(--brand-blue)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        style={{
                          fontWeight: 700, fontSize: "var(--text-sm)",
                          color: active ? "var(--brand-blue)" : "var(--gray-900)",
                        }}
                      >
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: "10px", fontWeight: 700, padding: "2px 7px",
                            borderRadius: 6,
                            background: "rgba(46,204,113,0.08)", color: "#2ECC71",
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>
                      {opt.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Format */}
        <div>
          <FieldLabel label="Формат материала" hint="Как будет подаваться информация" />
          <SegmentedPicker
            options={FORMATS}
            value={data.format}
            onChange={(v) => update({ format: v as Format })}
          />
        </div>
      </div>
    </>
  );
}

function StepReview({ data }: { data: FormData }) {
  const rows = [
    { icon: BookOpen, label: "Тема",         value: data.topic             },
    { icon: Layers,   label: "Уровень",      value: data.level             },
    { icon: Clock,    label: "Длительность", value: data.duration          },
    { icon: Target,   label: "Глубина",      value: generationDepthLabel(data.generationDepth) },
    { icon: Sparkles, label: "Формат",       value: data.format            },
    ...(data.type === "source" ? [{ icon: FileText, label: "Источник", value: `${data.sourceContent.length} симв.` }] : []),
  ];

  return (
    <>
      <StepTitle
        title="Всё готово"
        subtitle="Проверьте параметры перед генерацией"
      />
      <div
        className="mb-6 overflow-hidden rounded-[14px] border border-[var(--border-xs)] sm:mb-7"
      >
        {rows.map(({ icon: Icon, label, value }, i) => (
          <div
            key={label}
            className="flex gap-3 px-3 py-3 sm:gap-3.5 sm:px-4 sm:py-3"
            style={{
              fontFamily: FONT,
              borderBottom: i < rows.length - 1 ? "1px solid var(--border-xs)" : "none",
              background: i % 2 === 0 ? "var(--bg-surface)" : "var(--gray-50)",
            }}
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(74,144,226,0.08)" }}
            >
              <Icon className="size-4" style={{ color: "var(--brand-blue)" }} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <span
                className="shrink-0 text-[length:var(--text-xs)] text-[var(--gray-500)] sm:w-[5.75rem] sm:min-w-[5.75rem]"
              >
                {label}
              </span>
              <span className="min-w-0 break-words text-[length:var(--text-sm)] font-bold text-[var(--gray-900)]">
                {value || <span style={{ color: "var(--gray-400)", fontWeight: 400, fontStyle: "italic" }}>не указано</span>}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Generation note */}
      <div
        className="flex gap-3 rounded-xl border border-[rgba(74,144,226,0.12)] bg-[rgba(74,144,226,0.04)] p-3.5 sm:gap-3 sm:p-4"
      >
        <Sparkles className="mt-0.5 size-4 shrink-0" style={{ color: "var(--brand-blue)" }} />
        <p
          className="text-[length:var(--text-xs)] leading-[var(--leading-relaxed)] text-[var(--gray-600)]"
          style={{ fontFamily: FONT }}
        >
          {data.generationDepth === "plan"
            ? "Будет создана структура курса с модулями и уроками."
            : data.generationDepth === "plan_lessons"
              ? "Будут созданы структура курса и материалы для всех уроков."
              : "Будут созданы структура, материалы уроков, проверочные вопросы и проверка качества."} Если выбран режим по источнику, материал будет основан на введённом тексте.
        </p>
      </div>
    </>
  );
}

/* ─── Main flow ───────────────────────────────────────────── */

interface FlowProps {
  initialType?: CourseType;
}

function CourseCreationFlow({ initialType }: FlowProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [data, setData] = useState<FormData>({
    ...CREATE_COURSE_FORM_DEFAULT,
    type: initialType ?? null,
  });

  const update = (patch: Partial<FormData>) => setData((d) => ({ ...d, ...patch }));

  const steps = getSteps(data.type);
  const current = steps[stepIndex];
  const isLast  = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;
  const ok      = canProceed(current.id, data);

  const handleNext = () => {
    if (isLast) {
      if (!user?.id) return;
      setSubmitError(null);
      setCreating(true);
      void (async () => {
        const validationError = validateCreateCourseFormForSubmit(data);
        if (validationError) {
          setSubmitError(validationError);
          setCreating(false);
          return;
        }
        const input = mapCreateCourseFormToDraftInput(data);
        const { id, error } = await createCourseDraft(input);
        if (error || !id) {
          setSubmitError(error?.message ?? "Не удалось создать курс");
          setCreating(false);
          return;
        }
        const generated = await generateCourse(id, { depth: data.generationDepth });
        setCreating(false);
        if (generated.error) {
          navigate(`/app/plan/${id}`, { state: { generationError: generated.error } });
          return;
        }
        navigate(`/app/plan/${id}`);
      })();
    } else {
      setStepIndex((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (isFirst) navigate("/app");
    else setStepIndex((s) => s - 1);
  };

  function renderStep() {
    switch (current.id) {
      case "type":    return <StepType    data={data} update={update} />;
      case "info":    return <StepInfo    data={data} update={update} />;
      case "source":  return <StepSource  data={data} update={update} />;
      case "options": return <StepOptions data={data} update={update} />;
      case "review":  return <StepReview  data={data} />;
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: FONT, background: "var(--bg-page)" }}>

      {/* Top bar */}
      <div
        className="grid w-full grid-cols-[minmax(0,auto)_1fr_minmax(0,auto)] items-center gap-x-3 border-b border-[var(--border-xs)] bg-[var(--bg-surface)] px-4 py-3 sm:gap-x-4 sm:px-6 sm:py-4"
      >
        <Link
          to="/app"
          className="inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded-lg py-1.5 pr-1 text-[length:var(--text-xs)] font-semibold text-[var(--gray-500)] no-underline transition-colors hover:text-[var(--gray-900)] touch-manipulation sm:min-h-0 sm:py-0 sm:pr-2"
          style={{ fontFamily: FONT }}
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="truncate">Мои курсы</span>
        </Link>

        <div className="flex min-w-0 justify-center overflow-hidden">
          <div
            className="hidden max-w-full items-center gap-2 sm:flex"
            style={{
              fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: 700,
              color: "var(--gray-900)",
            }}
          >
            <Sparkles className="size-4 shrink-0 text-[var(--brand-blue)]" />
            <span className="truncate">Создание курса</span>
          </div>
        </div>

        <span
          className="justify-self-end tabular-nums text-[11px] font-semibold text-[var(--gray-400)]"
          style={{ fontFamily: FONT }}
        >
          {stepIndex + 1} / {steps.length}
        </span>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-xl px-4 pb-14 pt-8 sm:px-5 sm:pb-16 sm:pt-10 lg:max-w-2xl lg:px-8 xl:max-w-4xl 2xl:max-w-5xl">
        <StepProgressCompact steps={steps} current={stepIndex} />
        <StepIndicator steps={steps} current={stepIndex} />

        {/* Step card */}
        <StepCard>
          {renderStep()}
        </StepCard>

        {submitError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div
          className={`mt-5 flex w-full flex-col-reverse gap-3 sm:mt-6 sm:flex-row sm:items-center sm:gap-4 ${isFirst ? "sm:justify-end" : "sm:justify-between"}`}
        >
          {!isFirst && (
            <button
              type="button"
              onClick={handleBack}
              className="vs-btn vs-btn-secondary vs-btn-md order-2 min-h-11 w-full touch-manipulation justify-center sm:order-none sm:min-h-0 sm:w-auto"
            >
              <ArrowLeft className="size-4" />
              Назад
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={creating || !user?.id || !ok}
              className="vs-btn vs-btn-primary vs-btn-lg order-1 min-h-12 w-full touch-manipulation justify-center px-6 sm:min-h-0 sm:w-auto sm:px-7"
              style={{ opacity: creating || !user?.id || !ok ? 0.5 : 1, cursor: creating || !user?.id || !ok ? "not-allowed" : "pointer" }}
            >
              <Sparkles className="size-4 shrink-0" />
              {creating ? "Создаём курс…" : "Сгенерировать курс"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!ok}
              className="vs-btn vs-btn-primary vs-btn-md order-1 min-h-11 w-full touch-manipulation justify-center sm:min-h-0 sm:w-auto"
              style={{ opacity: ok ? 1 : 0.4, cursor: ok ? "pointer" : "not-allowed" }}
            >
              Далее
              <ArrowRight className="size-4 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Route exports ───────────────────────────────────────── */

export { CourseCreationFlow };

export default function CreateCourse() {
  return <CourseCreationFlow />;
}
