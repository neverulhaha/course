import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardList, History, RotateCcw, XCircle } from "lucide-react";
import { formatRuDateTime } from "@/lib/dateFormat";
import { toast } from "sonner";
import { toUserErrorMessage } from "@/lib/errorMessages";
import {
  submitQuizAttempt,
  type QuizAttemptHistoryItem,
  type QuizSubmitResult,
  type QuizTakingPayload,
  type QuizTakingQuestion,
} from "@/services/quiz.service";

type Props = {
  payload: QuizTakingPayload;
  backHref: string;
  onAttemptSaved?: (attempt: QuizAttemptHistoryItem) => void;
};

function percentClass(percent: number) {
  if (percent >= 80) return "text-emerald-600";
  if (percent >= 50) return "text-[var(--brand-blue)]";
  return "text-red-500";
}

function questionIsAnswered(question: QuizTakingQuestion, answers: Record<string, string | undefined>) {
  return Boolean(answers[question.id]);
}

function ResultView({ result, onRetry, backHref }: { result: QuizSubmitResult; onRetry: () => void; backHref: string }) {
  const passed = result.percent >= 70;
  return (
    <section className="rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8">
      <div className="text-center">
        <div className={`mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl ${passed ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"}`}>
          {passed ? <CheckCircle2 className="size-9" /> : <ClipboardList className="size-9" />}
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--gray-900)]">Результат сохранён</h2>
        <p className={`mt-4 text-6xl font-extrabold ${percentClass(result.percent)}`}>{result.percent}%</p>
        <p className="mt-3 text-sm font-semibold text-[var(--gray-500)]">
          Правильных ответов: {result.correct_count} из {result.total_questions}
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {result.details.map((detail, index) => (
          <article key={detail.question_id} className="rounded-2xl border border-[var(--border-xs)] bg-[var(--gray-50)] p-5">
            <div className="flex items-start gap-3">
              {detail.is_correct ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-[var(--gray-900)]">Вопрос {index + 1}: {detail.question_text}</p>
                <div className="mt-3 grid gap-2 text-sm text-[var(--gray-600)]">
                  <p>
                    <span className="font-bold text-[var(--gray-800)]">Ваш ответ: </span>
                    {detail.selected_answers?.length ? detail.selected_answers.map((answer) => answer.answer_text).join(", ") : "—"}
                  </p>
                  {!detail.is_correct && (
                    <p>
                      <span className="font-bold text-[var(--gray-800)]">Правильный ответ: </span>
                      {detail.correct_answers.map((answer) => answer.answer_text).join(", ") || "—"}
                    </p>
                  )}
                  {detail.explanation && <p className="leading-relaxed text-[var(--gray-500)]">{detail.explanation}</p>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {result.progress_warning && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Результат сохранён, но статистика обновится позже.
        </div>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to={backHref} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border-sm)] bg-[var(--bg-surface)] px-5 text-sm font-bold text-[var(--gray-700)] no-underline">
          Вернуться к курсу
        </Link>
        <button type="button" onClick={onRetry} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-bold text-white">
          <RotateCcw className="size-4" /> Пройти ещё раз
        </button>
      </div>
    </section>
  );
}

function AttemptsHistory({ attempts }: { attempts: QuizAttemptHistoryItem[] }) {
  return (
    <aside className="rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <History className="size-5 text-[var(--brand-blue)]" />
        <h3 className="font-extrabold text-[var(--gray-900)]">История попыток</h3>
      </div>
      {attempts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-sm)] p-4 text-sm font-semibold text-[var(--gray-500)]">Попыток пока нет.</p>
      ) : (
        <div className="space-y-2">
          {attempts.map((attempt) => (
            <div key={attempt.id || `${attempt.attempt_number}-${attempt.created_at}`} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--gray-50)] px-4 py-3">
              <div>
                <p className="text-sm font-extrabold text-[var(--gray-900)]">Попытка {attempt.attempt_number}</p>
                <p className="text-xs font-semibold text-[var(--gray-400)]">{formatRuDateTime(attempt.created_at)}</p>
              </div>
              <p className={`text-lg font-extrabold ${percentClass(attempt.percent ?? attempt.score)}`}>{attempt.percent ?? attempt.score}%</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export default function QuizPanel({ payload, backHref, onAttemptSaved }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptHistoryItem[]>(payload.attempts ?? []);

  const questions = payload.questions;
  const answeredCount = useMemo(() => questions.filter((question) => questionIsAnswered(question, answers)).length, [answers, questions]);
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const chooseAnswer = (questionId: string, optionId: string) => {
    if (submitting || result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!allAnswered) {
      setError("Ответьте на все вопросы перед отправкой.");
      toast.error("Ответьте на все вопросы перед отправкой.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const response = await submitQuizAttempt(payload.quiz.id, questions.map((question) => ({
      question_id: question.id,
      selected_option_ids: answers[question.id] ? [answers[question.id]!] : [],
    })));
    setSubmitting(false);

    if (response.error || !response.data) {
      const message = toUserErrorMessage(response.error, "Не удалось сохранить результат. Попробуйте ещё раз.");
      setError(message);
      toast.error(message);
      return;
    }

    setResult(response.data);
    toast.success("Квиз отправлен");
    const attempt = response.data.attempt;
    if (attempt?.id) {
      const normalizedAttempt: QuizAttemptHistoryItem = {
        id: attempt.id,
        quiz_id: payload.quiz.id,
        score: Number(attempt.score ?? response.data.percent),
        percent: Number(attempt.percent ?? attempt.score ?? response.data.percent),
        attempt_number: Number(attempt.attempt_number ?? attempts.length + 1),
        created_at: attempt.created_at || new Date().toISOString(),
      };
      setAttempts((prev) => [normalizedAttempt, ...prev.filter((item) => item.id !== normalizedAttempt.id)]);
      onAttemptSaved?.(normalizedAttempt);
    }
  };

  const retry = () => {
    setResult(null);
    setAnswers({});
    setError(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Link to={backHref} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-blue)] no-underline hover:text-[var(--brand-blue-dark)]">
          <ArrowLeft className="size-4" /> Назад к курсу
        </Link>

        <section className="mb-5 rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-blue)]/10 px-3 py-1.5 text-xs font-bold text-[var(--brand-blue)]">
            <ClipboardList className="size-4" /> Проверка знаний
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--gray-900)]">{payload.quiz.title}</h1>
          {payload.quiz.description && <p className="mt-3 text-sm leading-relaxed text-[var(--gray-500)]">{payload.quiz.description}</p>}
          {!result && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--gray-500)]">
                <span>Ответы</span>
                <span>{answeredCount} из {questions.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--gray-100)]">
                <div className="h-full rounded-full bg-[var(--brand-blue)] transition-all" style={{ width: `${questions.length ? Math.round((answeredCount / questions.length) * 100) : 0}%` }} />
              </div>
            </div>
          )}
        </section>

        {result ? (
          <ResultView result={result} backHref={backHref} onRetry={retry} />
        ) : (
          <section className="rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-5 shadow-sm sm:p-6">
            <div className="space-y-5">
              {questions.map((question, questionIndex) => (
                <article key={question.id} className="rounded-2xl border border-[var(--border-xs)] bg-[var(--gray-50)] p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-blue)]/10 text-sm font-extrabold text-[var(--brand-blue)]">
                      {questionIndex + 1}
                    </div>
                    <h2 className="text-base font-extrabold leading-snug text-[var(--gray-900)]">{question.question_text}</h2>
                  </div>
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option.id;
                      return (
                        <button
                          type="button"
                          key={option.id}
                          onClick={() => chooseAnswer(question.id, option.id)}
                          disabled={submitting}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${selected ? "border-[var(--brand-blue)] bg-[var(--brand-blue)]/10 text-[var(--brand-blue)]" : "border-[var(--border-sm)] bg-[var(--bg-surface)] text-[var(--gray-700)] hover:border-[var(--brand-blue)]/40"}`}
                        >
                          <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-[var(--brand-blue)] bg-[var(--brand-blue)]" : "border-[var(--gray-300)]"}`}>
                            {selected && <span className="size-2 rounded-full bg-white" />}
                          </span>
                          <span>{option.answer_text}</span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border-xs)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[var(--gray-500)]">
                {allAnswered ? "Можно отправить ответы." : `Осталось ответить: ${questions.length - answeredCount}`}
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Сохраняем результат…" : "Отправить ответы"}
              </button>
            </div>
          </section>
        )}
      </div>

      <AttemptsHistory attempts={attempts} />
    </div>
  );
}
