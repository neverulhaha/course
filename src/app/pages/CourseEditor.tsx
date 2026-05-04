import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { ListTree, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { emptyLessonContent } from "@/features/course-editor/courseEditorModel";
import { parseLessonContentRow } from "@/entities/course/lessonContentJson";
import { EditorHeader } from "@/features/course-editor/components/EditorHeader";
import { ModuleTree } from "@/features/course-editor/components/ModuleTree";
import { LessonCanvas } from "@/features/course-editor/components/LessonCanvas";
import { IntelligenceRail } from "@/features/course-editor/components/IntelligenceRail";
import type { LessonContent, LessonSummary, ModuleSummary } from "@/entities/course/types";
import type { CourseEditorMeta } from "@/entities/course/types";
import type { CourseSourceSummary } from "@/entities/course/readModels";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  fetchCourseEditorBundle,
  reorderLessons,
  reorderModules,
  syncCourseStatusFromContent,
  updateCourse,
  updateLesson,
  updateLessonContent,
  updateModule,
  type LessonContentPatch,
} from "@/services/courseEditor.service";
import { generateCourseContent, generateLessonContent, regenerateLessonBlock, type AiBlockCommand, type AiBlockType } from "@/services/aiGeneration.service";
import { generateLessonQuiz, generateCourseQuiz } from "@/services/quiz.service";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";
import { toUserErrorMessage } from "@/lib/errorMessages";

const FONT = "'Montserrat', sans-serif";

const editorMetaFallback: CourseEditorMeta = {
  title: "Загрузка…",
  lastSaved: "—",
  qaScore: null,
  version: null,
};

function getLessonNeighbors(modules: ModuleSummary[], selectedId: string) {
  const flat = modules.flatMap((m) => m.lessons);
  const i = flat.findIndex((l) => l.id === selectedId);
  return {
    prev: i > 0 ? flat[i - 1]! : null,
    next: i >= 0 && i < flat.length - 1 ? flat[i + 1]! : null,
  };
}

