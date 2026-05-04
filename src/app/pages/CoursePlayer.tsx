import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Lock,
  Menu,
  PenLine,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPlayerCourse,
  fetchPlayerLessonPayload,
  insertLessonCompletion,
  lessonContentToPlayerBlocks,
  submitLessonAssignment,
} from "@/services/coursePlayback.service";
import { recalculateProgress } from "@/services/progress.service";
import type { PlayerCourse, PlayerLesson } from "@/entities/course/types";

type LessonBlock = ReturnType<typeof lessonContentToPlayerBlocks>["blocks"][number];

type LessonViewData = {
  title: string;
  objective: string;
  summary: string;
  duration: string;
  blocks: LessonBlock[];
  hasAssignment: boolean;
  hasQuiz: boolean;
  quizId: string | null;
  quizTitle: string | null;
  attemptsCount: number;
  bestScore: number | null;
  assignmentStatus: string | null;
};

type PageState = "loading" | "ready" | "not_found" | "forbidden" | "error";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function clean(value: unknown): string {
  return asString(value).trim();
}

function courseLoadState(error: string | null): PageState {
  const e = (error ?? "").toLowerCase();
  if (!e) return "ready";
  if (e.includes("forbidden") || e.includes("нет доступа")) return "forbidden";
  if (e.includes("not_found") || e.includes("не найден")) return "not_found";
  return "error";
}

function lessonStatusLabel(lesson: PlayerLesson, active: boolean) {
  if (lesson.completed) return "Завершён";
  if (active) return "Открыт";
  return "Не начат";
}

function BlockCard({ block }: { block: LessonBlock }) {
  const typeLabel =
    block.type === "practice" ? "Практика" :
    block.type === "code" ? "Пример" :
    block.title || "Материал";
  const content = block.text || (Array.isArray(block.items) ? block.items.join("\n") : "") || block.code || "";

  if (!content.trim()) return null;

  return (
    <section className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--gray-900)]">
        {block.type === "practice" ? <PenLine className="size-4 text-[var(--brand-blue)]" /> : <BookOpen className="size-4 text-[var(--brand-blue)]" />}
        <span>{block.title || typeLabel}</span>
      </div>
      {block.code ? (
        <pre className="overflow-x-auto rounded-xl bg-[var(--gray-900)] p-4 text-xs leading-relaxed text-white"><code>{block.code}</code></pre>
      ) : Array.isArray(block.items) && block.items.length > 0 ? (
        <ul className="space-y-2 text-sm leading-relaxed text-[var(--gray-700)]">
          {block.items.map((item, index) => <li key={index}>• {item}</li>)}
        </ul>
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--gray-700)]">{content}</p>
      )}
    </section>
  );
}

