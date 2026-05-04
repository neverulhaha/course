import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { fetchQuizForTakingSecure, submitQuizAttempt, type QuizSubmitResult, type QuizTakingQuestion } from "@/services/quiz.service";

export default function QuizTaking() {
  const { courseId, quizId } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizTakingQuestion[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      setLoadError("Квиз не найден");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchQuizForTakingSecure(quizId);
      if (cancelled) return;
      if (res.error || !res.data || res.data.questions.length === 0) {
        setLoadError(res.error ?? "В квизе нет вопросов");
        setLoading(false);
        return;
      }
      setTitle(res.data.quiz.title);
      setDescription(res.data.quiz.description);
      setQuestions(res.data.questions);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? []).length > 0).length,
    [questions, answers],
  );

  const handleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) setCurrentQuestion((v) => v + 1);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) setCurrentQuestion((v) => v - 1);
  };

  const handleSubmit = async () => {
    if (!quizId || submitting || answeredCount !== questions.length) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload = questions.map((q) => ({ question_id: q.id, selected_option_ids: answers[q.id] ?? [] }));
    const res = await submitQuizAttempt(quizId, payload);
    setSubmitting(false);
    if (res.error || !res.data) {
      setSubmitError(res.error ?? "Не удалось отправить ответы");
      return;
    }
    setResult(res.data);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-8"><p className="text-sm text-gray-600">Загрузка квиза…</p></div>;
  }

  if (loadError || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-gray-700">{loadError ?? "Не удалось загрузить квиз."}</p>
        <Link to={courseId ? `/learn/${courseId}` : "/app"} className="text-[#4A90E2] font-semibold text-sm">Назад</Link>
      </div>
    );
  }

  if (result) {
    const passed = result.percent >= 70;
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-8">
        <div className="max-w-3xl w-full">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${passed ? "bg-[#2ECC71]/20" : "bg-red-100"}`}>
              {passed ? <CheckCircle className="w-12 h-12 text-[#4A90E2]" /> : <XCircle className="w-12 h-12 text-red-500" />}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{passed ? "Квиз пройден" : "Результат сохранён"}</h1>
            <div className="text-6xl font-bold mb-4" style={{ color: passed ? "#4A90E2" : "#E74C3C" }}>{result.percent}%</div>
            <p className="text-xl text-gray-600 mb-8">Правильных ответов: {result.correct_count} из {result.total_questions}</p>

            <div className="bg-[#F9FAFB] rounded-xl p-6 mb-8 text-left">
              <h3 className="font-bold text-gray-900 mb-4">Разбор ответов</h3>
              <div className="space-y-4">
                {result.details.map((detail, index) => (
                  <div key={detail.question_id} className="flex items-start gap-3">
                    {detail.is_correct ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Вопрос {index + 1}: {detail.question_text}</p>
                      {!detail.is_correct && detail.correct_answers.length > 0 && (
                        <p className="text-sm text-gray-600">Правильный ответ: {detail.correct_answers.map((a) => a.answer_text).join(", ")}</p>
                      )}
                      {detail.explanation && <p className="text-xs text-gray-500 mt-1">{detail.explanation}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.progress_warning && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{result.progress_warning}</p>}

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <Link to={courseId ? `/learn/${courseId}` : "/app"} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors">Вернуться к курсу</Link>
              <button type="button" onClick={() => { setResult(null); setAnswers({}); setCurrentQuestion(0); }} className="px-6 py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors">Пройти повторно</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion]!;
  const selectedOptionId = answers[question.id]?.[0];

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-8">
      <div className="max-w-3xl w-full">
        <Link to={courseId ? `/learn/${courseId}` : "/app"} className="inline-flex items-center gap-2 text-[#4A90E2] hover:text-[#1E3A5F] mb-6 font-semibold"><ArrowLeft className="w-5 h-5" />Назад к курсу</Link>
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2"><span className="font-semibold">{title}</span><span>Вопрос {currentQuestion + 1} из {questions.length}</span></div>
            {description && <p className="text-sm text-gray-500 mb-3">{description}</p>}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#4A90E2] to-[#2ECC71] transition-all duration-300" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} /></div>
          </div>

          <div className="mb-8">
            <div className="flex items-start gap-4 mb-6"><div className="w-10 h-10 rounded-lg bg-[#4A90E2]/10 text-[#4A90E2] flex items-center justify-center font-bold flex-shrink-0">{currentQuestion + 1}</div><h2 className="text-2xl font-bold text-gray-900 flex-1">{question.question_text}</h2></div>
            <div className="space-y-3">
              {question.options.map((option) => (
                <button key={option.id} type="button" onClick={() => handleAnswer(question.id, option.id)} className={`w-full p-4 rounded-lg border-2 text-left transition-all ${selectedOptionId === option.id ? "border-[#4A90E2] bg-[#4A90E2]/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                  <div className="flex items-center gap-4"><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedOptionId === option.id ? "border-[#4A90E2] bg-[#4A90E2]" : "border-gray-300"}`}>{selectedOptionId === option.id && <div className="w-2 h-2 rounded-full bg-white" />}</div><span className={`font-medium ${selectedOptionId === option.id ? "text-[#4A90E2]" : "text-gray-700"}`}>{option.answer_text}</span></div>
                </button>
              ))}
            </div>
          </div>

          {!selectedOptionId && <div className="mb-6 p-4 bg-[#4A90E2]/5 border border-[#4A90E2]/20 rounded-lg flex items-start gap-3"><AlertCircle className="w-5 h-5 text-[#4A90E2] flex-shrink-0 mt-0.5" /><p className="text-sm text-gray-700">Выберите один из вариантов ответа</p></div>}
          {submitError && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm font-semibold text-red-700">{submitError}</div>}

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button type="button" onClick={handlePrevious} disabled={currentQuestion === 0} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">← Назад</button>
            {currentQuestion === questions.length - 1 ? (
              <button type="button" onClick={handleSubmit} disabled={answeredCount !== questions.length || submitting} className="px-6 py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? "Отправка…" : "Отправить ответы"}</button>
            ) : (
              <button type="button" onClick={handleNext} disabled={!selectedOptionId} className="px-6 py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Далее →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
