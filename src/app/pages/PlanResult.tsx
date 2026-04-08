import { useState } from "react";
import { Link, useParams } from "react-router";
import { Check, Edit, Sparkles, Plus, ChevronRight, Clock, Target, Layers } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState } from "../components/LoadingState";

const mockPlan = {
  title: "Основы Python для начинающих",
  level: "Начальный",
  duration: "4-6 недель",
  goal: "Научить студентов базовым концепциям программирования на Python и подготовить к самостоятельной разработке простых приложений",
  modules: [
    {
      id: "m1",
      title: "Введение в программирование и Python",
      lessons: [
        {
          id: "l1",
          title: "Что такое программирование?",
          goal: "Понять основные концепции программирования",
          duration: "45 мин",
        },
        {
          id: "l2",
          title: "Установка Python и первая программа",
          goal: "Настроить рабочую среду и написать Hello World",
          duration: "60 мин",
        },
        {
          id: "l3",
          title: "Переменные и типы данных",
          goal: "Освоить работу с переменными и основными типами",
          duration: "90 мин",
        },
      ],
    },
    {
      id: "m2",
      title: "Управляющие конструкции",
      lessons: [
        {
          id: "l4",
          title: "Условные операторы (if, elif, else)",
          goal: "Научиться принимать решения в коде",
          duration: "75 мин",
        },
        {
          id: "l5",
          title: "Циклы (for и while)",
          goal: "Освоить повторение действий",
          duration: "90 мин",
        },
      ],
    },
    {
      id: "m3",
      title: "Функции и модули",
      lessons: [
        {
          id: "l6",
          title: "Создание и использование функций",
          goal: "Структурировать код с помощью функций",
          duration: "90 мин",
        },
      ],
    },
  ],
};

export default function PlanResult() {
  const { courseId } = useParams();
  const [isLoading] = useState(false); // Toggle for demo
  const [currentStep] = useState(2); // Demo progress

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-white">
        <LoadingState
          type="generating-plan"
          progress={60}
          currentStep={currentStep}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-white">
      <PageHeader
        backTo="/app"
        backLabel="Мои курсы"
        title="План курса готов"
        subtitle="Проверьте структуру и продолжите генерацию контента"
        badge={
          <span className="flex items-center gap-1.5 px-3 py-1 bg-[#2ECC71]/20 border border-[#2ECC71]/40 rounded-lg text-sm font-bold text-gray-700">
            <Check className="w-3.5 h-3.5 text-[#4A90E2]" />
            ИИ завершил
          </span>
        }
      />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Info */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A90E2]/20 to-[#4A90E2]/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#4A90E2]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Информация о курсе</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{mockPlan.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg font-semibold">{mockPlan.level}</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {mockPlan.duration}
                    </span>
                  </div>
                </div>
                <div className="p-5 bg-[#F9FAFB] rounded-xl border border-gray-200">
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide block mb-2">Цель курса</span>
                  <p className="text-gray-900 leading-relaxed">{mockPlan.goal}</p>
                </div>
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-6">
              {mockPlan.modules.map((module, index) => (
                <div key={module.id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition-all">
                  <div className="bg-gradient-to-r from-[#4A90E2]/10 to-[#4A90E2]/5 px-6 py-5 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A90E2] to-[#1E3A5F] text-white flex items-center justify-center font-bold shadow-lg shadow-[#4A90E2]/30">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{module.title}</h3>
                        <span className="text-sm text-gray-600 font-medium">{module.lessons.length} уроков</span>
                      </div>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Редактировать модуль">
                        <Edit className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        className="p-5 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-xl hover:border-[#4A90E2]/30 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-lg bg-[#2ECC71]/20 flex items-center justify-center font-bold text-gray-900 text-sm flex-shrink-0 group-hover:bg-[#2ECC71]/30 transition-colors">
                            {lessonIndex + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-2 text-lg">{lesson.title}</h4>
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">{lesson.goal}</p>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                                <Clock className="w-4 h-4" />
                                {lesson.duration}
                              </span>
                            </div>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-lg transition-all" title="Редактировать урок">
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Module Button */}
            <button className="w-full px-6 py-5 bg-white border-2 border-dashed border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 hover:border-[#4A90E2] hover:text-[#4A90E2] transition-all flex items-center justify-center gap-3 group">
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Добавить модуль
            </button>
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Действия</h3>

              <div className="space-y-4">
                <Link
                  to={`/app/editor/${courseId}`}
                  className="flex items-center justify-center gap-2 w-full px-5 py-4 bg-[#4A90E2] text-white rounded-xl font-bold hover:bg-[#1E3A5F] transition-all shadow-xl shadow-[#4A90E2]/30 hover:shadow-2xl hover:shadow-[#4A90E2]/40"
                >
                  <Sparkles className="w-5 h-5" />
                  Сгенерировать контент
                </Link>

                <button className="flex items-center justify-center gap-2 w-full px-5 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                  <Edit className="w-5 h-5" />
                  Редактировать план
                </button>

                <button className="flex items-center justify-center gap-2 w-full px-5 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                  <Plus className="w-5 h-5" />
                  Сохранить как черновик
                </button>
              </div>

              <hr className="my-6 border-gray-200" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 font-medium">Модулей:</span>
                  <span className="font-bold text-gray-900">{mockPlan.modules.length}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 font-medium">Уроков:</span>
                  <span className="font-bold text-gray-900">
                    {mockPlan.modules.reduce((acc, m) => acc + m.lessons.length, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-gradient-to-br from-[#4A90E2]/10 via-white to-[#2ECC71]/10 border-2 border-[#4A90E2]/20 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[#4A90E2] flex items-center justify-center mb-4">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 mb-3">Что дальше?</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Проверьте структуру курса и нажмите «Сгенерировать контент» чтобы создать уроки и практические задания.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}