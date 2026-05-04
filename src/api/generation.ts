import { apiRequest } from "./client";
import type { CourseId, GenerationJob } from "./types";

export async function startPlanGeneration(courseId: CourseId, params: Record<string, unknown>) {
  return apiRequest<GenerationJob>(`/courses/${courseId}/generation/plan`, {
    method: "POST",
    body: params,
  });
}

export async function startLessonGeneration(courseId: CourseId, lessonId: string) {
  return apiRequest<GenerationJob>(`/courses/${courseId}/lessons/${lessonId}/generate`, {
    method: "POST",
  });
}

export async function getJob(jobId: string) {
  return apiRequest<GenerationJob>(`/generation/jobs/${jobId}`);
}
