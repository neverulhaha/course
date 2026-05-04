import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type AuthProvider = "email" | "google" | "unknown";
type ErrorCode = "INVALID_EMAIL" | "INVALID_INPUT" | "DATABASE_ERROR";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function errorResponse(code: ErrorCode, message: string, status = 400, details: Record<string, unknown> = {}) {
  return jsonResponse({ error: { code, message, details } }, status);
}

function normalizeProvider(raw: unknown): AuthProvider {
  if (raw === "google") return "google";
  if (raw === "email") return "email";
  return "unknown";
}

function providerFromAuthUser(user: { app_metadata?: Record<string, unknown>; identities?: Array<{ provider?: string }> }): AuthProvider {
  const appProvider = normalizeProvider(user.app_metadata?.provider);
  if (appProvider !== "unknown") return appProvider;
  const identities = Array.isArray(user.identities) ? user.identities : [];
  return normalizeProvider(identities.find((i) => i.provider === "google" || i.provider === "email")?.provider);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return errorResponse("INVALID_INPUT", "Метод не поддерживается", 405);

  let body: { email?: unknown };
  try { body = await request.json(); } catch (_err) { return errorResponse("INVALID_INPUT", "Некорректный JSON body", 400); }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !emailRe.test(email)) return errorResponse("INVALID_EMAIL", "Введите корректную почту", 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return errorResponse("DATABASE_ERROR", "Сервер авторизации не настроен", 500);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("provider, updated_at")
    .eq("email", email)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (profileError) {
    console.warn("check-auth-email profiles query failed", profileError.message);
    return errorResponse("DATABASE_ERROR", "Не удалось проверить почту", 500);
  }

  const profile = profiles?.[0];
  if (profile) return jsonResponse({ exists: true, provider: normalizeProvider(profile.provider) });

  // Fallback for early MVP data where a Supabase Auth user exists but public.profiles was not created yet.
  // TODO: add project-level rate limiting before using this as a high-traffic endpoint.
  try {
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (!authUsersError) {
      const authUser = authUsersData.users.find((user) => user.email?.trim().toLowerCase() === email);
      if (authUser) return jsonResponse({ exists: true, provider: providerFromAuthUser(authUser) });
    } else {
      console.warn("check-auth-email admin listUsers failed", authUsersError.message);
    }
  } catch (err) {
    console.warn("check-auth-email admin fallback failed", err);
  }

  return jsonResponse({ exists: false, provider: null });
});
