import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { ListTree, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { mockCourse, resolveLessonCanvasContent } from "@/features/course-editor/courseEditorModel";
import { EditorHeader } from "@/features/course-editor/components/EditorHeader";
import { ModuleTree } from "@/features/course-editor/components/ModuleTree";
import { LessonCanvas } from "@/features/course-editor/components/LessonCanvas";
import { IntelligenceRail } from "@/features/course-editor/components/IntelligenceRail";
import type { LessonSummary, ModuleSummary } from "@/entities/course/types";
import { cn } from "@/app/components/ui/utils";

const FONT = "'Montserrat', sans-serif";

const editorMeta = {
  title: mockCourse.title,
  lastSaved: mockCourse.lastSaved,
  qaScore: mockCourse.qaScore,
  version: mockCourse.version,
};

function getLessonNeighbors(modules: ModuleSummary[], selectedId: string) {
  const flat = modules.flatMap((m) => m.lessons);
  const i = flat.findIndex((l) => l.id === selectedId);
  return {
    prev: i > 0 ? flat[i - 1]! : null,
    next: i >= 0 && i < flat.length - 1 ? flat[i + 1]! : null,
  };
}

function EditorMobileDock({
  onStructure,
  onAssistant,
  prev,
  next,
  onPrev,
  onNext,
}: {
  onStructure: () => void;
  onAssistant: () => void;
  prev: LessonSummary | null;
  next: LessonSummary | null;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch gap-1 border-t border-[var(--border-xs)] bg-[var(--bg-surface)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      style={{ fontFamily: FONT }}
    >
      <button
        type="button"
        onClick={onStructure}
        className="flex min-h-12 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-bold text-[var(--gray-600)] active:bg-[var(--gray-100)]"
      >
        <ListTree className="size-5 shrink-0 text-[var(--brand-blue)]" aria-hidden />
        Структура
      </button>
      <div className="flex min-w-0 flex-1 gap-0.5">
        <button
          type="button"
          disabled={!prev}
          onClick={onPrev}
          className="flex min-h-12 min-w-0 flex-1 touch-manipulation items-center justify-center rounded-lg active:bg-[var(--gray-100)] disabled:pointer-events-none disabled:opacity-35"
          aria-label="Предыдущий урок"
        >
          <ChevronLeft className="size-6 text-[var(--gray-700)]" />
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={onNext}
          className="flex min-h-12 min-w-0 flex-1 touch-manipulation items-center justify-center rounded-lg active:bg-[var(--gray-100)] disabled:pointer-events-none disabled:opacity-35"
          aria-label="Следующий урок"
        >
          <ChevronRight className="size-6 text-[var(--gray-700)]" />
        </button>
      </div>
      <button
        type="button"
        onClick={onAssistant}
        className="flex min-h-12 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-bold text-[var(--gray-600)] active:bg-[var(--gray-100)]"
      >
        <Sparkles className="size-5 shrink-0 text-[var(--brand-blue)]" aria-hidden />
        ИИ
      </button>
    </nav>
  );
}

export default function CourseEditor() {
  const { courseId = "demo" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [selectedLesson, setSelectedLesson] = useState<LessonSummary>(
    mockCourse.modules[0].lessons[0]
  );
  const [expandedModules, setExpandedModules] = useState<string[]>(["m1"]);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const lessonContent = resolveLessonCanvasContent(selectedLesson);

  const { prev, next } = useMemo(
    () => getLessonNeighbors(mockCourse.modules, selectedLesson.id),
    [selectedLesson.id]
  );

  const handleToggleModule = (moduleId: string) =>
    setExpandedModules((p) =>
      p.includes(moduleId) ? p.filter((id) => id !== moduleId) : [...p, moduleId]
    );

  const handleSave = () => {
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 2000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!leftOpen && !rightOpen) return;
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
  }, [leftOpen, rightOpen]);

  const openStructure = () => {
    setRightOpen(false);
    setLeftOpen(true);
  };

  const openAssistant = () => {
    setLeftOpen(false);
    setRightOpen(true);
  };

  const closeDrawers = () => {
    setLeftOpen(false);
    setRightOpen(false);
  };

  const drawerOpen = leftOpen || rightOpen;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-page)]" style={{ fontFamily: FONT }}>
      <EditorHeader
        courseId={courseId}
        course={editorMeta}
        showSaveIndicator={showSaveIndicator}
        onSave={handleSave}
        onPreview={() => navigate(`/learn/${courseId}`)}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {drawerOpen && (
          <button
            type="button"
            aria-label="Закрыть панель"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={closeDrawers}
          />
        )}

        {/* Structure panel */}
        <div
          className={cn(
            "z-50 flex h-full flex-col border-r border-[var(--border-xs)] bg-[var(--bg-surface)] shadow-xl transition-transform duration-200 ease-out",
            "fixed left-0 w-[min(100%,292px)] max-w-[92vw] lg:relative lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none",
            "top-[52px] h-[calc(100dvh-52px)] sm:top-[54px] sm:h-[calc(100dvh-54px)] lg:top-auto lg:h-full",
            "shrink-0 lg:w-[220px] xl:w-[252px]",
            leftOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <ModuleTree
            modules={mockCourse.modules}
            selectedLessonId={selectedLesson.id}
            expandedModules={expandedModules}
            onToggleModule={handleToggleModule}
            onSelectLesson={(lesson) => {
              setSelectedLesson(lesson);
              setLeftOpen(false);
            }}
          />
        </div>

        <LessonCanvas lesson={selectedLesson} content={lessonContent} />

        {/* Assistant panel */}
        <div
          className={cn(
            "z-50 flex h-full flex-col border-l border-[var(--border-xs)] bg-[var(--editor-assistant-rail)] shadow-xl transition-transform duration-200 ease-out",
            "fixed right-0 w-[min(100%,320px)] max-w-[94vw] lg:relative lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none",
            "top-[52px] h-[calc(100dvh-52px)] sm:top-[54px] sm:h-[calc(100dvh-54px)] lg:top-auto lg:h-full",
            "shrink-0 lg:w-[248px] xl:w-[268px]",
            rightOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          )}
        >
          <IntelligenceRail
            courseId={courseId}
            lesson={selectedLesson}
            content={lessonContent}
            course={editorMeta}
          />
        </div>
      </div>

      <EditorMobileDock
        onStructure={openStructure}
        onAssistant={openAssistant}
        prev={prev}
        next={next}
        onPrev={() => prev && setSelectedLesson(prev)}
        onNext={() => next && setSelectedLesson(next)}
      />
    </div>
  );
}
