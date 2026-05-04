import { useAuthContext } from "@/providers/AuthProvider";

/**
 * Состояние пользователя из Supabase Auth (сессия восстанавливается при старте приложения).
 * Вход через Google — в `@/services/auth.service`; после OAuth сессия подхватывается здесь через `onAuthStateChange`.
 */
export function useAuth() {
  return useAuthContext();
}
