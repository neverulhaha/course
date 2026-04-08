import { useState, useMemo, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { cn } from "@/app/components/ui/utils";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Menu,
  X,
  BookOpen,
  Clock,
  Sparkles,
  Code2,
  List,
  PenLine,
  Play,
} from "lucide-react";
import type { PlayerCourse, PlayerLesson } from "@/entities/course/types";

/* ─── Constants ───────────────────────────────────────────── */

const FONT = "'Montserrat', sans-serif";

/* ─── Types ───────────────────────────────────────────────── */

type BlockType = "theory" | "code" | "key-points" | "practice";

interface ContentBlock {
  type: BlockType;
  title: string;
  text?: string;
  items?: string[];
  code?: string;
  codeCaption?: string;
}

interface LessonData {
  title: string;
  description: string;
  duration: string;
  blocks: ContentBlock[];
  nextHint: string;
  hasAssignment: boolean;
  hasQuiz: boolean;
}

/* ─── Block visual config ─────────────────────────────────── */

const BLOCK_CFG: Record<
  BlockType,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  theory:      { label: "Теория",        color: "#4A90E2", bg: "rgba(74,144,226,0.04)",  icon: BookOpen    },
  code:        { label: "Пример кода",   color: "#9B59B6", bg: "rgba(155,89,182,0.04)",  icon: Code2       },
  "key-points":{ label: "Ключевые идеи", color: "#2ECC71", bg: "rgba(46,204,113,0.04)",   icon: Sparkles    },
  practice:    { label: "Практика",      color: "#F1C40F", bg: "rgba(241,196,15,0.04)",   icon: PenLine     },
};

/* ─── Mock data ───────────────────────────────────────────── */

const mockCourse: PlayerCourse = {
  title: "Основы Python для начинающих",
  currentLessonId: "l2",
  modules: [
    {
      id: "m1",
      title: "Введение в Python",
      lessons: [
        { id: "l1", title: "Что такое программирование?",             completed: true  },
        { id: "l2", title: "Установка Python и первая программа",      completed: false, current: true },
        { id: "l3", title: "Переменные и типы данных",                 completed: false },
      ],
    },
    {
      id: "m2",
      title: "Управляющие конструкции",
      lessons: [
        { id: "l4", title: "Условные операторы",    completed: false },
        { id: "l5", title: "Циклы (for и while)",   completed: false },
      ],
    },
  ],
};

const allLessons = mockCourse.modules.flatMap((m) => m.lessons);

const lessonContent: Record<string, LessonData> = {
  l1: {
    title: "Что такое программирование?",
    description: "Основные понятия и подходы к разработке программ",
    duration: "45 мин",
    blocks: [
      {
        type: "theory",
        title: "Основные концепции",
        text: "Программирование — это процесс создания программ, которые выполняют определённые задачи. Программы состоят из последовательности инструкций, написанных на языке программирования.\n\nИнструкции выполняются компьютером строго по порядку. Хорошая программа решает задачу эффективно и понятно для других разработчиков.",
      },
      {
        type: "key-points",
        title: "Ключевые идеи",
        items: [
          "Программа — набор инструкций для компьютера",
          "Инструкции выполняются строго по порядку",
          "Python — один из самых читаемых языков",
        ],
      },
    ],
    nextHint: "В следующем уроке установим Python и напишем первую программу.",
    hasAssignment: false,
    hasQuiz: true,
  },
  l2: {
    title: "Установка Python и первая программа",
    description: "Настройка рабочего окружения и запуск первого скрипта",
    duration: "60 мин",
    blocks: [
      {
        type: "theory",
        title: "Установка Python",
        text: "Python можно скачать с официального сайта python.org. Выберите версию для вашей операционной системы:\n\n• Windows — скачайте установщик и запустите его. Отметьте галочку «Add Python to PATH».\n• macOS — Python предустановлен, но рекомендуется установить последнюю версию через Homebrew.\n• Linux — Python 3 обычно уже установлен. Проверьте командой python3 --version.",
      },
      {
        type: "code",
        title: "Первая программа",
        text: "Откройте терминал или командную строку и введите команду python3. Затем напечатайте следующий код:",
        code: 'print("Hello, World!")',
        codeCaption: "Эта программа выводит на экран текст «Hello, World!»",
      },
      {
        type: "key-points",
        title: "Что запомнить",
        items: [
          "Функция print() выводит текст на экран",
          "Текст в кавычках называется строкой (string)",
          "Python выполняет код сверху вниз",
        ],
      },
      {
        type: "practice",
        title: "Попробуйте сами",
        items: [
          "Установите Python 3.11 или выше",
          'Запустите print("Hello, World!")',
          "Измените текст и запустите снова",
        ],
      },
    ],
    nextHint: "Попробуйте изменить текст в кавычках и запустите программу снова.",
    hasAssignment: true,
    hasQuiz: true,
  },
};

