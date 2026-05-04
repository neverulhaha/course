import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Eye, Sparkles, Plus, Trash2, MoreVertical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchLessonHeader } from "@/services/courseEditor.service";

export default function LessonEditor() {
  const { courseId, lessonId } = useParams();
  const { user } = useAuth();
  const [lessonTitle, setLessonTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [theoryText, setTheoryText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !lessonId || !user?.id) {
      setLoading(false);
      setLoadError(!user?.id ? "auth" : "params");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchLessonHeader(courseId, lessonId, user.id);
      if (cancelled) return;
      if (res.error) {
        setLoadError(res.error);
        setLoading(false);
        return;
      }
      setLessonTitle(res.lessonTitle);
      setGoal(res.goal);
      setTheoryText(res.theoryText);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <p className="text-sm text-gray-600">Загрузка урока…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-gray-700">
          {loadError === "forbidden" || loadError === "not_found"
            ? "Урок не найден или нет доступа."
            : "Не удалось загрузить данные урока."}
        </p>
        <Link to={courseId ? `/app/editor/${courseId}` : "/app"} className="text-[#4A90E2] font-semibold text-sm">
          Назад
        </Link>
      </div>
    );
  }

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
                <h1 className="text-xl font-bold text-gray-900">{lessonTitle}</h1>
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
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Цель урока
                  </label>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
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
                value={theoryText}
                onChange={(e) => setTheoryText(e.target.value)}
              />
            </div>

            {/* Examples — блоки example/code ведутся в основном редакторе курса */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Примеры</h3>
              <p className="text-sm text-gray-600">
                Отдельные блоки «пример» и «код» хранятся в <code className="text-xs text-gray-800">lesson_contents</code> и
                редактируются в редакторе курса. Здесь показан объединённый текст теории выше.
              </p>
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
                    placeholder="Задание можно добавить в блоках «практика» в редакторе курса"
                    defaultValue=""
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
                  <p className="text-sm text-gray-600">Связь квиза с уроком — в таблице quizzes (lesson_id)</p>
                </div>
                <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium">
                  {/* TODO: ссылка на /app/editor/:courseId/quiz/:id когда квиз загружается из БД */}
                  Квиз в БД
                </span>
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
