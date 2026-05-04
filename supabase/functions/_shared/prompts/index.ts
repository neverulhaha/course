export type PromptContext = Record<string, unknown>;

function value(ctx: PromptContext, key: string): string {
  const raw = ctx[key];
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  return JSON.stringify(raw, null, 2);
}

export function renderTemplate(template: string, ctx: PromptContext): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => value(ctx, key));
}

export { COURSE_PLAN_PROMPT } from "./course-plan.prompt.ts";
export { LESSON_CONTENT_PROMPT } from "./lesson-content.prompt.ts";
export { LESSON_BLOCK_REGENERATION_PROMPT } from "./lesson-block-regeneration.prompt.ts";
export { LESSON_QUIZ_PROMPT } from "./lesson-quiz.prompt.ts";
export { COURSE_QUIZ_PROMPT } from "./course-quiz.prompt.ts";
export { COURSE_QA_PROMPT } from "./course-qa.prompt.ts";
export { SOURCE_ALIGNMENT_PROMPT } from "./source-alignment.prompt.ts";
export { SOURCE_NORMALIZATION_PROMPT } from "./source-normalization.prompt.ts";
export { VERSION_SUMMARY_PROMPT } from "./version-summary.prompt.ts";
