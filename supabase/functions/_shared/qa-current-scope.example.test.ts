import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildQaContext, buildRuleBasedQa } from "./qa-version-flow.ts";

function makeSnapshot() {
  const course = { id: "course-1", title: "Тестовый курс", level: "beginner", status: "partial" };
  const modules = [{ id: "module-1", course_id: "course-1", title: "Модуль", position: 1 }];
  const lessons = Array.from({ length: 10 }, (_, index) => ({
    id: `lesson-${index + 1}`,
    module_id: "module-1",
    title: `Урок ${index + 1}`,
    position: index + 1,
    objective: `Цель урока ${index + 1}`,
    summary: `Описание урока ${index + 1}`,
    learning_outcome: `Результат урока ${index + 1}`,
  }));
  const lesson_contents = lessons.slice(0, 4).map((lesson) => ({
    id: `content-${lesson.id}`,
    lesson_id: lesson.id,
    theory_text: "Теория урока",
    examples_text: "Примеры урока",
    practice_text: "Практическое задание",
    checklist_text: "Чек-лист",
  }));
  return { course, modules, lessons, lesson_contents, sources: [], quizzes: [], questions: [], answer_options: [], qa_reports: [] };
}

Deno.test("QA current checks only available lesson_contents and does not penalize missing lessons", () => {
  const snapshot = makeSnapshot();
  const context = buildQaContext(snapshot, "current");
  const qa = buildRuleBasedQa(snapshot, "current");

  assertEquals(context.mode, "current");
  assertEquals(context.total_lessons_count, 10);
  assertEquals(context.evaluated_lessons_count, 4);
  assertEquals(context.missing_content_lessons_count, 6);
  assertEquals(context.source_alignment_enabled, false);

  assertEquals(qa.source_alignment_score, null);
  assertEquals(qa.source_alignment.enabled, false);
  assert(qa.total_score >= 0 && qa.total_score <= 100);
  assert(qa.recommendations.includes("Сгенерировать недостающие 6 уроков"));
  assert(!qa.issues.some((issue: any) => JSON.stringify(issue).includes("lesson_contents")));
});
