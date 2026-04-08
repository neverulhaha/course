import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Plus, Trash2, Sparkles, Check, X, HelpCircle } from "lucide-react";
import { EmptyState } from "../components/EmptyState";

const mockQuiz = {
  title: "Квиз: Что такое программирование?",
  questions: [
    {
      id: "q1",
      text: "Что такое программирование?",
      options: [
        "Процесс создания компьютерных программ",
        "Работа с текстовыми документами",
        "Ремонт компьютеров",
        "Установка операционной системы",
      ],
      correct: 0,
      explanation: "Программирование — это процесс создания программ с помощью языков программирования.",
    },
    {
      id: "q2",
      text: "Что из перечисленного НЕ является языком программирования?",
      options: ["Python", "HTML", "Java", "Microsoft Word"],
      correct: 3,
      explanation: "Microsoft Word — это текстовый редактор, а не язык программирования.",
    },
  ],
};

export default function QuizEditor() {
  const { courseId, quizId } = useParams();
  const [hasQuiz] = useState(true); // Toggle to show empty state

  if (!hasQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200/80 shadow-sm">
          <div className="max-w-5xl mx-auto px-8 py-5">
            <div className="flex items-center gap-4">
              <Link
                to={`/app/editor/${courseId}`}
                className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Квиз урока</h1>
                <p className="text-sm text-gray-600">Проверка знаний студентов</p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="max-w-5xl mx-auto px-8 py-12">
          <EmptyState
            icon={HelpCircle}
            title="Квиз еще не создан"
            description="Создайте квиз для проверки знаний студентов после прохождения урока. ИИ может автоматически сгенерировать вопросы на основе содержимого урока."
            action={
              <div className="flex items-center gap-4">
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A90E2] text-white rounded-xl font-semibold hover:bg-[#1E3A5F] transition-all shadow-lg shadow-[#4A90E2]/30">
                  <Sparkles className="w-5 h-5" />
                  Сгенерировать квиз
                </button>
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                  <Plus className="w-5 h-5" />
                  Создать вручную
                </button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/app/editor/${courseId}`}
                className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{mockQuiz.title}</h1>
                <p className="text-sm text-gray-600">Редактирование квиза</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-[#4A90E2]/10 text-[#4A90E2] border border-[#4A90E2]/30 rounded-lg font-semibold hover:bg-[#4A90E2]/20 transition-colors">
                <Sparkles className="w-5 h-5" />
                Перегенерировать квиз
              </button>

              <button className="flex items-center gap-2 px-6 py-2 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors">
                <Save className="w-5 h-5" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="space-y-6">
          {/* Questions */}
          {mockQuiz.questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[#4A90E2]/10 text-[#4A90E2] flex items-center justify-center font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <textarea
                      defaultValue={question.text}
                      className="w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent resize-none"
                      rows={2}
                    />
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-4">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm font-semibold text-gray-700">Варианты ответов:</p>
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={question.correct === optionIndex}
                      className="w-5 h-5 text-[#2ECC71] focus:ring-[#4A90E2]"
                      readOnly
                    />
                    <input
                      type="text"
                      defaultValue={option}
                      className="flex-1 px-4 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                    />
                    {question.correct === optionIndex && (
                      <span className="px-3 py-1 bg-[#2ECC71]/20 text-[#374151] rounded-lg text-sm font-semibold border border-[#2ECC71]/30 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Верно
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Пояснение к правильному ответу:
                </label>
                <textarea
                  defaultValue={question.explanation}
                  className="w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent resize-none"
                  rows={2}
                />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
                <button className="text-sm text-[#4A90E2] hover:text-[#1E3A5F] font-semibold flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Добавить вариант
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-900 font-semibold">
                  Перегенерировать вопрос
                </button>
              </div>
            </div>
          ))}

          {/* Add Question Button */}
          <button className="w-full p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-[#4A90E2] hover:bg-[#4A90E2]/5 transition-all text-[#4A90E2] font-semibold flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Добавить вопрос
          </button>

          {/* Quiz Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Настройки квиза</h3>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-[#4A90E2] rounded" />
                <span className="text-gray-700">Показывать пояснения после ответа</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-[#4A90E2] rounded" />
                <span className="text-gray-700">Перемешивать вопросы</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-[#4A90E2] rounded" />
                <span className="text-gray-700">Перемешивать варианты ответов</span>
              </label>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Проходной балл (%)
                </label>
                <input
                  type="number"
                  defaultValue="70"
                  min="0"
                  max="100"
                  className="w-32 px-4 py-2 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}