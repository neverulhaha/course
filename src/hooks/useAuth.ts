import { useAuthContext } from "@/providers/AuthProvider";

/**
 * Состояние пользователя из Supabase Auth (сессия восстанавливается при старте приложения).
 * Императивные методы входа/регистрации — в `@/services/auth.service`.
 */
export function useAuth() {
  return useAuthContext();
}
