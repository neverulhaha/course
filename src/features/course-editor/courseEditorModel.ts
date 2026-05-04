import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { LessonSummary, LessonStatus, QaSeverity } from "@/entities/course/types";

/** @deprecated Use LessonSummary from entities/course/types */
export type EditorLesson = LessonSummary;
/** @deprecated Use LessonStatus from entities/course/types */
export type LessonEditorStatus = LessonStatus;

export { parseLessonContentJson, emptyLessonContent } from "@/entities/course/lessonContentJson";

export const StatusBadgeMap: Record<
  LessonStatus,
  { label: string; dot: string; text: string }
> = {
  ready: { label: "Готово", dot: "#86BC25", text: "text-gray-900" },
  "has-issues": { label: "Есть замечания", dot: "#F1C40F", text: "text-orange-700" },
  generated: { label: "Сгенерировано", dot: "#4A90E2", text: "text-[#4A90E2]" },
  edited: { label: "Отредактировано", dot: "#8B5CF6", text: "text-violet-700" },
  draft: { label: "Черновик", dot: "#9CA3AF", text: "text-gray-600" },
  empty: { label: "Не заполнен", dot: "#D1D5DB", text: "text-gray-500" },
};

export function getSeverityConfig(severity: QaSeverity | string): {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
} {
  if (severity === "high")
    return { icon: AlertTriangle, color: "#E74C3C", bg: "rgba(239, 68, 68, 0.015)", label: "Высокий риск" };
  if (severity === "medium")
    return { icon: AlertCircle, color: "#F1C40F", bg: "rgba(245, 158, 11, 0.015)", label: "Средний риск" };
  return { icon: Info, color: "#4A90E2", bg: "rgba(74, 144, 226, 0.015)", label: "Низкий риск" };
}
