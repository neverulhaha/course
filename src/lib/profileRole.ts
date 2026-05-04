/** Поле в public.profiles (канонично). Не путать с legacy public.users. */
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
