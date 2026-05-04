import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type AuthProvider = "email" | "google" | "unknown";
type ErrorCode =
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "INVALID_INPUT"
  | "AUTH_EMAIL_USED_WITH_GOOGLE"
  | "AUTH_EMAIL_ALREADY_EXISTS"
  | "AUTH_SETUP_ERROR"
  | "DATABASE_ERROR";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function errorResponse(code: ErrorCode, message: string, details: Record<string, unknown> = {}) {
  return jsonResponse({ ok: false, error: { code, message, details } });
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
  const hasGoogle = identities.some((identity) => identity.provider === "google");
  if (hasGoogle) return "google";
  const hasEmail = identities.some((identity) => identity.provider === "email");
  if (hasEmail) return "email";
  return "unknown";
}

function existingAccountResponse(provider: AuthProvider) {
  if (provider === "google") {
    return errorResponse("AUTH_EMAIL_USED_WITH_GOOGLE", "Аккаунт с этой почтой уже создан через Google. Войдите через Google.");
  }
  return errorResponse("AUTH_EMAIL_ALREADY_EXISTS", "Аккаунт с этой почтой уже существует. Войдите в систему.");
}

async function findAuthUserByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return errorResponse("INVALID_INPUT", "Метод не поддерживается");

  let body: { email?: unknown; password?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch (_err) {
    return errorResponse("INVALID_INPUT", "Некорректный JSON body");
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!email || !emailRe.test(email)) return errorResponse("INVALID_EMAIL", "Введите корректную почту");
  if (!password || password.length < 6) return errorResponse("WEAK_PASSWORD", "Пароль должен быть не короче 6 символов");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse("AUTH_SETUP_ERROR", "Регистрация временно недоступна. Попробуйте позже.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, provider, updated_at")
    .eq("email", email)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (profileError) {
    console.warn("register-email profiles query failed", profileError.message);
    return errorResponse("DATABASE_ERROR", "Не удалось проверить существующий аккаунт");
  }

  const profile = profiles?.[0];
  if (profile) return existingAccountResponse(normalizeProvider(profile.provider));

  try {
    const existingUser = await findAuthUserByEmail(supabaseAdmin, email);
    if (existingUser) return existingAccountResponse(providerFromAuthUser(existingUser));
  } catch (err) {
    console.warn("register-email admin listUsers failed", err);
    return errorResponse("DATABASE_ERROR", "Не удалось проверить существующий аккаунт");
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { provider: "email" },
    user_metadata: {
      full_name: name || undefined,
      display_name: name || undefined,
      provider: "email",
    },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "Не удалось создать пользователя";
    const lower = message.toLowerCase();
    if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
      return errorResponse("AUTH_EMAIL_ALREADY_EXISTS", "Аккаунт с этой почтой уже существует. Войдите в систему.");
    }
    if (lower.includes("password")) return errorResponse("WEAK_PASSWORD", "Пароль слишком слабый или короткий");
    console.warn("register-email createUser failed", message);
    return errorResponse("DATABASE_ERROR", "Не удалось создать аккаунт");
  }

  const displayName = name || email.split("@")[0];
  const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: created.user.id,
      email,
      full_name: displayName,
      display_name: displayName,
      provider: "email",
      app_role: "student",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    console.warn("register-email profile upsert failed", upsertError.message);
    // Пользователь уже создан и подтвержден. Профиль будет досоздан клиентом после входа.
  }

  return jsonResponse({ ok: true, user_id: created.user.id, provider: "email" });
});
