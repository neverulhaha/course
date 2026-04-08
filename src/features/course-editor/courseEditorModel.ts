import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type {
  LessonSummary,
  ModuleSummary,
  LessonContent,
  LessonStatus,
  QaSeverity,
} from "@/entities/course/types";

/** @deprecated Use LessonSummary from entities/course/types */
export type EditorLesson = LessonSummary;
/** @deprecated Use LessonStatus from entities/course/types */
export type LessonEditorStatus = LessonStatus;

export const mockCourse: {
  title: string;
  lastSaved: string;
  qaScore: number;
  version: string;
  modules: ModuleSummary[];
} = {
  title: "Основы Python для начинающих",
  lastSaved: "31 марта, 14:22",
  qaScore: 87,
  version: "v1.3",
  modules: [
    {
      id: "m1",
      title: "Введение в программирование и Python",
      progressPercent: 100,
      lessons: [
        { id: "l1", title: "Что такое программирование?", status: "ready", hasIssues: false, qaScore: 92 },
        { id: "l2", title: "Установка Python и первая программа", status: "ready", hasIssues: false, qaScore: 88 },
        { id: "l3", title: "Переменные и типы данных", status: "has-issues", hasIssues: true, qaScore: 75 },
      ],
    },
    {
      id: "m2",
      title: "Управляющие конструкции",
      progressPercent: 60,
      lessons: [
        { id: "l4", title: "Условные операторы", status: "generated", hasIssues: false, qaScore: 82 },
        { id: "l5", title: "Циклы (for и while)", status: "draft", hasIssues: false, qaScore: null },
      ],
    },
    {
      id: "m3",
      title: "Функции и модули",
      progressPercent: 0,
      lessons: [{ id: "l6", title: "Определение функций", status: "empty", hasIssues: false, qaScore: null }],
    },
  ],
};

const lessonContentById: Record<string, LessonContent> = {
  l1: {
    goal: "Познакомить студентов с основными концепциями программирования и дать понимание того, как работают компьютерные программы",
    blocks: [
      {
        id: "b1",
        type: "text",
        label: "Теория",
        content:
          "Программирование — это процесс создания программ, которые выполняют определенные задачи. Программы состоят из последовательности инструкций, написанных на языке программирования, понятном компьютеру.",
        aiGenerated: false,
        hasSource: true,
        qaIssue: null,
      },
      {
        id: "b2",
        type: "text",
        label: "Теория",
        content:
          "Python — один из самых популярных языков программирования благодаря своей простоте и мощности. Он используется в веб-разработке, анализе данных, машинном обучении и автоматизации.",
        aiGenerated: true,
        hasSource: true,
        qaIssue: {
          severity: "medium",
          message: "Переход от предыдущего блока недостаточно плавный",
          suggestion: "Добавьте связующее предложение между концепцией программирования и языком Python",
        },
      },
      {
        id: "b3",
        type: "example",
        label: "Пример",
        content: 'print("Hello, World!")',
        description: "Первая программа на Python — традиционный вывод приветствия",
        aiGenerated: true,
        hasSource: false,
        qaIssue: null,
      },
      {
        id: "b4",
        type: "practice",
        label: "Практика",
        content: "Напишите программу, которая выводит ваше имя и возраст",
        aiGenerated: true,
        hasSource: false,
        qaIssue: null,
      },
    ],
  },
  l3: {
    goal: "Освоить работу с переменными и основными типами данных в Python",
    blocks: [
      {
        id: "b1",
        type: "text",
        label: "Теория",
        content:
          "Переменные позволяют хранить данные в программе. В Python не нужно объявлять тип переменной — он определяется автоматически.",
        aiGenerated: true,
        hasSource: true,
        qaIssue: {
          severity: "high",
          message: "Информация не соответствует исходному материалу",
          suggestion:
            "В источнике указана версия Python 2.7, где поведение типов отличается. Проверьте актуальность источника.",
        },
      },
      {
        id: "b2",
        type: "text",
        label: "Теория",
        content: "Основные типы данных: int (целые числа), float (числа с плавающей точкой), str (строки), bool (логические значения).",
        aiGenerated: true,
        hasSource: true,
        qaIssue: {
          severity: "low",
          message: "Неполный список типов данных",
          suggestion: "Рекомендуется добавить list, tuple, dict для полноты картины",
        },
      },
    ],
  },
};

const emptyLesson: LessonContent = { goal: null, blocks: [] };

/** Демо: контент по id урока; иначе пустой урок или шаблон первого урока. */
export function resolveLessonCanvasContent(lesson: Pick<LessonSummary, "id" | "status">): LessonContent {
  const byId = lessonContentById[lesson.id];
  if (byId) return byId;
  if (lesson.status === "empty") return emptyLesson;
  return lessonContentById.l1;
}

export const StatusBadgeMap: Record<
  LessonStatus,
  { label: string; dot: string; text: string }
> = {
  ready: { label: "Готово", dot: "#86BC25", text: "text-gray-900" },
  "has-issues": { label: "Есть замечания", dot: "#F1C40F", text: "text-orange-700" },
  generated: { label: "Сгенерировано", dot: "#4A90E2", text: "text-[#4A90E2]" },
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
