/**
 * Совместимость и единая точка входа для слоя курса (п. 8 плана).
 * Канонические реализации разнесены по модулям; импортируйте их напрямую в новом коде:
 *
 * - `courseCreation.service` — RPC create_course_draft
 * - `courseQuery.service` — дашборд, метрики, недавние
 * - `courseEditor.service` — редактор, план, заголовок урока, sync статуса
 * - `courseQa.service` — QA-отчёты
 * - `courseVersion.service` — версии и снимки
 * - `coursePlayback.service` — плеер, прогресс, квизы
 *
 * Доменные read-модели и типы списков: `entities/course/readModels`.
 * Формат дат UI: `lib/dateFormat`. Парсинг контента урока: `entities/course/lessonContentJson`.
 */
export * from "./courseCreation.service";
export * from "./courseQuery.service";
export * from "./courseEditor.service";
export * from "./courseQa.service";
export * from "./courseVersion.service";
export * from "./coursePlayback.service";

export { formatRuDate, formatRuDateTime } from "@/lib/dateFormat";
export { parseLessonContentJson, emptyLessonContent } from "@/entities/course/lessonContentJson";
