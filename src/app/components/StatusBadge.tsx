import { CheckCircle2, FileText, Layers, Loader, Archive } from "lucide-react";
import { normalizeCourseStatus, type CourseStatus } from "@/entities/course/courseStatus";

interface StatusBadgeProps {
  status: CourseStatus;
  size?: "sm" | "md" | "lg";
}

const STATUS_CONFIG: Record<
  CourseStatus,
  {
    label: string;
    icon: typeof FileText;
    colors: string;
    iconColor: string;
  }
> = {
  draft: {
    label: "Новый",
    icon: FileText,
    colors: "bg-gray-100 text-gray-700 border-gray-300",
    iconColor: "text-gray-600",
  },
  generating_plan: {
    label: "Создаём план",
    icon: Loader,
    colors: "bg-[#4A90E2]/15 text-[#4A90E2] border-[#4A90E2]/30",
    iconColor: "text-[#4A90E2]",
  },
  generating_lessons: {
    label: "Готовим уроки",
    icon: Loader,
    colors: "bg-[#4A90E2]/15 text-[#4A90E2] border-[#4A90E2]/30",
    iconColor: "text-[#4A90E2]",
  },
  generating_quizzes: {
    label: "Создаём тест",
    icon: Loader,
    colors: "bg-[#4A90E2]/15 text-[#4A90E2] border-[#4A90E2]/30",
    iconColor: "text-[#4A90E2]",
  },
  qa_checking: {
    label: "Проверяем качество",
    icon: Loader,
    colors: "bg-[#4A90E2]/15 text-[#4A90E2] border-[#4A90E2]/30",
    iconColor: "text-[#4A90E2]",
  },
  plan: {
    label: "План готов",
    icon: Layers,
    colors: "bg-[#4A90E2]/15 text-[#4A90E2] border-[#4A90E2]/30",
    iconColor: "text-[#4A90E2]",
  },
  partial: {
    label: "Создан частично",
    icon: Loader,
    colors: "bg-amber-50 text-amber-800 border-amber-200",
    iconColor: "text-amber-600",
  },
  ready: {
    label: "Курс готов",
    icon: CheckCircle2,
    colors: "bg-[#2ECC71]/20 text-gray-900 border-[#2ECC71]/40",
    iconColor: "text-[#4A90E2]",
  },
  failed: {
    label: "Ошибка создания",
    icon: Loader,
    colors: "bg-red-50 text-red-800 border-red-200",
    iconColor: "text-red-600",
  },
  archived: {
    label: "Архив",
    icon: Archive,
    colors: "bg-gray-50 text-gray-600 border-gray-200",
    iconColor: "text-gray-500",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} ${config.colors} border rounded-lg font-bold transition-all`}
    >
      <Icon className={`${iconSizes[size]} ${config.iconColor}`} />
      {config.label}
    </span>
  );
}

/** Строка из БД или легаси-текст → канонический статус курса. */
export function getStatusFromString(status: string): CourseStatus {
  return normalizeCourseStatus(status);
}

/** @deprecated Используйте `CourseStatus` и `StatusBadge`; для уроков — `StatusBadgeMap` в редакторе. */
export type StatusType = CourseStatus;
