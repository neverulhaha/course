import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Check, Sparkles, Clock, Target, Layers, BookOpen } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { fetchCoursePlanStructure, syncCourseStatusFromContent } from "@/services/courseEditor.service";
import { generateCoursePlan } from "@/services/aiGeneration.service";

export default function PlanResult() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const stateGenerationError = typeof (location.state as { generationError?: unknown } | null)?.generationError === "string"
    ? String((location.state as { generationError?: unknown }).generationError)
    : null;
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep] = useState(2);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("—");
  const [duration, setDuration] = useState("—");
  const [goal, setGoal] = useState("—");
  const [modules, setModules] = useState<
    { id: string; title: string; lessons: { id: string; title: string; goal: string; duration: string }[] }[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(stateGenerationError);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const loadPlan = async () => {
    if (!courseId || !user?.id) {
      setIsLoading(false);
      setLoadError(!user?.id ? "auth" : "no_id");
      return;
    }
    const res = await fetchCoursePlanStructure(courseId, user.id);
    if (res.error === "forbidden" || res.error === "not_found") {
      setLoadError(res.error);
      setIsLoading(false);
      return;
    }
    if (res.error) {
      setLoadError(res.error);
      setIsLoading(false);
      return;
    }
    setTitle(res.title);
    setLevel(res.level);
    setDuration(res.duration);
    setGoal(res.goal);
    setModules(res.modules);
    if (res.modules.length > 0) setGenerationError(null);
    setLoadError(null);
    void syncCourseStatusFromContent(courseId, user.id);
    setIsLoading(false);
  };

  const handleGeneratePlan = async () => {
    if (!courseId) return;
    setGeneratingPlan(true);
    setLoadError(null);
    setGenerationError(null);
    const res = await generateCoursePlan(courseId);
    setGeneratingPlan(false);
    if (res.error) {
      setGenerationError(res.error);
      return;
    }
    setIsLoading(true);
    await loadPlan();
  };

  useEffect(() => {
    if (!courseId || !user?.id) {
      setIsLoading(false);
      setLoadError(!user?.id ? "auth" : "no_id");
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchCoursePlanStructure(courseId, user.id);
      if (cancelled) return;
      if (res.error === "forbidden" || res.error === "not_found") {
        setLoadError(res.error);
        setIsLoading(false);
        return;
      }
      if (res.error) {
        setLoadError(res.error);
        setIsLoading(false);
        return;
      }
      setTitle(res.title);
      setLevel(res.level);
      setDuration(res.duration);
      setGoal(res.goal);
      setModules(res.modules);
      if (res.modules.length > 0) setGenerationError(null);
      void syncCourseStatusFromContent(courseId, user.id);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, user?.id]);

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

  if (loadError === "forbidden" || loadError === "not_found") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-white flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-gray-700">Курс не найден или нет доступа.</p>
        <Link to="/app" className="text-sm font-semibold text-[#4A90E2]">
          К списку курсов
        </Link>
      </div>
    );
  }

  if (loadError || modules.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-gray-700">
          {loadError === "auth"
            ? "Войдите, чтобы просмотреть план."
            : generationError ?? "Пока нет модулей и уроков. Запустите генерацию плана."}
        </p>
        {courseId && loadError !== "auth" && (
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
            className="rounded-xl bg-[#4A90E2] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {generatingPlan ? "Генерация плана…" : "Сгенерировать план"}
          </button>
        )}
        {courseId && (
          <Link to={`/app/editor/${courseId}`} className="text-sm font-semibold text-[#4A90E2]">
            Открыть редактор
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-white">
      <PageHeader
        backTo="/app"
        backLabel="Мои курсы"
        title="План курса готов"
        subtitle="Проверьте структуру и продолжите наполнение уроков"
        badge={
          <span className="flex items-center gap-1.5 px-3 py-1 bg-[#2ECC71]/20 border border-[#2ECC71]/40 rounded-lg text-sm font-bold text-gray-700">
            <Check className="w-3.5 h-3.5 text-[#4A90E2]" />
            Генерация завершена
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg font-semibold">{level}</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {duration}
                    </span>
                  </div>
                </div>
                <div className="p-5 bg-[#F9FAFB] rounded-xl border border-gray-200">
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide block mb-2">Цель курса</span>
                  <p className="text-gray-900 leading-relaxed">{goal}</p>
                </div>
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-6">
              {modules.map((module, index) => (
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
                  Открыть редактор
                </Link>

                <Link
                  to={`/learn/${courseId}`}
                  className="flex items-center justify-center gap-2 w-full px-5 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  Перейти к обучению
                </Link>
              </div>

              <hr className="my-6 border-gray-200" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 font-medium">Модулей:</span>
                  <span className="font-bold text-gray-900">{modules.length}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 font-medium">Уроков:</span>
                  <span className="font-bold text-gray-900">
                    {modules.reduce((acc, m) => acc + m.lessons.length, 0)}
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
                Проверьте структуру курса, затем откройте редактор для наполнения уроков и настройки материалов.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}