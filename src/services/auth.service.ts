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
  if (lower === "access_denied" || lower.includes("access_denied")) {
    return "Вход отменён.";
  }
  if (lower.includes("unsupported provider") || lower.includes("provider is not enabled")) {
    return (
      "Вход через Google не включён в проекте Supabase. " +
      "Dashboard → Authentication → Providers → Google: включите провайдер и укажите Client ID и Client Secret из Google Cloud Console."
    );
  }
  return null;
}

function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

export function authErrorMessage(error: unknown): string {
  let message = "";
  let code: string | undefined;

  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.message === "string") message = o.message;
    else if (typeof o.msg === "string") message = o.msg;
    const c = o.code ?? o.error_code;
    if (typeof c === "string" && c.length > 0) code = c;
  } else if (error instanceof Error) {
    message = error.message;
  }

  if (!message) {
    return "Что-то пошло не так. Попробуйте ещё раз.";
  }

  const lowerMsg = message.toLowerCase();
  if (
    code === "validation_failed" &&
    (lowerMsg.includes("unsupported provider") || lowerMsg.includes("provider is not enabled"))
  ) {
    return (
      "Вход через Google не включён в проекте Supabase. " +
      "Dashboard → Authentication → Providers → Google: включите провайдер и укажите Client ID и Client Secret из Google Cloud Console."
    );
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

/** Путь возврата после OAuth (относительный, только свой origin). */
const OAUTH_RETURN_PATH_KEY = "sb:oauth_return_path";
/** Маркер: успешный вход именно через Google (не путать с подтверждением email по ссылке). */
export const OAUTH_GOOGLE_FLOW_KEY = "sb:oauth_google_flow";
/** Одноразовое сообщение для зелёного баннера в приложении после Google OAuth. */
export const OAUTH_SUCCESS_BANNER_KEY = "sb:oauth_success_banner";
export const OAUTH_SUCCESS_BANNER_TEXT =
  "Вы успешно вошли через Google. Добро пожаловать!";

function normalizeInternalReturnPath(path: string | null): string {
  if (!path || typeof path !== "string") return "/app";
  const t = path.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/app";
  if (/^\/\w+:/.test(t)) return "/app";
  return t;
}

export function setOAuthReturnPath(path: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, normalizeInternalReturnPath(path));
}

/** Считать и удалить сохранённый путь (вызывать на `/auth/callback`). */
export function consumeOAuthReturnPath(): string {
  if (typeof sessionStorage === "undefined") return "/app";
  const raw = sessionStorage.getItem(OAUTH_RETURN_PATH_KEY);
  sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY);
  return normalizeInternalReturnPath(raw);
}

export function clearOAuthFlowMarkers(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY);
  sessionStorage.removeItem(OAUTH_GOOGLE_FLOW_KEY);
}

/** Ошибки в query/hash после редиректа провайдера (отмена, ошибка сервера). */
export function oauthRedirectErrorMessage(code: string, description?: string): string {
  const c = code.trim().toLowerCase();
  if (c === "access_denied") {
    return "Вы отменили вход через Google.";
  }
  if (description && hasCyrillic(description)) {
    return description;
  }
  if (description && description.length > 0) {
    const d = description.replace(/\+/g, " ");
    if (/access denied/i.test(d)) return "Вы отменили вход через Google.";
    return d;
  }
  return "Не удалось войти через Google. Попробуйте ещё раз.";
}

/**
 * Редирект на Google; после успеха Supabase вернёт на `redirectTo` (`/auth/callback`).
 * Существующий пользователь с тем же email подтягивается автоматически (идентичности в одном user).
 */
export async function signInWithGoogle(nextPath: string): Promise<void> {
  if (typeof window === "undefined") return;
  setOAuthReturnPath(nextPath);
  sessionStorage.setItem(OAUTH_GOOGLE_FLOW_KEY, "1");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appOrigin()}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    clearOAuthFlowMarkers();
    throw error;
  }

  if (data.url) {
    window.location.assign(data.url);
    return;
  }

  clearOAuthFlowMarkers();
  throw new Error("Не получен URL для входа через Google.");
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
