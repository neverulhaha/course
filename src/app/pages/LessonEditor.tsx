import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Eye, Sparkles, Plus, Trash2, MoreVertical } from "lucide-react";

export default function LessonEditor() {
  const { courseId, lessonId } = useParams();

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/app/editor/${courseId}`}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Что такое программирование?</h1>
                <p className="text-sm text-gray-600">Редактирование урока</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                <Eye className="w-5 h-5" />
                Предпросмотр
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
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lesson Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Название урока
                  </label>
                  <input
                    type="text"
                    defaultValue="Что такое программирование?"
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Цель урока
                  </label>
                  <input
                    type="text"
                    defaultValue="Понять основные концепции программирования"
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Theory Content */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Теоретический материал</h3>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#4A90E2]/10 text-[#4A90E2] rounded-lg font-semibold hover:bg-[#4A90E2]/20 transition-colors">
                  <Sparkles className="w-4 h-4" />
                  Регенерировать
                </button>
              </div>
              <textarea
                className="w-full h-96 px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent resize-none"
                defaultValue="Программирование — это процесс создания компьютерных программ с помощью языков программирования. Это набор инструкций, которые говорят компьютеру, что делать.

Основные понятия:

1. Алгоритм — последовательность действий для решения задачи
2. Язык программирования — формальный язык для написания программ
3. Компилятор/Интерпретатор — программы для выполнения кода

Зачем нужно программирование:
- Автоматизация повторяющихся задач
- Обработка больших объёмов данных
- Создание веб-сайтов и приложений
- Разработка игр и мультимедиа"
              />
            </div>

            {/* Examples */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Примеры</h3>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                  <Plus className="w-4 h-4" />
                  Добавить пример
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-[#F9FAFB] rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-gray-700 font-medium">Пример 1: Простая программа</p>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>print("Привет, мир!")</code>
                  </pre>
                  <p className="text-sm text-gray-600 mt-2">
                    Эта программа выводит текст на экран
                  </p>
                </div>

                <div className="p-4 bg-[#F9FAFB] rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-gray-700 font-medium">Пример 2: Простые вычисления</p>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{`a = 5
b = 3
print(a + b)  # Выведет: 8`}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Practice Task */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Практическое задание</h3>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#4A90E2]/10 text-[#4A90E2] rounded-lg font-semibold hover:bg-[#4A90E2]/20 transition-colors">
                  <Sparkles className="w-4 h-4" />
                  Сгенерировать
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Описание задания
                  </label>
                  <textarea
                    className="w-full h-32 px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent resize-none"
                    defaultValue="Напишите программу, которая выводит на экран ваше имя и возраст."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Критерии выполнения
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-[#F9FAFB] rounded-lg">
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                      <span className="text-sm text-gray-700">Программа запускается без ошибок</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-[#F9FAFB] rounded-lg">
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                      <span className="text-sm text-gray-700">Выводит корректный текст</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Reference */}
            <div className="bg-gradient-to-br from-[#4A90E2]/5 to-[#2ECC71]/5 rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Квиз для закрепления</h3>
                  <p className="text-sm text-gray-600">5 вопросов по материалу урока</p>
                </div>
                <Link
                  to={`/app/editor/${courseId}/quiz/q1`}
                  className="px-4 py-2 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors"
                >
                  Редактировать квиз
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Инструменты ИИ</h3>

              <div className="space-y-3">
                <button className="w-full px-4 py-2.5 bg-[#4A90E2]/10 text-[#4A90E2] rounded-lg font-semibold hover:bg-[#4A90E2]/20 transition-colors">
                  Сократить
                </button>

                <button className="w-full px-4 py-2.5 bg-[#4A90E2]/10 text-[#4A90E2] rounded-lg font-semibold hover:bg-[#4A90E2]/20 transition-colors">
                  Упростить
                </button>

                <button className="w-full px-4 py-2.5 bg-[#4A90E2]/10 text-[#4A90E2] rounded-lg font-semibold hover:bg-[#4A90E2]/20 transition-colors">
                  Добавить примеры
                </button>

                <button className="w-full px-4 py-2.5 bg-[#4A90E2]/10 text-[#4A90E2] rounded-lg font-semibold hover:bg-[#4A90E2]/20 transition-colors">
                  Расширить материал
                </button>
              </div>

              <hr className="my-4 border-gray-200" />

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Длительность
                  </label>
                  <input
                    type="text"
                    defaultValue="45 минут"
                    className="w-full px-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Уровень
                  </label>
                  <select className="w-full px-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm">
                    <option>Начальный</option>
                    <option>Средний</option>
                    <option>Продвинутый</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
