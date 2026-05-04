import { apiRequest } from "./client";
import type { CourseId, QaReportDto } from "./types";

export async function runQa(courseId: CourseId) {
  return apiRequest<{ jobId: string }>(`/courses/${courseId}/qa/run`, { method: "POST" });
}

export async function getQaReport(courseId: CourseId) {
  return apiRequest<QaReportDto>(`/courses/${courseId}/qa/report`);
}
