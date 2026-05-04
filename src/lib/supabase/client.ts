import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = __SUPABASE_URL__.trim();
const anonKey = __SUPABASE_ANON_KEY__.trim();

if (!url || !anonKey) {
  throw new Error("Не удалось подключиться к сервису. Попробуйте позже.");
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
