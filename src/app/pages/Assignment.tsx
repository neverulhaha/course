import { Link, useParams } from "react-router";
import { ArrowLeft, Upload, CheckCircle, FileText } from "lucide-react";

export default function Assignment() {
  const { courseId, assignmentId } = useParams();

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <Link
          to={`/learn/${courseId}`}
          className="inline-flex items-center gap-2 text-[#4A90E2] hover:text-[#1E3A5F] mb-6 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к уроку
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-[#4A90E2]/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-[#4A90E2]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Практическое задание</h1>
              <p className="text-gray-600">Урок: Установка Python и первая программа</p>
            </div>
          </div>

          <div className="prose max-w-none">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Описание задания:</h3>
            <p className="text-gray-800 leading-relaxed mb-6">
              Напишите программу на Python, которая выводит на экран ваше имя, возраст и любимый язык программирования.
              Используйте функцию print() для каждой строки вывода.
            </p>

            <h3 className="text-lg font-bold text-gray-900 mb-4">Критерии выполнения:</h3>
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Программа запускается без ошибок</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Выводит три строки с информацией</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Использует правильный синтаксис Python</span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-4">Пример ожидаемого результата:</h3>
            <div className="bg-gray-900 rounded-lg p-4 mb-8 overflow-x-auto">
              <pre className="text-gray-100 text-sm">
                <code>{`Меня зовут Иван
Мне 25 лет
Мой любимый язык программирования: Python`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Submission Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Ваше решение:</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Вставьте код программы:
              </label>
              <textarea
                className="w-full h-48 px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent resize-none font-mono text-sm"
                placeholder="print('Меня зовут ...')"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Или загрузите файл .py:
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#4A90E2] hover:bg-[#4A90E2]/5 transition-all cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-1">Перетащите файл или нажмите для выбора</p>
                <p className="text-sm text-gray-500">Поддерживаются файлы .py</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Комментарий (необязательно):
              </label>
              <textarea
                className="w-full h-24 px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent resize-none"
                placeholder="Опишите ваше решение или возникшие сложности..."
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <Link
                to={`/learn/${courseId}`}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Отменить
              </Link>

              <button className="flex-1 px-6 py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Отправить на проверку
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-6 bg-[#4A90E2]/5 border border-[#4A90E2]/20 rounded-xl">
          <h4 className="font-semibold text-gray-900 mb-2">💡 Подсказка</h4>
          <p className="text-sm text-gray-700">
            Используйте три отдельных вызова функции print() для вывода трёх строк. Не забудьте заключить текст в кавычки!
          </p>
        </div>
      </div>
    </div>
  );
}
