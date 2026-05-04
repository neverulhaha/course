import type { User } from "@supabase/supabase-js";
import type { ProfileRow } from "@/types/database";

/**
 * Отображаемое имя: приоритет public.profiles.full_name, затем user_metadata, затем email.
 */
export function displayName(user: User, profile?: ProfileRow | null): string {
  if (profile?.full_name?.trim()) return profile.full_name.trim();
  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (fullName) return fullName;
  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  if (name) return name;
  return user.email?.split("@")[0] ?? "Пользователь";
}

/** Инициалы для аватара. */
export function userInitials(user: User, profile?: ProfileRow | null): string {
  const fromProfile = profile?.full_name?.trim();
  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const metaName = typeof meta.name === "string" ? meta.name.trim() : "";
  const seed = fromProfile || fullName || metaName;
  if (seed) {
    const parts = seed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return seed.slice(0, 2).toUpperCase();
  }
  const email = user.email ?? "";
  return email.slice(0, 2).toUpperCase() || "??";
}

/** Дата регистрации для подписи «С …». */
export function formatJoinedDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}
