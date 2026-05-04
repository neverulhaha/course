import type { LessonContent, LessonStatus, LessonSummary } from "./types";

function lessonAuthoringStatus(hasBlocks: boolean, rawStatus?: string | null): LessonStatus {
  if (rawStatus === "edited") return "edited";
  if (rawStatus === "generated") return "generated";
  if (!hasBlocks) return "empty";
  return "generated";
}

export function mapLessonToSummary(
  lessonId: string,
  title: string | null,
  content: LessonContent,
  meta: {
    moduleId?: string;
    position?: number | null;
    objective?: string | null;
    summary?: string | null;
    estimatedDuration?: number | null;
    learningOutcome?: string | null;
    contentStatus?: string | null;
  } = {},
): LessonSummary {
  const hasBlocks = content.blocks.length > 0;
  const status = lessonAuthoringStatus(hasBlocks, meta.contentStatus);
  const hasIssues = content.blocks.some((b) => b.qaIssue != null);
  return {
    id: lessonId,
    title: title ?? "Без названия",
    status,
    hasIssues,
    qaScore: null,
    moduleId: meta.moduleId,
    position: meta.position ?? null,
    objective: meta.objective ?? null,
    summary: meta.summary ?? null,
    estimatedDuration: meta.estimatedDuration ?? null,
    learningOutcome: meta.learningOutcome ?? null,
  };
}
