import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/** Коды GoTrue / Supabase Auth → понятные сообщения на русском. */
const AUTH_ERROR_CODE_RU: Record<string, string> = {
  invalid_credentials: "Неверный email или пароль.",
  email_not_confirmed:
    "Подтвердите адрес email — перейдите по ссылке из письма, затем войдите с паролём.",
  user_already_exists: "Пользователь с таким email уже зарегистрирован.",
  email_exists: "Пользователь с таким email уже зарегистрирован.",
  signup_disabled: "Регистрация временно отключена.",
  weak_password: "Пароль слишком слабый. Следуйте требованиям к сложности пароля.",
  over_email_send_rate_limit:
    "Слишком много писем на этот адрес. Подождите несколько минут и попробуйте снова.",
  over_request_rate_limit: "Слишком много запросов. Подождите немного и попробуйте снова.",
  same_password: "Новый пароль должен отличаться от текущего.",
  email_address_invalid: "Некорректный адрес email.",
  session_expired: "Сессия истекла. Войдите снова.",
  session_not_found: "Сессия не найдена. Войдите снова.",
  refresh_token_not_found: "Сессия устарела. Войдите снова.",
  refresh_token_already_used: "Сессия устарела. Войдите снова.",
  user_banned: "Доступ к аккаунту ограничен. Обратитесь в поддержку.",
  user_not_found: "Пользователь с таким email не найден.",
  validation_failed: "Проверьте введённые данные.",
  unexpected_failure: "Сервис временно недоступен. Попробуйте позже.",
  captcha_failed:
    "Проверка безопасности не пройдена. Обновите страницу и попробуйте снова.",
  email_provider_disabled: "Вход по email отключён в настройках проекта.",
  provider_disabled: "Этот способ входа отключён.",
  identity_already_exists: "Этот аккаунт уже привязан к другому способу входа.",
  email_address_not_authorized: "Регистрация с этим email не разрешена.",
  otp_expired: "Срок действия кода истёк. Запросите новый.",
  flow_state_expired: "Ссылка устарела. Запросите восстановление пароля снова.",
  bad_jwt: "Сессия недействительна. Войдите снова.",
};

/** Типичные английские тексты API (в т.ч. старые ответы без поля code). */
const AUTH_MESSAGE_RU: Record<string, string> = {
  "invalid login credentials": "Неверный email или пароль.",
  "email not confirmed":
    "Подтвердите адрес email — перейдите по ссылке из письма, затем войдите с паролём.",
  "user already registered": "Пользователь с таким email уже зарегистрирован.",
  "a user with this email address has already been registered":
    "Пользователь с таким email уже зарегистрирован.",
  "signup is disabled": "Регистрация временно отключена.",
  "invalid email or password": "Неверный email или пароль.",
  "new password should be different from the old password":
    "Новый пароль должен отличаться от текущего.",
  "unable to validate email address: invalid format": "Некорректный адрес email.",
  "email rate limit exceeded":
    "Слишком много писем на этот адрес. Подождите несколько минут и попробуйте снова.",
};

function normalizeMessageKey(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .toLowerCase();
}

function translateKnownEnglishMessage(message: string): string | null {
  const key = normalizeMessageKey(message);
  if (AUTH_MESSAGE_RU[key]) return AUTH_MESSAGE_RU[key];

  const lower = message.toLowerCase();
  if (lower.includes("for security purposes") && lower.includes("only request")) {
    const sec = message.match(/(\d+)\s*seconds?/i);
    if (sec) {
      return `В целях безопасности повторная отправка возможна через ${sec[1]} с.`;
    }
    return "В целях безопасности повторная отправка пока недоступна. Подождите и попробуйте снова.";
  }
  if (lower.includes("password should be at least")) {
    return "Пароль не соответствует минимальным требованиям сервера.";
  }
  if (
    lower.includes("jwt expired") ||
    lower.includes("token has expired") ||
    lower.includes("refresh token not found")
  ) {
    return "Сессия истекла. Войдите снова.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Нет соединения с сетью. Проверьте интернет и попробуйте снова.";
  }
  return null;
}

function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

export function authErrorMessage(error: unknown): string {
  let message = "";
  let code: string | undefined;

  if (error && typeof error === "object" && "message" in error) {
    const m = (error as AuthError).message;
    if (typeof m === "string") message = m;
    const c = (error as { code?: unknown }).code;
    if (typeof c === "string" && c.length > 0) code = c;
  } else if (error instanceof Error) {
    message = error.message;
  }

  if (!message) {
    return "Что-то пошло не так. Попробуйте ещё раз.";
  }

  if (code) {
    const byCode = AUTH_ERROR_CODE_RU[code];
    if (byCode) return byCode;
  }

  if (hasCyrillic(message)) {
    return message;
  }

  const byMsg = translateKnownEnglishMessage(message);
  if (byMsg) return byMsg;

  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

function appOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Сессия не получена");
  return data.session;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string
): Promise<{ session: Session | null; user: User | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${appOrigin()}/auth/callback`,
    },
  });
  if (error) throw error;
  return { session: data.session, user: data.user };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${appOrigin()}/auth/update-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}
