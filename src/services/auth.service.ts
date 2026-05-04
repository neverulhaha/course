import { supabase } from "@/lib/supabase/client";
import { fetchProfile, upsertProfileForUser, type AuthProvider } from "@/services/profile.service";

export type AuthErrorCode =
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "PASSWORDS_DO_NOT_MATCH"
  | "INVALID_CREDENTIALS"
  | "AUTH_EMAIL_USED_WITH_GOOGLE"
  | "AUTH_EMAIL_USED_WITH_PASSWORD"
  | "AUTH_EMAIL_ALREADY_EXISTS"
  | "GOOGLE_UNAVAILABLE"
  | "EMAIL_CONFIRMATION_ENABLED"
  | "AUTH_FAILED";

export class AuthFlowError extends Error {
  code: AuthErrorCode;
  details?: unknown;
  constructor(code: AuthErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
    this.details = details;
  }
}

export interface EmailPasswordPayload { email: string; password: string; name?: string }
export interface SignUpPayload extends EmailPasswordPayload { passwordConfirm?: string }
export interface EmailCheckResult { exists: boolean; provider: AuthProvider | null }

interface RegisterEmailFunctionResult {
  ok?: boolean;
  user_id?: string;
  provider?: AuthProvider;
  error?: { code?: string; message?: string; details?: unknown };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_APP_PATH = "/app";
export const OAUTH_SUCCESS_BANNER_KEY = "auth.oauth.success.message";

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

function assertValidEmail(email: string) {
  if (!EMAIL_RE.test(email)) throw new AuthFlowError("INVALID_EMAIL", "Введите корректную почту.");
}

function assertValidPassword(password: string) {
  if (!password || password.length < 6) throw new AuthFlowError("WEAK_PASSWORD", "Пароль должен быть не короче 6 символов.");
}

function normalizeProvider(provider: unknown): AuthProvider {
  if (provider === "google") return "google";
  if (provider === "email") return "email";
  return "unknown";
}

function providerFromSessionUser(user: { app_metadata?: Record<string, unknown>; identities?: Array<{ provider?: string }> }): AuthProvider {
  const appProvider = normalizeProvider(user.app_metadata?.provider);
  if (appProvider !== "unknown") return appProvider;
  const identities = Array.isArray(user.identities) ? user.identities : [];
  return normalizeProvider(identities.find((i) => i.provider === "google" || i.provider === "email")?.provider);
}

function isAlreadyRegisteredResponse(data: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"]) {
  const identities = data.user?.identities;
  return Boolean(data.user && Array.isArray(identities) && identities.length === 0 && !data.session);
}

function safeNextPath(nextPath?: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.startsWith("/auth")) return DEFAULT_APP_PATH;
  return nextPath;
}

function callbackUrl(nextPath?: string | null) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", safeNextPath(nextPath));
  return url.toString();
}

function mapSupabaseAuthError(message: string): AuthFlowError {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return new AuthFlowError("INVALID_CREDENTIALS", "Неверная почта или пароль.");
  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return new AuthFlowError(
      "EMAIL_CONFIRMATION_ENABLED",
      "Аккаунт создан, но Supabase не выдал сессию из-за подтверждения почты. Для MVP разверните Edge Function register-email или отключите Confirm email в Auth settings."
    );
  }
  if (lower.includes("user already registered") || lower.includes("already registered") || lower.includes("already exists")) {
    return new AuthFlowError("AUTH_EMAIL_ALREADY_EXISTS", "Аккаунт с этой почтой уже существует. Войдите в систему.");
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("short") || lower.includes("at least"))) {
    return new AuthFlowError("WEAK_PASSWORD", "Пароль должен быть не короче 6 символов.");
  }
  return new AuthFlowError("AUTH_FAILED", "Не удалось выполнить действие. Попробуйте ещё раз.", message);
}

function mapFunctionAuthError(error?: RegisterEmailFunctionResult["error"]): AuthFlowError {
  const code = error?.code;
  const message = error?.message;

  if (code === "INVALID_EMAIL") return new AuthFlowError("INVALID_EMAIL", message || "Введите корректную почту.", error?.details);
  if (code === "WEAK_PASSWORD") return new AuthFlowError("WEAK_PASSWORD", message || "Пароль должен быть не короче 6 символов.", error?.details);
  if (code === "AUTH_EMAIL_USED_WITH_GOOGLE") {
    return new AuthFlowError("AUTH_EMAIL_USED_WITH_GOOGLE", message || "Аккаунт с этой почтой уже создан через Google. Войдите через Google.", error?.details);
  }
  if (code === "AUTH_EMAIL_ALREADY_EXISTS") {
    return new AuthFlowError("AUTH_EMAIL_ALREADY_EXISTS", message || "Аккаунт с этой почтой уже существует. Войдите в систему.", error?.details);
  }

  return new AuthFlowError("AUTH_FAILED", message || "Не удалось зарегистрировать аккаунт. Попробуйте ещё раз.", error?.details);
}

async function registerEmailWithoutConfirmation(payload: { email: string; password: string; name?: string }) {
  const { data, error } = await supabase.functions.invoke<RegisterEmailFunctionResult>("register-email", {
    body: {
      email: payload.email,
      password: payload.password,
      name: payload.name?.trim() || null,
    },
  });

  if (error) {
    throw new AuthFlowError(
      "AUTH_FAILED",
      "Не удалось вызвать сервер регистрации. Разверните Supabase Edge Function register-email и задайте для неё SUPABASE_SERVICE_ROLE_KEY.",
      error.message
    );
  }

  if (!data?.ok) throw mapFunctionAuthError(data?.error);
  return data;
}

