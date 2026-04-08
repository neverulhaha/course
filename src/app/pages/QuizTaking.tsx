import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const mockQuiz = {
  title: "Квиз: Установка Python и первая программа",
  questions: [
    {
      id: 1,
      text: "Какая функция используется для вывода текста в Python?",
      options: ["print()", "echo()", "write()", "display()"],
      correct: 0,
      explanation: "В Python для вывода текста используется функция print().",
    },
    {
      id: 2,
      text: "Что будет результатом выполнения: print('Hello' + ' ' + 'World')",
      options: ["Hello World", "HelloWorld", "Ошибка", "Hello + World"],
      correct: 0,
      explanation: "Оператор + склеивает (конкатенирует) строки. Результат: Hello World",
    },
    {
      id: 3,
      text: "Какое расширение имеют файлы программ на Python?",
      options: [".txt", ".python", ".py", ".pyt"],
      correct: 2,
      explanation: "Файлы программ на Python имеют расширение .py",
    },
    {
      id: 4,
      text: "Нужно ли компилировать программы на Python перед запуском?",
      options: ["Да, всегда", "Нет, Python - интерпретируемый язык", "Только большие программы", "Зависит от версии"],
      correct: 1,
      explanation: "Python - интерпретируемый язык, компиляция не требуется.",
    },
    {
      id: 5,
      text: "Что такое Hello World программа?",
      options: [
        "Программа для приветствия пользователя",
        "Традиционная первая программа для изучения языка",
        "Программа для перевода текста",
        "Программа для работы с файлами",
      ],
      correct: 1,
      explanation: "Hello World - традиционная первая программа при изучении программирования.",
    },
  ],
};

export default function QuizTaking() {
  const { courseId, quizId } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < mockQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    mockQuiz.questions.forEach((question, index) => {
      if (answers[index] === question.correct) {
        correct++;
      }
    });
    return Math.round((correct / mockQuiz.questions.length) * 100);
  };

  if (showResults) {
    const score = calculateScore();
    const passed = score >= 70;

    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              passed ? "bg-[#2ECC71]/20" : "bg-red-100"
            }`}>
              {passed ? (
                <CheckCircle className="w-12 h-12 text-[#4A90E2]" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {passed ? "Квиз пройден!" : "Попробуйте ещё раз"}
            </h1>

            <div className="text-6xl font-bold mb-4" style={{ color: passed ? "#4A90E2" : "#E74C3C" }}>
              {score}%
            </div>

            <p className="text-xl text-gray-600 mb-8">
              Правильных ответов: {mockQuiz.questions.filter((q, i) => answers[i] === q.correct).length} из {mockQuiz.questions.length}
            </p>

            {passed ? (
              <p className="text-gray-700 mb-8">
                Отличная работа! Вы хорошо усвоили материал урока.
              </p>
            ) : (
              <p className="text-gray-700 mb-8">
                Для прохождения необходимо набрать минимум 70%. Рекомендуем повторить материал урока.
              </p>
            )}

            {/* Detailed Results */}
            <div className="bg-[#F9FAFB] rounded-xl p-6 mb-8 text-left">
              <h3 className="font-bold text-gray-900 mb-4">Детальные результаты:</h3>
              <div className="space-y-3">
                {mockQuiz.questions.map((question, index) => {
                  const isCorrect = answers[index] === question.correct;
                  return (
                    <div key={question.id} className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Вопрос {index + 1}: {question.text}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-gray-600">
                            Правильный ответ: {question.options[question.correct]}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{question.explanation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center">
              <Link
                to={`/learn/${courseId}`}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Вернуться к уроку
              </Link>

              {!passed && (
                <button
                  onClick={() => {
                    setAnswers([]);
                    setCurrentQuestion(0);
                    setShowResults(false);
                  }}
                  className="px-6 py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors"
                >
                  Пройти повторно
                </button>
              )}

              {passed && (
                <Link
                  to={`/learn/${courseId}`}
                  className="px-6 py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors"
                >
                  Следующий урок
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = mockQuiz.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-8">
      <div className="max-w-3xl w-full">
        <Link
          to={`/learn/${courseId}`}
          className="inline-flex items-center gap-2 text-[#4A90E2] hover:text-[#1E3A5F] mb-6 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к уроку
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="font-semibold">{mockQuiz.title}</span>
              <span>Вопрос {currentQuestion + 1} из {mockQuiz.questions.length}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4A90E2] to-[#2ECC71] transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / mockQuiz.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#4A90E2]/10 text-[#4A90E2] flex items-center justify-center font-bold flex-shrink-0">
                {currentQuestion + 1}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 flex-1">{question.text}</h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    answers[currentQuestion] === index
                      ? "border-[#4A90E2] bg-[#4A90E2]/5"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        answers[currentQuestion] === index
                          ? "border-[#4A90E2] bg-[#4A90E2]"
                          : "border-gray-300"
                      }`}
                    >
                      {answers[currentQuestion] === index && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className={`font-medium ${
                      answers[currentQuestion] === index ? "text-[#4A90E2]" : "text-gray-700"
                    }`}>
                      {option}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          {answers[currentQuestion] === undefined && (
            <div className="mb-6 p-4 bg-[#4A90E2]/5 border border-[#4A90E2]/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#4A90E2] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Выберите один из вариантов ответа
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Назад
            </button>

            <button
              onClick={handleNext}
              disabled={answers[currentQuestion] === undefined}
              className="px-6 py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentQuestion === mockQuiz.questions.length - 1 ? "Завершить" : "Далее →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
