import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.warn(
    "[supabase] Задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env — авторизация не будет работать."
  );
}

/**
 * Единственный браузерный клиент Supabase.
 * `detectSessionInUrl` обрабатывает OAuth PKCE и ссылки из писем (подтверждение, сброс пароля).
 */
export const supabase: SupabaseClient = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
