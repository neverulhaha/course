import { apiRequest } from "./client";
import type { CourseId, CourseVersionDto } from "./types";

export async function listVersions(courseId: CourseId) {
  return apiRequest<CourseVersionDto[]>(`/courses/${courseId}/versions`);
}

export async function restoreVersion(courseId: CourseId, versionId: string) {
  return apiRequest<{ id: CourseId }>(`/courses/${courseId}/versions/${versionId}/restore`, {
    method: "POST",
  });
}
