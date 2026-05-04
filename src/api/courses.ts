import { apiRequest } from "./client";
import type { CourseId, CourseSummary } from "./types";
import type { CreateCourseDraftInput } from "@/entities/course/createCourseDraft";

export async function listCourses() {
  return apiRequest<CourseSummary[]>("/courses");
}

export async function getCourse(courseId: CourseId) {
  return apiRequest<CourseSummary>(`/courses/${courseId}`);
}

/** Тело HTTP совпадает по смыслу с каноническим `CreateCourseDraftInput` / полями RPC. */
export type CreateCourseHttpPayload = CreateCourseDraftInput;

export async function createCourse(payload: CreateCourseHttpPayload) {
  return apiRequest<{ id: CourseId }>("/courses", { method: "POST", body: payload });
}

export async function patchCourse(courseId: CourseId, patch: Partial<{ title: string }>) {
  return apiRequest<CourseSummary>(`/courses/${courseId}`, { method: "PATCH", body: patch });
}