/* ─── Sidebar sub-components ──────────────────────────────── */

function ModuleHeader({
  title,
  expanded,
  onClick,
  total,
  done,
}: {
  title: string; expanded: boolean; onClick: () => void; total: number; done: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-manipulation"
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "7px 14px", background: "none", border: "none",
        cursor: "pointer", transition: "background 0.12s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
    >
      {expanded ? (
        <ChevronDown style={{ width: 13, height: 13, color: "var(--gray-400)", flexShrink: 0 }} />
      ) : (
        <ChevronRight style={{ width: 13, height: 13, color: "var(--gray-400)", flexShrink: 0 }} />
      )}
      <span
        style={{
          flex: 1, textAlign: "left",
          fontFamily: FONT, fontWeight: 700, fontSize: "11px",
          color: "var(--gray-700)", letterSpacing: "0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: FONT, fontWeight: 700, fontSize: "10px",
          color: done === total ? "#2ECC71" : "var(--gray-400)",
          flexShrink: 0,
        }}
      >
        {done}/{total}
      </span>
    </button>
  );
}

function LessonNavItem({
  lesson,
  isActive,
  onClick,
}: {
  lesson: PlayerLesson; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-manipulation"
      style={{
        position: "relative", width: "100%", display: "flex",
        alignItems: "center", gap: 10,
        padding: "7px 14px 7px 30px",
        background: isActive ? "rgba(74,144,226,0.07)" : "none",
        border: "none", cursor: "pointer", textAlign: "left",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "none";
      }}
    >
      {isActive && (
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: 3, borderRadius: "0 3px 3px 0",
            background: "var(--brand-blue)",
          }}
        />
      )}

      {/* Status icon */}
      {lesson.completed ? (
        <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0, color: "#2ECC71" }} />
      ) : isActive ? (
        <div
          style={{
            width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
            background: "var(--brand-blue)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Play style={{ width: 7, height: 7, color: "white" }} />
        </div>
      ) : (
        <Circle style={{ width: 14, height: 14, flexShrink: 0, color: "var(--gray-300)" }} />
      )}

      <span
        style={{
          fontFamily: FONT,
          fontWeight: isActive ? 600 : 500,
          fontSize: "12px",
          color: isActive ? "var(--brand-blue)" : lesson.completed ? "var(--gray-500)" : "var(--gray-700)",
          lineHeight: 1.4,
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          whiteSpace: "normal",
        }}
      >
        {lesson.title}
      </span>
    </button>
  );
}

/* ─── Content block renderers ─────────────────────────────── */

