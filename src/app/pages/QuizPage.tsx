import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AlertCircle, ClipboardList, Lock } from "lucide-react";
import QuizPanel from "@/components/QuizPanel";
import { getQuizForTaking, type QuizTakingPayload } from "@/services/quiz.service";

type PageState = "loading" | "ready" | "empty" | "forbidden" | "not_found" | "error";

function stateFromError(error: string | null): PageState {
  const text = (error ?? "").toLowerCase();
  if (!text) return "ready";
  if (text.includes("нет доступа") || text.includes("forbidden")) return "forbidden";
  if (text.includes("не найден") || text.includes("not_found") || text.includes("quiz_not_found")) return "not_found";
  return "error";
}

function StatePage({ state, courseId }: { state: Exclude<PageState, "ready" | "loading">; courseId?: string }) {
  const config = {
    empty: {
      icon: ClipboardList,
      title: "Квиз для этого урока ещё не создан",
      text: "Когда проверочные вопросы появятся, их можно будет пройти здесь.",
    },
    forbidden: {
      icon: Lock,
      title: "Нет доступа",
      text: "Этот квиз недоступен для вашего аккаунта.",
    },
    not_found: {
      icon: AlertCircle,
      title: "Квиз не найден",
      text: "Возможно, он был удалён или ссылка больше не актуальна.",
    },
    error: {
      icon: AlertCircle,
      title: "Не удалось открыть квиз",
      text: "Попробуйте обновить страницу или вернуться к курсу.",
    },
  }[state];
  const Icon = config.icon;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--gray-50)] px-6">
      <div className="max-w-md rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--gray-100)] text-[var(--brand-blue)]">
          <Icon className="size-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--gray-900)]">{config.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--gray-500)]">{config.text}</p>
        <Link to={courseId ? `/learn/${courseId}` : "/app"} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-bold text-white no-underline">
          Вернуться к курсу
        </Link>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [payload, setPayload] = useState<QuizTakingPayload | null>(null);

  useEffect(() => {
    if (!quizId) {
      setState("empty");
      return;
    }
    let cancelled = false;
    setState("loading");
    setPayload(null);
    void (async () => {
      const response = await getQuizForTaking(quizId);
      if (cancelled) return;
      if (response.error || !response.data) {
        setState(stateFromError(response.error));
        return;
      }
      if (response.data.questions.length === 0) {
        setState("empty");
        return;
      }
      setPayload(response.data);
      setState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gray-50)] px-6">
        <div className="rounded-2xl border border-[var(--border-xs)] bg-[var(--bg-surface)] px-5 py-4 text-sm font-semibold text-[var(--gray-500)] shadow-sm">
          Загрузка квиза…
        </div>
      </div>
    );
  }

  if (state !== "ready" || !payload) return <StatePage state={state === "not_found" ? "not_found" : state} courseId={courseId} />;

  return (
    <main className="min-h-screen bg-[var(--gray-50)] px-4 py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <QuizPanel payload={payload} backHref={courseId ? `/learn/${courseId}` : "/app"} />
      </div>
    </main>
  );
}
