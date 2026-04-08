import { apiRequest } from "./client";
import type { CourseId, CourseSummary } from "./types";

export async function listCourses() {
  return apiRequest<CourseSummary[]>("/courses");
}

export async function getCourse(courseId: CourseId) {
  return apiRequest<CourseSummary>(`/courses/${courseId}`);
}

export async function createCourse(payload: {
  topic: string;
  level: string;
  goal?: string;
  duration?: string;
  language?: string;
  tone?: string;
  depth?: string;
}) {
  return apiRequest<{ id: CourseId }>("/courses", { method: "POST", body: payload });
}

export async function patchCourse(courseId: CourseId, patch: Partial<{ title: string }>) {
  return apiRequest<CourseSummary>(`/courses/${courseId}`, { method: "PATCH", body: patch });
}