function TheoryBlock({ block }: { block: ContentBlock }) {
  const cfg = BLOCK_CFG.theory;
  const Icon = cfg.icon;

  return (
    <div
      className="rounded-xl px-4 py-4 sm:px-5 sm:py-5 sm:pr-[22px]"
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
        borderTopColor: `${cfg.color}20`,
        borderRightColor: `${cfg.color}20`,
        borderBottomColor: `${cfg.color}20`,
        borderLeftColor: cfg.color,
        fontFamily: FONT,
      }}
    >
      <div className="mb-3 flex items-center gap-2 sm:mb-3.5 sm:gap-2">
        <Icon style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "9px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: cfg.color,
          }}
        >
          {block.title}
        </span>
      </div>
      {block.text && (
        <div>
          {block.text.split("\n\n").map((para, i) => (
            <p
              key={i}
              className="text-[length:var(--text-base)] sm:text-[15px]"
              style={{
                fontFamily: FONT,
                color: "var(--gray-800)", lineHeight: 1.75,
                marginBottom: i < block.text!.split("\n\n").length - 1 ? 16 : 0,
              }}
            >
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ block }: { block: ContentBlock }) {
  const cfg = BLOCK_CFG.code;
  const Icon = cfg.icon;

  return (
    <div className="min-w-0" style={{ fontFamily: FONT }}>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "9px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: cfg.color,
          }}
        >
          {block.title}
        </span>
      </div>

      {block.text && (
        <p
          className="mb-3 text-sm leading-relaxed text-[var(--gray-600)]"
          style={{ fontFamily: FONT }}
        >
          {block.text}
        </p>
      )}

      {block.code && (
        <>
          <pre
            className="overflow-x-auto rounded-xl p-3.5 text-xs sm:p-[18px] sm:text-sm"
            style={{
              background: "#000000",
              color: "#e2e8f0",
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            <code>{block.code}</code>
          </pre>
          {block.codeCaption && (
            <p
              style={{
                fontFamily: FONT, fontSize: "11.5px",
                color: "var(--gray-400)", marginTop: 8, fontStyle: "italic",
              }}
            >
              {block.codeCaption}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function KeyPointsBlock({ block }: { block: ContentBlock }) {
  const cfg = BLOCK_CFG["key-points"];
  const Icon = cfg.icon;

  return (
    <div
      className="rounded-xl px-4 py-4 sm:px-5 sm:py-5 sm:pr-[22px]"
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
        borderTopColor: `${cfg.color}20`,
        borderRightColor: `${cfg.color}20`,
        borderBottomColor: `${cfg.color}20`,
        borderLeftColor: cfg.color,
        fontFamily: FONT,
      }}
    >
      <div className="mb-3 flex items-center gap-2 sm:mb-3.5 sm:gap-2">
        <Icon style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "9px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: cfg.color,
          }}
        >
          {block.title}
        </span>
      </div>
      {block.items && (
        <ul className="flex flex-col gap-2.5 sm:gap-2.5" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {block.items.map((item, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <CheckCircle2
                style={{
                  width: 15, height: 15, flexShrink: 0,
                  color: cfg.color, marginTop: 2,
                }}
              />
              <span
                style={{
                  fontFamily: FONT, fontSize: "14px",
                  color: "var(--gray-800)", lineHeight: 1.6,
                }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PracticeBlock({ block }: { block: ContentBlock }) {
  const cfg = BLOCK_CFG.practice;
  const Icon = cfg.icon;

  return (
    <div
      className="rounded-xl px-4 py-4 sm:px-5 sm:py-5 sm:pr-[22px]"
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
        borderTopColor: `${cfg.color}20`,
        borderRightColor: `${cfg.color}20`,
        borderBottomColor: `${cfg.color}20`,
        borderLeftColor: cfg.color,
        fontFamily: FONT,
      }}
    >
      <div className="mb-3 flex items-center gap-2 sm:mb-3.5 sm:gap-2">
        <Icon style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: FONT, fontWeight: 800,
            fontSize: "9px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: cfg.color,
          }}
        >
          {block.title}
        </span>
      </div>
      {block.items && (
        <ol className="flex flex-col gap-2 sm:gap-2" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {block.items.map((item, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: `${cfg.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FONT, fontWeight: 800, fontSize: "10px",
                  color: cfg.color,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: FONT, fontSize: "14px",
                  color: "var(--gray-800)", lineHeight: 1.6, paddingTop: 2,
                }}
              >
                {item}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  if (block.type === "theory")      return <TheoryBlock block={block} />;
  if (block.type === "code")        return <CodeBlock block={block} />;
  if (block.type === "key-points")  return <KeyPointsBlock block={block} />;
  if (block.type === "practice")    return <PracticeBlock block={block} />;
  return null;
}

/* ─── Activity cards ──────────────────────────────────────── */

function ActivityCard({
  title, sub, icon: Icon, color, to,
}: {
  title: string; sub: string; icon: React.ElementType;
  color: string; to: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-[100px] touch-manipulation flex-col gap-2.5 rounded-xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)] sm:gap-2.5 sm:p-[16px] sm:pr-[18px]"
      style={{
        textDecoration: "none",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLElement).style.borderColor = color + "40";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-xs)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: 34, height: 34, borderRadius: 10,
          background: color + "10",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon style={{ width: 17, height: 17, color }} />
      </div>
      <div>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "13.5px", color: "var(--gray-900)", marginBottom: 3 }}>
          {title}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "11.5px", color: "var(--gray-500)" }}>
          {sub}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "12px", color }}>
          Начать
        </span>
        <ChevronRight style={{ width: 13, height: 13, color }} />
      </div>
    </Link>
  );
}

/* ─── Main page ───────────────────────────────────────────── */

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const navigate = useNavigate();
  /** Drawer open on <lg only; desktop sidebar always visible */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>(["m1", "m2"]);
  const [completed, setCompleted] = useState(false);

  const activeLessonId = lessonId ?? mockCourse.currentLessonId;

  const activeLesson = useMemo<PlayerLesson>(
    () => allLessons.find((l) => l.id === activeLessonId) ?? allLessons[0],
    [activeLessonId]
  );
  const activeLessonIndex = useMemo(
    () => allLessons.findIndex((l) => l.id === activeLessonId),
    [activeLessonId]
  );
  const prevLesson = activeLessonIndex > 0 ? allLessons[activeLessonIndex - 1] : null;
  const nextLesson = activeLessonIndex < allLessons.length - 1 ? allLessons[activeLessonIndex + 1] : null;

  const content = lessonContent[activeLessonId] ?? lessonContent.l2;
  const completedCount = allLessons.filter((l) => l.completed).length;
  const totalLessons   = allLessons.length;
  const progressPct    = Math.round((completedCount / totalLessons) * 100);

  const go = (lesson: PlayerLesson) => {
    setCompleted(false);
    setMobileNavOpen(false);
    navigate(`/learn/${courseId}/lesson/${lesson.id}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      document.body.style.overflow = mq.matches ? "hidden" : "";
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const toggleModule = (id: string) =>
    setExpandedModules((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleComplete = () => {
    setCompleted(true);
    if (nextLesson) setTimeout(() => go(nextLesson), 600);
  };

  return (
    <div
      className="flex min-h-screen overflow-x-hidden bg-[var(--gray-50)]"
      style={{ fontFamily: FONT }}
    >
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Закрыть меню курса"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ── LEFT: course outline ── */}
      <aside
        className={cn(
          "z-50 flex h-dvh min-h-0 w-[min(100%,288px)] max-w-[92vw] flex-col overflow-hidden border-r border-[var(--border-xs)] bg-[var(--bg-surface)] shadow-xl transition-transform duration-200 ease-out",
          "fixed left-0 top-0 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:max-w-none lg:w-[240px] lg:translate-x-0 lg:shadow-none xl:w-[268px]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Sidebar header */}
        <div
          className="flex shrink-0 flex-col gap-2 border-b border-[var(--border-xs)] px-3 pb-3.5 pt-4 sm:px-4 sm:pb-3.5 sm:pt-[18px]"
        >
          <div className="flex items-center justify-between gap-2 lg:hidden">
            <span className="text-[11px] font-bold text-[var(--gray-500)]" style={{ fontFamily: FONT }}>
              Содержание
            </span>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="flex size-9 touch-manipulation items-center justify-center rounded-lg text-[var(--gray-500)] transition-colors hover:bg-[var(--gray-100)] hover:text-[var(--gray-800)]"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
          </div>
          <Link
            to="/app"
            className="mb-2 inline-flex min-h-9 touch-manipulation items-center gap-1.5 no-underline transition-colors hover:text-[var(--brand-blue)]"
            style={{
              fontFamily: FONT, fontWeight: 600, fontSize: "11px",
              color: "var(--gray-400)",
            }}
          >
            <ArrowLeft className="size-3 shrink-0" />
            Все курсы
          </Link>

          <p
            style={{
              fontFamily: FONT, fontWeight: 800, fontSize: "13px",
              color: "var(--gray-900)", letterSpacing: "-0.01em",
              lineHeight: 1.35, marginBottom: 12,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              whiteSpace: "normal",
            }}
          >
            {mockCourse.title}
          </p>

          {/* Progress */}
          <div>
            <div
              style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 6,
              }}
            >
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "10px", color: "var(--gray-500)" }}>
                Прогресс
              </span>
              <span
                style={{
                  fontFamily: FONT, fontWeight: 800, fontSize: "10px",
                  color: progressPct === 100 ? "#2ECC71" : "var(--brand-blue)",
                }}
              >
                {completedCount}/{totalLessons} уроков
              </span>
            </div>
            <div
              style={{
                height: 5, borderRadius: 99,
                background: "var(--gray-100)", overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%", borderRadius: 99,
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? "#2ECC71" : "var(--brand-blue)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Module/lesson list */}
        <nav
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-2.5"
        >
          {mockCourse.modules.map((mod) => {
            const isExpanded = expandedModules.includes(mod.id);
            const doneLessons = mod.lessons.filter((l) => l.completed).length;

            return (
              <div key={mod.id} style={{ marginBottom: 4 }}>
                <ModuleHeader
                  title={mod.title}
                  expanded={isExpanded}
                  onClick={() => toggleModule(mod.id)}
                  total={mod.lessons.length}
                  done={doneLessons}
                />

                {isExpanded && (
                  <div style={{ paddingBottom: 4 }}>
                    {mod.lessons.map((lesson) => (
                      <LessonNavItem
                        key={lesson.id}
                        lesson={lesson}
                        isActive={lesson.id === activeLessonId}
                        onClick={() => go(lesson)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── RIGHT: MAIN CONTENT ── */}
      <main className="min-h-dvh min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg-surface)]">
        {/* Thin top progress stripe */}
        <div className="h-0.5 bg-[var(--gray-100)]">
          <div
            style={{
              height: "100%",
              width: `${((activeLessonIndex + 1) / totalLessons) * 100}%`,
              background: "var(--brand-blue)",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Toolbar */}
        <div
          className="sticky top-0 z-10 flex flex-col gap-3 border-b border-[var(--border-xs)] bg-[var(--bg-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-2.5 lg:h-[52px] lg:px-8 lg:py-0"
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-lg border-none text-[var(--gray-400)] transition-colors hover:bg-[var(--gray-100)] hover:text-[var(--gray-700)] lg:hidden"
              aria-label="Открыть содержание курса"
            >
              <Menu className="size-4" />
            </button>

            <span
              className="min-w-0 text-[11px] text-[var(--gray-400)] sm:text-xs"
              style={{ fontFamily: FONT }}
            >
              <span className="block sm:inline">
                Урок {activeLessonIndex + 1} из {totalLessons}
              </span>
              {content.duration && (
                <span className="mt-0.5 flex items-center gap-1 sm:ml-2.5 sm:mt-0 sm:inline-flex">
                  <Clock className="size-2.5 shrink-0 sm:size-[11px]" />
                  {content.duration}
                </span>
              )}
            </span>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            {prevLesson && (
              <button
                type="button"
                onClick={() => go(prevLesson)}
                className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1 rounded-lg border border-[var(--border-sm)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--gray-600)] sm:min-h-0 sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
                style={{ fontFamily: FONT, cursor: "pointer", transition: "all 0.12s" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--brand-blue)";
                  e.currentTarget.style.color = "var(--brand-blue)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-sm)";
                  e.currentTarget.style.color = "var(--gray-600)";
                }}
              >
                ← Назад
              </button>
            )}

            {nextLesson ? (
              <button
                type="button"
                onClick={handleComplete}
                className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border-none px-4 py-2.5 text-xs font-bold text-white sm:min-h-0 sm:w-auto sm:px-4 sm:py-1.5 sm:text-xs"
                style={{
                  fontFamily: FONT,
                  background: completed ? "#2ECC71" : "var(--brand-blue)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {completed ? (
                  <><CheckCircle2 className="size-3.5 shrink-0" />Готово</>
                ) : (
                  <>Далее <ChevronRight className="size-3.5 shrink-0" /></>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCompleted(true)}
                className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg border-none px-4 py-2.5 text-xs font-bold text-white sm:min-h-0 sm:w-auto sm:px-4 sm:py-1.5 sm:text-xs"
                style={{
                  fontFamily: FONT,
                  background: completed ? "#2ECC71" : "var(--brand-blue)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <CheckCircle2 className="size-3.5 shrink-0" />
                {completed ? "Завершено!" : "Завершить курс"}
              </button>
            )}
          </div>
        </div>

        {/* Lesson content */}
        <div className="mx-auto max-w-[720px] px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-10 lg:pb-20 lg:pt-12 xl:px-10">
          {/* Lesson header */}
          <div className="mb-8 sm:mb-9 lg:mb-10">
            <div
              className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 sm:mb-4"
              style={{ background: "rgba(74,144,226,0.07)" }}
            >
              <BookOpen style={{ width: 12, height: 12, color: "var(--brand-blue)" }} />
              <span
                style={{
                  fontFamily: FONT, fontWeight: 700, fontSize: "11px",
                  color: "var(--brand-blue)",
                }}
              >
                {mockCourse.modules.find((m) =>
                  m.lessons.some((l) => l.id === activeLessonId)
                )?.title ?? "Урок"}
              </span>
            </div>

            <h1
              className="mb-2.5 text-2xl font-extrabold leading-tight tracking-tight text-[var(--gray-900)] sm:mb-3 sm:text-3xl lg:text-[30px]"
              style={{ fontFamily: FONT }}
            >
              {content.title}
            </h1>

            <p
              className="text-sm leading-relaxed text-[var(--gray-500)] sm:text-[15px]"
              style={{ fontFamily: FONT }}
            >
              {content.description}
            </p>
          </div>

          {/* Content blocks */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {content.blocks.map((block, i) => (
              <BlockRenderer key={i} block={block} />
            ))}
          </div>

          {/* Next hint */}
          {content.nextHint && (
            <div
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-[var(--border-xs)] bg-[var(--gray-50)] p-3.5 sm:mt-7 sm:gap-2.5 sm:p-4 sm:pr-[18px]"
            >
              <Sparkles style={{ width: 14, height: 14, color: "var(--gray-400)", flexShrink: 0, marginTop: 2 }} />
              <p
                style={{
                  fontFamily: FONT, fontSize: "13.5px",
                  color: "var(--gray-500)", fontStyle: "italic", lineHeight: 1.6,
                }}
              >
                {content.nextHint}
              </p>
            </div>
          )}

          {/* Activities */}
          {(content.hasAssignment || content.hasQuiz) && (
            <div className="mt-8 sm:mt-10">
              <p
                className="mb-3 text-[9px] font-extrabold uppercase tracking-widest text-[var(--gray-400)] sm:mb-3.5"
                style={{ fontFamily: FONT }}
              >
                Закрепление материала
              </p>
              <div
                className={`grid gap-3 sm:gap-3 ${content.hasAssignment && content.hasQuiz ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
              >
                {content.hasAssignment && (
                  <ActivityCard
                    title="Практическое задание"
                    sub="Закрепите знания на практике"
                    icon={PenLine}
                    color="#F1C40F"
                    to={`/learn/${courseId}/assignment/a1`}
                  />
                )}
                {content.hasQuiz && (
                  <ActivityCard
                    title="Проверка знаний"
                    sub="Ответьте на вопросы по теме"
                    icon={List}
                    color="var(--brand-blue)"
                    to={`/learn/${courseId}/quiz/q1`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Bottom navigation */}
          <div className="mt-12 flex flex-col-reverse gap-3 border-t border-[var(--border-xs)] pt-6 sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-6">
            {prevLesson ? (
              <button
                type="button"
                onClick={() => go(prevLesson)}
                className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-[10px] border border-[var(--border-sm)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--gray-600)] sm:min-h-0 sm:w-auto sm:max-w-[min(100%,320px)] sm:px-[18px] sm:py-2.5 sm:text-[13px]"
                style={{ fontFamily: FONT, cursor: "pointer", transition: "all 0.12s" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--brand-blue)";
                  e.currentTarget.style.color = "var(--brand-blue)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-sm)";
                  e.currentTarget.style.color = "var(--gray-600)";
                }}
              >
                <span className="max-w-full truncate">
                  ← {prevLesson.title.length > 28 ? prevLesson.title.slice(0, 28) + "…" : prevLesson.title}
                </span>
              </button>
            ) : null}

            {nextLesson ? (
              <button
                type="button"
                onClick={handleComplete}
                className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-[10px] border-none px-4 py-3 text-sm font-bold text-white shadow-[0_2px_8px_rgba(74,144,226,0.25)] sm:min-h-0 sm:w-auto sm:px-5 sm:py-2.5 sm:text-[13px]"
                style={{
                  fontFamily: FONT,
                  background: completed ? "#2ECC71" : "var(--brand-blue)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {completed ? (
                  <><CheckCircle2 className="size-4 shrink-0" />Урок завершён</>
                ) : (
                  <span className="max-w-full truncate">
                    {nextLesson.title.length > 28 ? nextLesson.title.slice(0, 28) + "…" : nextLesson.title} →
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCompleted(true)}
                className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-[10px] border-none px-4 py-3 text-sm font-bold text-white shadow-[0_2px_8px_rgba(74,144,226,0.25)] sm:min-h-0 sm:w-auto sm:px-5 sm:py-2.5 sm:text-[13px]"
                style={{
                  fontFamily: FONT,
                  background: completed ? "#2ECC71" : "var(--brand-blue)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <CheckCircle2 className="size-4 shrink-0" />
                {completed ? "Курс завершён!" : "Завершить курс"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
