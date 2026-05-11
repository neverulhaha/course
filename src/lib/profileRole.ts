export const PROFILE_ROLE_KEY = "app_role" as const;

export const PROFILE_ROLES = [
  { value: "student", label: "Студент" },
  { value: "teacher", label: "Преподаватель" },
  { value: "author", label: "Автор курсов" },
] as const;

export type ProfileRoleValue = (typeof PROFILE_ROLES)[number]["value"];

export function normalizeProfileRole(raw: unknown): ProfileRoleValue {
  if (typeof raw === "string" && PROFILE_ROLES.some((r) => r.value === raw)) {
    return raw as ProfileRoleValue;
  }
  return "student";
}

export function profileRoleLabel(value: ProfileRoleValue): string {
  return PROFILE_ROLES.find((r) => r.value === value)?.label ?? "Студент";
}

export function canCreateCourses(role: ProfileRoleValue | string | null | undefined): boolean {
  if (role === "admin") return true;
  const normalized = normalizeProfileRole(role);
  return normalized === "teacher" || normalized === "author";
}

export function canManageCourseSections(role: ProfileRoleValue | string | null | undefined): boolean {
  return canCreateCourses(role);
}

export function isStudentRole(role: ProfileRoleValue | string | null | undefined): boolean {
  return normalizeProfileRole(role) === "student";
}

export function isTeacherRole(role: ProfileRoleValue | string | null | undefined): boolean {
  return normalizeProfileRole(role) === "teacher";
}

export function shouldHideLearningNavigation(
  role: ProfileRoleValue | string | null | undefined,
  hideLearningNavigation: boolean | null | undefined,
): boolean {
  return isTeacherRole(role) && Boolean(hideLearningNavigation);
}