function StatePage({ type }: { type: "not_found" | "forbidden" | "empty" | "error" }) {
  const config = {
    not_found: {
      icon: AlertCircle,
      title: "Курс не найден",
      text: "Возможно, курс был удалён или ссылка больше не актуальна.",
    },
    forbidden: {
      icon: Lock,
      title: "Нет доступа",
      text: "Этот курс недоступен для вашего аккаунта.",
    },
    empty: {
      icon: BookOpen,
      title: "В курсе пока нет уроков",
      text: "Когда в курсе появятся уроки, здесь откроется режим прохождения.",
    },
    error: {
      icon: AlertCircle,
      title: "Не удалось открыть курс",
      text: "Попробуйте обновить страницу или вернуться к списку курсов.",
    },
  }[type];
  const Icon = config.icon;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--gray-50)] px-6">
      <div className="max-w-md rounded-3xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--gray-100)] text-[var(--brand-blue)]">
          <Icon className="size-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--gray-900)]">{config.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--gray-500)]">{config.text}</p>
        <Link to="/app" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-bold text-white no-underline">
          Вернуться к моим курсам
        </Link>
      </div>
    </div>
  );
}

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<PlayerCourse | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [lessonData, setLessonData] = useState<LessonViewData | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonLoading, setLessonLoading] = useState(false);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const modules = course?.modules ?? [];
  const lessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const activeLessonId = lessonId || course?.currentLessonId || lessons[0]?.id || "";
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0] ?? null;
  const activeIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const prevLesson = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const nextLesson = activeIndex >= 0 && activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;
  const completedCount = lessons.filter((lesson) => lesson.completed).length;
  const progressPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const allCompleted = lessons.length > 0 && completedCount >= lessons.length;

  useEffect(() => {
    if (!courseId) {
      setPageState("not_found");
      return;
    }
    let cancelled = false;
    setPageState("loading");
    void (async () => {
      const { data, error } = await fetchPlayerCourse(courseId, user?.id ?? null);
      if (cancelled) return;
      if (error || !data) {
        setPageState(courseLoadState(error));
        return;
      }
      setCourse(data);
      setPageState(data.modules.some((module) => module.lessons.length > 0) ? "ready" : "not_found");
      if (!lessonId && data.currentLessonId) {
        navigate(`/learn/${courseId}/lesson/${data.currentLessonId}`, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, lessonId, navigate, user?.id]);

  useEffect(() => {
    if (!courseId || !activeLesson?.id) return;
    let cancelled = false;
    setLessonLoading(true);
    setNotice(null);
    void (async () => {
      const res = await fetchPlayerLessonPayload(courseId, activeLesson.id, user?.id ?? null);
      if (cancelled) return;
      if (res.error) {
        setLessonData(null);
        setPageState(courseLoadState(res.error));
        setLessonLoading(false);
        return;
      }
      const contentRec = asRecord(res.content);
      const mapped = lessonContentToPlayerBlocks(res.content);
      setModuleTitle(res.moduleTitle);
      setLessonData({
        title: res.lessonTitle || activeLesson.title,
        objective: clean(contentRec?.lesson_objective) || mapped.description,
        summary: clean(contentRec?.lesson_summary),
        duration: clean(contentRec?.lesson_estimated_duration) || mapped.duration || "—",
        blocks: mapped.blocks,
        hasAssignment: Boolean(clean(contentRec?.practice_text)) || mapped.hasAssignment,
        hasQuiz: Boolean(res.quizId),
        quizId: res.quizId,
        quizTitle: res.quizTitle,
        attemptsCount: res.attemptsCount,
        bestScore: res.bestScore,
        assignmentStatus: res.assignmentStatus,
      });
      setLessonLoading(false);
      void recalculateProgress(courseId, activeLesson.id);
    })();
    return () => { cancelled = true; };
  }, [courseId, activeLesson?.id, activeLesson?.title, user?.id]);

  useEffect(() => {
    if (allCompleted && !lessonId) setShowCompletion(true);
  }, [allCompleted, lessonId]);

  const goToLesson = (lesson: PlayerLesson | null) => {
    if (!lesson || !courseId) return;
    setMobileOpen(false);
    setShowCompletion(false);
    setCourse((prev) => prev ? {
      ...prev,
      currentLessonId: lesson.id,
      modules: prev.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((item) => ({ ...item, current: item.id === lesson.id })),
      })),
    } : prev);
    void recalculateProgress(courseId, lesson.id);
    navigate(`/learn/${courseId}/lesson/${lesson.id}`);
  };

  const markLessonCompleted = async () => {
    if (!courseId || !activeLesson || completeBusy) return;
    setCompleteBusy(true);
    setNotice(null);
    const result = await insertLessonCompletion(user?.id ?? "", activeLesson.id, courseId);
    setCompleteBusy(false);
    if (result.error) {
      setNotice("Не удалось завершить урок. Попробуйте ещё раз.");
      return;
    }

    setCourse((prev) => prev ? {
      ...prev,
      modules: prev.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => lesson.id === activeLesson.id ? { ...lesson, completed: true } : lesson),
      })),
    } : prev);
    setNotice("Урок завершён.");

    if (nextLesson) {
      window.setTimeout(() => goToLesson(nextLesson), 450);
    } else {
      setShowCompletion(true);
      navigate(`/learn/${courseId}`, { replace: true });
    }
  };

  const submitAssignment = async () => {
    if (!courseId || !activeLesson || assignmentBusy) return;
    const text = window.prompt("Введите ответ на практическое задание", "");
    if (!text?.trim()) return;
    setAssignmentBusy(true);
    setNotice(null);
    const result = await submitLessonAssignment(courseId, activeLesson.id, text);
    setAssignmentBusy(false);
    setNotice(result.error ? "Не удалось отправить задание. Попробуйте ещё раз." : "Практическое задание отправлено.");
  };

  if (pageState === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--gray-50)] text-sm font-semibold text-[var(--gray-500)]">Загрузка курса…</div>;
  }
  if (pageState === "forbidden") return <StatePage type="forbidden" />;
  if (pageState === "not_found") return <StatePage type="not_found" />;
  if (pageState === "error") return <StatePage type="error" />;
  if (!course || lessons.length === 0) return <StatePage type="empty" />;

  if (showCompletion && allCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gray-50)] px-6">
        <div className="max-w-xl rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--gray-900)]">Курс завершён</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--gray-500)]">
            Вы прошли все уроки курса. Прогресс сохранён и будет доступен в разделе обучения.
          </p>
          <div className="mx-auto mt-6 max-w-sm">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--gray-500)]">
              <span>Прогресс</span>
              <span>100%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--gray-100)]">
              <div className="h-full w-full rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/app" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-bold text-white no-underline">
              Вернуться к моим курсам
            </Link>
            <button type="button" onClick={() => goToLesson(lessons[0])} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] px-5 text-sm font-bold text-[var(--gray-700)]">
              <RotateCcw className="size-4" /> Повторить курс
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lessonTitle = lessonData?.title || activeLesson?.title || "Урок";
  const visibleBlocks = lessonData?.blocks.filter((block) => {
    const content = block.text || (Array.isArray(block.items) ? block.items.join("\n") : "") || block.code || "";
    return content.trim().length > 0;
  }) ?? [];

  return (
    <div className="min-h-screen bg-[var(--gray-50)] lg:flex">
      {mobileOpen && <button type="button" aria-label="Закрыть оглавление" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed left-0 top-0 z-40 flex h-dvh w-[min(88vw,320px)] flex-col border-r border-[var(--border-xs)] bg-[var(--bg-surface)] transition-transform lg:sticky lg:w-80`}>
        <div className="border-b border-[var(--border-xs)] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link to="/app" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--gray-500)] no-underline hover:text-[var(--brand-blue)]">
              <ArrowLeft className="size-4" /> Мои курсы
            </Link>
            <button type="button" className="rounded-lg p-2 text-[var(--gray-500)] lg:hidden" onClick={() => setMobileOpen(false)}><X className="size-5" /></button>
          </div>
          <h1 className="line-clamp-2 text-lg font-extrabold tracking-tight text-[var(--gray-900)]">{course.title}</h1>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-bold text-[var(--gray-500)]">
              <span>Прогресс</span>
              <span>{completedCount}/{lessons.length} уроков</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--gray-100)]">
              <div className="h-full rounded-full bg-[var(--brand-blue)] transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-4">
          {modules.map((module) => (
            <div key={module.id} className="mb-5">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--gray-400)]">{module.title}</div>
              <div className="space-y-1.5">
                {module.lessons.map((lesson) => {
                  const active = lesson.id === activeLesson?.id;
                  return (
                    <button
                      type="button"
                      key={lesson.id}
                      onClick={() => goToLesson(lesson)}
                      className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${active ? "bg-[var(--brand-blue)]/10" : "hover:bg-[var(--gray-50)]"}`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {lesson.completed ? <CheckCircle2 className="size-5 text-emerald-500" /> : active ? <Play className="size-5 text-[var(--brand-blue)]" /> : <Circle className="size-5 text-[var(--gray-300)]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-bold leading-snug ${active ? "text-[var(--brand-blue)]" : "text-[var(--gray-800)]"}`}>{lesson.title}</span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--gray-400)]">{lessonStatusLabel(lesson, active)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[var(--border-xs)] bg-[var(--bg-surface)]/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="rounded-xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Открыть оглавление">
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--gray-400)]">Урок {activeIndex + 1} из {lessons.length}</p>
                <p className="truncate text-sm font-extrabold text-[var(--gray-900)]">{lessonTitle}</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <button type="button" disabled={!prevLesson || completeBusy} onClick={() => goToLesson(prevLesson)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" />Назад</button>
              <button type="button" disabled={completeBusy || activeLesson?.completed} onClick={markLessonCompleted} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-[var(--brand-blue)] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
                <CheckCircle2 className="size-4" />{completeBusy ? "Сохраняем…" : activeLesson?.completed ? "Завершён" : "Завершить урок"}
              </button>
              <button type="button" disabled={!nextLesson || completeBusy} onClick={() => goToLesson(nextLesson)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">Далее<ChevronRight className="size-4" /></button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-10">
          {notice && <div className="mb-5 rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-bold text-[var(--gray-700)] shadow-sm">{notice}</div>}

          <section className="mb-7 rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-blue)]/10 px-3 py-1.5 text-xs font-bold text-[var(--brand-blue)]">
              <BookOpen className="size-4" /> {moduleTitle || "Урок курса"}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--gray-900)]">{lessonTitle}</h2>
            {lessonData?.objective && <p className="mt-4 text-sm leading-relaxed text-[var(--gray-700)]"><strong>Цель:</strong> {lessonData.objective}</p>}
            {lessonData?.summary && <p className="mt-2 text-sm leading-relaxed text-[var(--gray-500)]">{lessonData.summary}</p>}
            {lessonData?.duration && <p className="mt-4 text-xs font-bold text-[var(--gray-400)]">Длительность: {lessonData.duration}</p>}
          </section>

          {lessonLoading ? (
            <div className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-6 text-sm font-semibold text-[var(--gray-500)]">Загрузка урока…</div>
          ) : visibleBlocks.length > 0 ? (
            <div className="space-y-4">
              {visibleBlocks.map((block, index) => <BlockCard key={`${block.title}-${index}`} block={block} />)}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--border-sm)] bg-[var(--bg-surface)] p-8 text-center">
              <ClipboardList className="mx-auto mb-4 size-10 text-[var(--gray-300)]" />
              <h3 className="text-lg font-extrabold text-[var(--gray-900)]">Содержание урока ещё не создано</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gray-500)]">Материалы появятся здесь после наполнения курса.</p>
            </div>
          )}

          {(lessonData?.hasAssignment || lessonData?.hasQuiz) && (
            <section className="mt-6 grid gap-3 sm:grid-cols-2">
              {lessonData?.hasAssignment && (
                <button type="button" disabled={assignmentBusy} onClick={submitAssignment} className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5 text-left shadow-sm disabled:opacity-60">
                  <PenLine className="mb-3 size-5 text-[var(--brand-blue)]" />
                  <p className="font-extrabold text-[var(--gray-900)]">Практическое задание</p>
                  <p className="mt-1 text-sm text-[var(--gray-500)]">{lessonData.assignmentStatus ? "Ответ отправлен" : assignmentBusy ? "Отправка…" : "Отправьте ответ по заданию"}</p>
                </button>
              )}
              {lessonData?.hasQuiz && lessonData.quizId && (
                <Link to={`/learn/${courseId}/quiz/${lessonData.quizId}`} className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5 text-left no-underline shadow-sm">
                  <ClipboardList className="mb-3 size-5 text-[var(--brand-blue)]" />
                  <p className="font-extrabold text-[var(--gray-900)]">Проверка знаний</p>
                  <p className="mt-1 text-sm text-[var(--gray-500)]">{lessonData.bestScore != null ? `Лучший результат: ${lessonData.bestScore}%` : lessonData.attemptsCount ? `Попыток: ${lessonData.attemptsCount}` : "Пройти вопросы по уроку"}</p>
                </Link>
              )}
            </section>
          )}

          <footer className="mt-8 flex flex-col gap-3 border-t border-[var(--border-xs)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" disabled={!prevLesson || completeBusy} onClick={() => goToLesson(prevLesson)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" />Назад</button>
            <button type="button" disabled={completeBusy || activeLesson?.completed} onClick={markLessonCompleted} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle2 className="size-4" />{completeBusy ? "Сохраняем…" : activeLesson?.completed ? "Урок завершён" : "Завершить урок"}</button>
            <button type="button" disabled={!nextLesson || completeBusy} onClick={() => goToLesson(nextLesson)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Далее<ChevronRight className="size-4" /></button>
          </footer>
        </div>
      </main>
    </div>
  );
}