function resolveFocusedLessonIdFromLocation(
  lessons: LessonSummary[],
  lessonContentByLessonId: Map<string, LessonContent>
) {
  const params = new URLSearchParams(window.location.search);
  const explicitLessonId = params.get("lessonId");
  if (explicitLessonId && lessons.some((lesson) => lesson.id === explicitLessonId)) return explicitLessonId;

  const focusType = params.get("focusEntityType");
  const focusId = params.get("focusEntityId");
  if (!focusType || !focusId) return null;

  if (focusType === "lesson" && lessons.some((lesson) => lesson.id === focusId)) return focusId;

  if (focusType === "lesson_content") {
    for (const [lessonId, content] of lessonContentByLessonId.entries()) {
      if (content.id === focusId) return lessonId;
    }
  }

  return null;
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
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [editorMeta, setEditorMeta] = useState<CourseEditorMeta>(editorMetaFallback);
  const [lessonContentByLessonId, setLessonContentByLessonId] = useState<Map<string, LessonContent>>(new Map());
  const [sources, setSources] = useState<CourseSourceSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedLesson, setSelectedLesson] = useState<LessonSummary | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [lessonDirty, setLessonDirty] = useState(false);

  useEffect(() => {
    if (!lessonDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [lessonDirty]);

  const reloadBundle = async () => {
    if (!courseId || !userId) {
      setLoading(false);
      setLoadError(!userId ? "auth" : "no_course");
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { bundle, error } = await fetchCourseEditorBundle(courseId, userId);
    if (error === "not_found" || error === "forbidden") {
      setLoadError(error);
      setLoading(false);
      return;
    }
    if (error) {
      setLoadError(toUserErrorMessage(error, "Не удалось загрузить курс. Попробуйте ещё раз."));
      setLoading(false);
      return;
    }
    if (!bundle) {
      setLoadError("empty");
      setLoading(false);
      return;
    }
    setModules(bundle.modules);
    setEditorMeta(bundle.meta);
    setLessonContentByLessonId(bundle.lessonContentByLessonId);
    setSources(bundle.sources);
    setLessonDirty(false);
    const allModIds = bundle.modules.map((m) => m.id);
    setExpandedModules(allModIds);
    const flat = bundle.modules.flatMap((m) => m.lessons);
    const focusedLessonId = resolveFocusedLessonIdFromLocation(flat, bundle.lessonContentByLessonId);
    setSelectedLesson((current) =>
      flat.find((lesson) => lesson.id === focusedLessonId) ??
      flat.find((lesson) => lesson.id === current?.id) ??
      flat[0] ??
      null
    );
    void syncCourseStatusFromContent(courseId, userId);
    setLoading(false);
  };

  useEffect(() => {
    void reloadBundle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userId]);

  const lessonContent: LessonContent =
    selectedLesson && lessonContentByLessonId.has(selectedLesson.id)
      ? lessonContentByLessonId.get(selectedLesson.id)!
      : emptyLessonContent;

  const { prev, next } = useMemo(
    () => (selectedLesson ? getLessonNeighbors(modules, selectedLesson.id) : { prev: null, next: null }),
    [modules, selectedLesson]
  );

  const handleToggleModule = (moduleId: string) =>
    setExpandedModules((p) =>
      p.includes(moduleId) ? p.filter((id) => id !== moduleId) : [...p, moduleId]
    );

  const showSaved = (warning?: string | null) => {
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 2000);
    if (warning) setGenerationNotice({ type: "warning", message: warning });
  };

  const withSaveAction = async (key: string, action: () => Promise<{ error: string | null; warning?: string | null }>) => {
    if (!userId || savingKey || busyAction) return;
    setSavingKey(key);
    setActionError(null);
    setGenerationNotice(null);
    try {
      const result = await action();
      if (result.error) {
        const message = toUserErrorMessage(result.error, "Не удалось сохранить данные. Попробуйте ещё раз.");
        setActionError(message);
        setGenerationNotice({ type: "error", message });
        toast.error(message);
        return;
      }
      await reloadBundle();
      showSaved(result.warning);
      toast.success(result.warning ? "Изменения сохранены с предупреждением" : "Изменения сохранены");
    } catch (error) {
      const message = toUserErrorMessage(error, "Не удалось сохранить изменения. Попробуйте ещё раз.");
      setActionError(message);
      setGenerationNotice({ type: "error", message });
      toast.error(message);
    } finally {
      setSavingKey(null);
    }
  };

  const handleEditCourseTitle = () => {
    if (!userId) return;
    const nextTitle = window.prompt("Название курса", editorMeta.title);
    if (nextTitle == null) return;
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === editorMeta.title) return;
    void withSaveAction("course-title", async () => updateCourse(courseId, userId, { title: trimmed }));
  };

  const handleSave = () => {
    handleEditCourseTitle();
  };

  const askBeforeLeaveDirtyLesson = () => {
    if (!lessonDirty) return true;
    return window.confirm("Есть несохранённые изменения в уроке. Перейти без сохранения?");
  };

  const selectLessonSafely = (lesson: LessonSummary | null) => {
    if (!lesson) return;
    if (!askBeforeLeaveDirtyLesson()) return;
    setSelectedLesson(lesson);
    setLessonDirty(false);
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

  const runAiAction = async (key: string, fn: () => Promise<{ error: string | null }>) => {
    if (busyAction) return;
    setBusyAction(key);
    setActionError(null);
    setGenerationNotice(null);
    try {
      const res = await fn();
      if (res.error) {
        const message = toUserErrorMessage(res.error, "Не удалось выполнить действие. Попробуйте ещё раз.");
        setActionError(message);
        setGenerationNotice({ type: "error", message });
        toast.error(message);
        return;
      }
      await reloadBundle();
      setShowSaveIndicator(true);
      setTimeout(() => setShowSaveIndicator(false), 2000);
      toast.success(key === "lesson" ? "Урок сгенерирован" : key === "lesson-quiz" || key === "course-quiz" ? "Квиз создан" : "Действие выполнено");
    } catch (error) {
      const message = toUserErrorMessage(error, "Не удалось выполнить действие с ИИ. Попробуйте ещё раз.");
      setActionError(message);
      setGenerationNotice({ type: "error", message });
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateLesson = () => {
    if (!selectedLesson) return;
    void runAiAction("lesson", () => generateLessonContent(courseId, selectedLesson.id));
  };

  const handleGenerateCourse = () => {
    if (busyAction) return;
    setBusyAction("course");
    setActionError(null);
    setGenerationNotice(null);

    void (async () => {
      try {
        const { data, error } = await generateCourseContent(courseId);
        if (error) {
          const message = toUserErrorMessage(error, "Не удалось выполнить действие. Попробуйте ещё раз.");
          setActionError(message);
          setGenerationNotice({ type: "error", message });
          toast.error(message);
          return;
        }

        await reloadBundle();

        const generatedCount = data?.generated_lessons?.length ?? 0;
        const skippedCount = data?.skipped_lessons?.length ?? 0;
        const failedCount = data?.failed_lessons?.length ?? 0;
        const status = data?.course_status;

        if (failedCount > 0 || status === "partial") {
          setGenerationNotice({
            type: "warning",
            message:
              "Сгенерированы не все уроки. " +
              "Успешно: " + generatedCount + ". Пропущено: " + skippedCount + ". Ошибок: " + failedCount + ". " +
              "Успешные результаты сохранены, генерацию можно повторить для оставшихся уроков.",
          });
        } else {
          setGenerationNotice({
            type: "success",
            message: "Содержание курса успешно сгенерировано. Создано уроков: " + generatedCount + ".",
          });
        }

        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 2000);
      } catch (error) {
        const message = toUserErrorMessage(error, "Не удалось сгенерировать содержание курса. Попробуйте ещё раз.");
        setActionError(message);
        setGenerationNotice({ type: "error", message });
        toast.error(message);
      } finally {
        setBusyAction(null);
      }
    })();
  };

  const handleGenerateLessonQuiz = () => {
    if (!selectedLesson) return;
    void runAiAction("lesson-quiz", async () => {
      const res = await generateLessonQuiz(courseId, selectedLesson.id, 5, true);
      if (!res.error) setGenerationNotice({ type: "success", message: "Квиз по уроку создан." });
      return { error: res.error };
    });
  };

  const handleGenerateCourseQuiz = () => {
    void runAiAction("course-quiz", async () => {
      const res = await generateCourseQuiz(courseId, 10, true);
      if (!res.error) setGenerationNotice({ type: "success", message: "Итоговый квиз курса создан." });
      return { error: res.error };
    });
  };

  const handleRegenerateBlock = (blockType: AiBlockType, command: AiBlockCommand) => {
    if (!selectedLesson) return;

    const currentContent = lessonContentByLessonId.get(selectedLesson.id);
    const targetBlock = currentContent?.blocks.find((block) => block.id === blockType);
    if (!targetBlock || !targetBlock.content.trim()) {
      setActionError("Этот блок пустой. Сначала сгенерируйте урок целиком.");
      setGenerationNotice({ type: "error", message: "Этот блок пустой. Сначала сгенерируйте урок целиком." });
      toast.error("Этот блок пустой. Сначала сгенерируйте урок целиком.");
      return;
    }

    const key = blockType + ":" + command;
    if (busyAction) return;

    setBusyAction(key);
    setActionError(null);
    setGenerationNotice(null);

    void (async () => {
      try {
        const { data, error } = await regenerateLessonBlock({
          courseId,
          lessonId: selectedLesson.id,
          blockType,
          command,
        });

        if (error) {
          const message = toUserErrorMessage(error, "Не удалось выполнить действие. Попробуйте ещё раз.");
          setActionError(message);
          setGenerationNotice({ type: "error", message });
          toast.error(message);
          return;
        }

        if (data?.lesson_content) {
          const nextContent = parseLessonContentRow(data.lesson_content, currentContent.goal);
          setLessonContentByLessonId((previous) => {
            const next = new Map(previous);
            next.set(selectedLesson.id, nextContent);
            return next;
          });
        } else {
          await reloadBundle();
        }

        if (data?.warnings?.length) {
          setGenerationNotice({
            type: "warning",
            message: "Блок обновлён, но есть предупреждения: " + data.warnings.join(" "),
          });
        } else {
          setGenerationNotice({ type: "success", message: "Блок урока обновлён. Остальные блоки не изменялись." });
          toast.success("Блок обновлён");
        }

        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 2000);
      } catch (error) {
        const message = toUserErrorMessage(error, "Не удалось перегенерировать блок. Попробуйте ещё раз.");
        setActionError(message);
        setGenerationNotice({ type: "error", message });
        toast.error(message);
      } finally {
        setBusyAction(null);
      }
    })();
  };


  const handleSaveLessonMeta = (patch: {
    title: string;
    objective: string | null;
    summary: string | null;
    estimated_duration: number | null;
    learning_outcome: string | null;
  }) => {
    if (!selectedLesson || !userId) return;
    void withSaveAction("lesson-meta", async () => updateLesson(selectedLesson.id, userId, patch));
  };

  const handleSaveLessonContent = (patch: LessonContentPatch) => {
    if (!selectedLesson || !userId) return;
    void withSaveAction("lesson-content", async () => {
      const result = await updateLessonContent(selectedLesson.id, userId, patch);
      if (!result.error) setLessonDirty(false);
      return result;
    });
  };

  const handleAddModule = () => {
    if (!userId) return;
    const title = window.prompt("Название нового модуля", "Новый модуль");
    if (title == null) return;
    void withSaveAction("module-create", async () => createModule(courseId, userId, { title: title.trim() || "Новый модуль" }));
  };

  const handleEditModule = (module: ModuleSummary) => {
    if (!userId) return;
    const title = window.prompt("Название модуля", module.title);
    if (title == null) return;
    const description = window.prompt("Описание модуля", module.description ?? "");
    if (description == null) return;
    const durationRaw = window.prompt("Длительность модуля в минутах", module.estimatedDuration != null ? String(module.estimatedDuration) : "");
    if (durationRaw == null) return;
    const practiceRequired = window.confirm("В модуле нужна практика?");
    const durationValue = durationRaw.trim() ? Number(durationRaw) : null;

    void withSaveAction("module-edit", async () => updateModule(module.id, userId, {
      title: title.trim() || module.title,
      description,
      estimated_duration: typeof durationValue === "number" && Number.isFinite(durationValue) ? durationValue : null,
      practice_required: practiceRequired,
    }));
  };

  const handleDeleteModule = (module: ModuleSummary) => {
    if (!userId) return;
    const confirmed = window.confirm("Удалить модуль «" + module.title + "» вместе со всеми уроками и материалами?");
    if (!confirmed) return;
    void withSaveAction("module-delete", async () => deleteModule(module.id, userId));
  };

  const handleAddLesson = (module: ModuleSummary) => {
    if (!userId) return;
    const title = window.prompt("Название нового урока", "Новый урок");
    if (title == null) return;
    void withSaveAction("lesson-create", async () => {
      const result = await createLesson(module.id, userId, { title: title.trim() || "Новый урок" });
      if (!result.error && result.data?.id) {
        setTimeout(() => {
          void reloadBundle();
        }, 0);
      }
      return result;
    });
  };

  const handleDeleteLesson = (lesson: LessonSummary) => {
    if (!userId) return;
    const confirmed = window.confirm("Удалить урок «" + lesson.title + "» и его содержимое?");
    if (!confirmed) return;
    void withSaveAction("lesson-delete", async () => deleteLesson(lesson.id, userId));
  };

  const handleMoveModule = (moduleId: string, direction: "up" | "down") => {
    if (!userId) return;
    const ids = modules.map((module) => module.id);
    const index = ids.indexOf(moduleId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
    const ordered = [...ids];
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    void withSaveAction("module-reorder", async () => reorderModules(courseId, userId, ordered));
  };

  const handleMoveLesson = (module: ModuleSummary, lessonId: string, direction: "up" | "down") => {
    if (!userId) return;
    const ids = module.lessons.map((lesson) => lesson.id);
    const index = ids.indexOf(lessonId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
    const ordered = [...ids];
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    void withSaveAction("lesson-reorder", async () => reorderLessons(module.id, userId, ordered));
  };


  const drawerOpen = leftOpen || rightOpen;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-page)]" style={{ fontFamily: FONT }}>
        <p className="text-sm text-[var(--gray-500)]">Загрузка курса…</p>
      </div>
    );
  }

  if (loadError === "forbidden" || loadError === "not_found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-page)] px-6 text-center" style={{ fontFamily: FONT }}>
        <p className="text-sm text-[var(--gray-700)]">Курс не найден или нет доступа.</p>
        <button type="button" className="text-sm font-semibold text-[var(--brand-blue)]" onClick={() => navigate("/app")}>
          К списку курсов
        </button>
      </div>
    );
  }

  if (loadError || !selectedLesson) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-page)] px-6 text-center" style={{ fontFamily: FONT }}>
        <p className="text-sm text-[var(--gray-700)]">
          {loadError === "auth" ? "Войдите, чтобы открыть редактор." : "Не удалось загрузить курс или в нём пока нет уроков."}
        </p>
        <button type="button" className="text-sm font-semibold text-[var(--brand-blue)]" onClick={() => navigate("/app")}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-page)]" style={{ fontFamily: FONT }}>
      <EditorHeader
        courseId={courseId}
        course={{
          title: editorMeta.title,
          lastSaved: editorMeta.lastSaved,
          qaScore: editorMeta.qaScore ?? 0,
          version: editorMeta.version,
        }}
        showSaveIndicator={showSaveIndicator}
        onSave={handleSave}
        onPreview={() => navigate(`/learn/${courseId}`)}
        onEditTitle={handleEditCourseTitle}
      />

      {actionError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      )}

      {generationNotice && (
        <div
          className={cn(
            "border-b px-4 py-2 text-sm font-semibold",
            generationNotice.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            generationNotice.type === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
            generationNotice.type === "error" && "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {generationNotice.message}
        </div>
      )}

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
            modules={modules}
            selectedLessonId={selectedLesson.id}
            expandedModules={expandedModules}
            onToggleModule={handleToggleModule}
            onSelectLesson={(lesson) => {
              selectLessonSafely(lesson);
              setLeftOpen(false);
            }}
            onAddModule={handleAddModule}
            onEditModule={handleEditModule}
            onDeleteModule={handleDeleteModule}
            onMoveModule={handleMoveModule}
            onAddLesson={handleAddLesson}
            onDeleteLesson={handleDeleteLesson}
            onMoveLesson={handleMoveLesson}
          />
        </div>

        <LessonCanvas
          lesson={selectedLesson}
          content={lessonContent}
          onGenerateLesson={handleGenerateLesson}
          generatingLesson={busyAction === "lesson"}
          onRegenerateBlock={lessonContent.blocks.length > 0 ? handleRegenerateBlock : undefined}
          regeneratingBlockKey={busyAction ?? undefined}
          onSaveLessonMeta={handleSaveLessonMeta}
          onSaveLessonContent={handleSaveLessonContent}
          savingKey={savingKey}
          onDirtyChange={setLessonDirty}
        />

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
            onGenerateLesson={handleGenerateLesson}
            onGenerateCourseContent={handleGenerateCourse}
            onRegenerateBlock={lessonContent.blocks.length > 0 ? handleRegenerateBlock : undefined}
            busy={busyAction !== null}
            modules={modules}
            onGenerateLessonQuiz={handleGenerateLessonQuiz}
            onGenerateCourseQuiz={handleGenerateCourseQuiz}
            sources={sources}
          />
        </div>
      </div>

      <EditorMobileDock
        onStructure={openStructure}
        onAssistant={openAssistant}
        prev={prev}
        next={next}
        onPrev={() => prev && selectLessonSafely(prev)}
        onNext={() => next && selectLessonSafely(next)}
      />
    </div>
  );
}
