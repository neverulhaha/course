import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = __SUPABASE_URL__.trim();
const anonKey = __SUPABASE_ANON_KEY__.trim();

if (!url || !anonKey) {
  throw new Error(
    "[supabase] Не заданы URL или публичный ключ. Укажите в окружении сборки (или в .env для Vite): " +
      "NEXT_PUBLIC_SUPABASE_URL или SUPABASE_URL; " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY или SUPABASE_PUBLISHABLE_KEY. " +
      "Секретные ключи (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY) в браузер не передаются."
  );
}

/**
 * Единственный браузерный клиент Supabase.
 * URL и ключ подставляются на этапе `vite build` / `vite` из переменных окружения (см. `vite.config.ts`).
 * `detectSessionInUrl` обрабатывает OAuth PKCE и ссылки из писем (подтверждение, сброс пароля).
 */
export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
