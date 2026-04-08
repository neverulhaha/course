import { CheckCircle2, AlertCircle, Clock, Sparkles, FileText } from "lucide-react";

export type StatusType = "ready" | "generated" | "needs-review" | "has-issues" | "draft" | "empty";

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
}

export const STATUS_CONFIG = {
  ready: {
    label: "Готово",
    icon: CheckCircle2,
    colors: "bg-[#2ECC71]/20 text-gray-900 border-[#2ECC71]/40",
    iconColor: "text-[#4A90E2]",
  },
  generated: {
    label: "Сгенерировано",
    icon: Sparkles,
    colors: "bg-[#4A90E2]/15 text-[#4A90E2] border-[#4A90E2]/30",
    iconColor: "text-[#4A90E2]",
  },
  "needs-review": {
    label: "Требует проверки",
    icon: AlertCircle,
    colors: "bg-yellow-50 text-yellow-700 border-yellow-200",
    iconColor: "text-yellow-600",
  },
  "has-issues": {
    label: "Есть замечания",
    icon: AlertCircle,
    colors: "bg-orange-50 text-orange-700 border-orange-200",
    iconColor: "text-orange-600",
  },
  draft: {
    label: "Черновик",
    icon: FileText,
    colors: "bg-gray-100 text-gray-700 border-gray-300",
    iconColor: "text-gray-600",
  },
  empty: {
    label: "Не заполнено",
    icon: Clock,
    colors: "bg-gray-50 text-gray-600 border-gray-200",
    iconColor: "text-gray-400",
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

export function getStatusFromString(status: string): StatusType {
  const map: Record<string, StatusType> = {
    "ready": "ready",
    "generated": "generated",
    "needs-review": "needs-review",
    "has-issues": "has-issues",
    "draft": "draft",
    "empty": "empty",
    // Legacy mappings
    "Готов": "ready",
    "Сгенерировано": "generated",
    "Черновик": "draft",
  };
  return map[status] || "draft";
}
