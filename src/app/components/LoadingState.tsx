import { Loader2, Sparkles, Shield, FileText, CheckCircle, Layers } from "lucide-react";

interface LoadingStateProps {
  type?: "default" | "generating-plan" | "generating-lesson" | "generating-course" | "qa-check" | "processing-source";
  title?: string;
  description?: string;
  progress?: number;
  steps?: string[];
  currentStep?: number;
}

export function LoadingState({
  type = "default",
  title,
  description,
  progress,
  steps,
  currentStep = 0,
}: LoadingStateProps) {
  const configs = {
    default: {
      icon: Loader2,
      title: "Загрузка...",
      description: "Пожалуйста, подождите",
      gradient: "from-[#4A90E2]/10 to-[#4A90E2]/5",
    },
    "generating-plan": {
      icon: Layers,
      title: "Генерация плана курса",
      description: "ИИ анализирует тему и создаёт структуру модулей и уроков",
      gradient: "from-[#4A90E2]/10 via-purple-500/5 to-[#2ECC71]/10",
      steps: [
        "Анализ темы и целевой аудитории",
        "Формирование структуры модулей",
        "Создание списка уроков",
        "Определение целей обучения",
      ],
    },
    "generating-lesson": {
      icon: Sparkles,
      title: "Генерация урока",
      description: "ИИ создаёт материалы урока на основе плана и источников",
      gradient: "from-[#4A90E2]/10 to-[#2ECC71]/10",
      steps: [
        "Анализ цели урока",
        "Извлечение информации из источников",
        "Формирование текстовых блоков",
        "Добавление примеров и иллюстраций",
      ],
    },
    "generating-course": {
      icon: FileText,
      title: "Генерация полного курса",
      description: "ИИ создаёт все уроки курса. Это может занять несколько минут",
      gradient: "from-[#4A90E2]/10 via-purple-500/5 to-[#2ECC71]/10",
    },
    "qa-check": {
      icon: Shield,
      title: "Выполняется проверка качества",
      description: "Система анализирует структуру, связность и соответствие источникам",
      gradient: "from-[#2ECC71]/10 to-green-500/5",
      steps: [
        "Проверка структуры и связности",
        "Анализ соответствия целям",
        "Проверка соответствия источникам",
        "Выявление противоречий",
        "Формирование отчёта",
      ],
    },
    "processing-source": {
      icon: FileText,
      title: "Обработка источника",
      description: "Подготавливаем текст для генерации",
      gradient: "from-blue-500/10 to-[#4A90E2]/5",
      steps: [
        "Проверка текста",
        "Извлечение текста",
        "Анализ структуры",
        "Подготовка содержимого",
      ],
    },
  };

  const config = configs[type];
  const Icon = config.icon;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalSteps = steps || config.steps;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-2xl w-full">
        <div className={`bg-gradient-to-br ${config.gradient} border-2 border-[#4A90E2]/20 rounded-2xl p-10 text-center relative overflow-hidden`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTAgMGgyMHYyMEgweiIgZmlsbD0iIzRBOTBFMiIgb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-50"></div>

          <div className="relative">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#4A90E2] to-[#1E3A5F] rounded-2xl flex items-center justify-center shadow-xl shadow-[#4A90E2]/30">
              <Icon className="w-10 h-10 text-white animate-spin" style={{ animationDuration: "2s" }} />
            </div>

            {/* Text */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{finalTitle}</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">{finalDescription}</p>

            {/* Progress Bar */}
            {progress !== undefined && (
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 font-semibold">Прогресс</span>
                  <span className="text-gray-900 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-3 bg-white/80 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-[#4A90E2] to-[#2ECC71] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Steps */}
            {finalSteps && finalSteps.length > 0 && (
              <div className="space-y-3 mt-8">
                {finalSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      index === currentStep
                        ? "bg-white border-[#4A90E2] shadow-md"
                        : index < currentStep
                        ? "bg-[#2ECC71]/10 border-[#2ECC71]/30"
                        : "bg-white/50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        index === currentStep
                          ? "bg-gradient-to-br from-[#4A90E2] to-[#1E3A5F] text-white"
                          : index < currentStep
                          ? "bg-[#2ECC71] text-gray-900"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        index === currentStep
                          ? "text-gray-900"
                          : index < currentStep
                          ? "text-gray-700"
                          : "text-gray-500"
                      }`}
                    >
                      {step}
                    </span>
                    {index === currentStep && (
                      <Loader2 className="w-4 h-4 text-[#4A90E2] animate-spin ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Simple Spinner for default */}
            {!finalSteps && !progress && (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Обработка...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