async function signInAfterRegistration(email: string, password: string, name?: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw mapSupabaseAuthError(error.message);
  if (data.user) await upsertProfileForUser(data.user, { display_name: name?.trim() || null, provider: "email" });
  return data;
}

export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("Auth session read failed", error.message);
    return null;
  }
  return data.session?.access_token ?? null;
}

export async function checkAuthEmail(email: string): Promise<EmailCheckResult> {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  const { data, error } = await supabase.functions.invoke("check-auth-email", { body: { email: normalizedEmail } });
  if (error) {
    console.warn("check-auth-email failed", error.message);
    return { exists: false, provider: null };
  }
  return { exists: Boolean(data?.exists), provider: data?.provider ?? null };
}

export async function signUpWithEmail({ email, password, passwordConfirm, name }: SignUpPayload) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  assertValidPassword(password);
  if (typeof passwordConfirm === "string" && password !== passwordConfirm) throw new AuthFlowError("PASSWORDS_DO_NOT_MATCH", "Пароли не совпадают.");

  const emailCheck = await checkAuthEmail(normalizedEmail);
  if (emailCheck.exists && emailCheck.provider === "google") throw new AuthFlowError("AUTH_EMAIL_USED_WITH_GOOGLE", "Аккаунт с этой почтой уже создан через Google. Войдите через Google.");
  if (emailCheck.exists && emailCheck.provider === "email") throw new AuthFlowError("AUTH_EMAIL_ALREADY_EXISTS", "Аккаунт с этой почтой уже существует. Войдите в систему.");

  try {
    await registerEmailWithoutConfirmation({ email: normalizedEmail, password, name });
    return await signInAfterRegistration(normalizedEmail, password, name);
  } catch (err) {
    // Если новая Edge Function ещё не развернута, оставляем fallback на стандартный Supabase signUp.
    // При включенном Confirm email fallback не сможет выдать сессию — тогда покажем понятную причину.
    if (err instanceof AuthFlowError && err.code !== "AUTH_FAILED") throw err;
    console.warn("register-email fallback to supabase.auth.signUp", err instanceof Error ? err.message : err);
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: { data: { full_name: name?.trim() || undefined, display_name: name?.trim() || undefined, provider: "email" } },
  });
  if (error) throw mapSupabaseAuthError(error.message);
  if (isAlreadyRegisteredResponse(data)) throw new AuthFlowError("AUTH_EMAIL_ALREADY_EXISTS", "Аккаунт с этой почтой уже существует. Войдите в систему.");
  if (data.user) await upsertProfileForUser(data.user, { display_name: name?.trim() || null, provider: "email" });
  if (data.user && !data.session) return signInAfterRegistration(normalizedEmail, password, name);
  return data;
}

export async function signInWithEmail({ email, password }: EmailPasswordPayload) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  if (!password) throw new AuthFlowError("INVALID_CREDENTIALS", "Введите пароль.");

  const emailCheck = await checkAuthEmail(normalizedEmail);
  if (emailCheck.exists && emailCheck.provider === "google") throw new AuthFlowError("AUTH_EMAIL_USED_WITH_GOOGLE", "Этот аккаунт создан через Google. Войдите через Google.");

  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) throw mapSupabaseAuthError(error.message);
  if (data.user) await upsertProfileForUser(data.user, { provider: "email" });
  return data;
}

export async function signInWithGoogle(nextPath = DEFAULT_APP_PATH) {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl(nextPath) } });
  if (error) throw new AuthFlowError("GOOGLE_UNAVAILABLE", "Вход через Google сейчас недоступен.", error.message);
  return data;
}

export async function handleAuthCallback() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AuthFlowError("AUTH_FAILED", "Не удалось завершить вход. Попробуйте ещё раз.", error.message);
  const user = data.session?.user;
  if (!user) throw new AuthFlowError("AUTH_FAILED", "Сессия не найдена. Попробуйте войти ещё раз.");

  const provider = providerFromSessionUser(user);
  const existingOwnProfile = await fetchProfile(user.id);
  if (provider === "google" && !existingOwnProfile && user.email) {
    const emailCheck = await checkAuthEmail(user.email);
    if (emailCheck.exists && emailCheck.provider === "email") {
      await supabase.auth.signOut();
      throw new AuthFlowError("AUTH_EMAIL_USED_WITH_PASSWORD", "Аккаунт с этой почтой уже создан через email и пароль. Войдите через почту.");
    }
  }
  const profileProvider = existingOwnProfile?.provider === "email" && provider === "google" ? "email" : provider;
  await upsertProfileForUser(user, { provider: profileProvider });
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthFlowError("AUTH_FAILED", "Не удалось выйти из аккаунта. Попробуйте ещё раз.", error.message);
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof AuthFlowError) return error.message;
  if (error instanceof Error) return mapSupabaseAuthError(error.message).message;
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}
export function getAuthErrorCode(error: unknown): AuthErrorCode | null { return error instanceof AuthFlowError ? error.code : null; }
export const authErrorMessage = getAuthErrorMessage;
