/**
 * Раньше: локальные ключи кастомного JWT API (удалён). Сессия теперь только Supabase Auth (см. `@/lib/supabase/client`).
 */

const LEGACY_LOCALSTORAGE_KEYS = ["auth_token", "refresh_token"] as const;

/** Удалить устаревшие токены кастомного API из localStorage (однократная миграция в браузере). */
export function clearLegacyCustomApiSession(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_LOCALSTORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/** @deprecated Только для совместимости импортов; не используется. */
export const AUTH_ACCESS_KEY = "auth_token";
/** @deprecated Только для совместимости импортов; не используется. */
export const AUTH_REFRESH_KEY = "refresh_token";
