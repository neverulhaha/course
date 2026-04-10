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
  unexpected_failure:
    "Внутренняя ошибка Supabase Auth. Часто это SMTP при подтверждении email или триггер на auth.users — смотрите Logs → Auth в Dashboard.",
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
  if (
    lower.includes("error sending") ||
    lower.includes("confirmation email") ||
    lower.includes("sending confirmation")
  ) {
    return (
      "Не удалось отправить письмо подтверждения. Проверьте Custom SMTP в Supabase: Authentication → Providers → Email, и логи Auth."
    );
  }
  if (lower.includes("database error") || lower.includes("saving new user")) {
    return (
      "Ошибка базы при создании пользователя (часто триггер или RLS на auth.users). Проверьте логи Postgres и триггеры в Supabase."
    );
  }
  if (
    lower.includes("smtp") ||
    lower.includes("dial tcp") ||
    lower.includes("535") ||
    lower.includes("authentication failed") ||
    lower.includes("certificate")
  ) {
    return (
      "Ошибка подключения к почтовому серверу (SMTP): хост, порт, TLS, логин или пароль приложения в настройках Email в Supabase."
    );
  }
  return null;
}

function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

const SIGNUP_SERVER_ERROR_HINT =
  "Сервер Supabase вернул ошибку 500. При регистрации с подтверждением email чаще всего сбой Custom SMTP (Authentication → Providers → Email) или триггер/hook на auth.users. Точную причину смотрите в Dashboard → Logs → Auth.";

const GOOGLE_PROVIDER_DISABLED_RU =
  "Вход через Google не включён в этом проекте Supabase. " +
  "Dashboard → Authentication → Providers → Google: включите «Enable Sign in with Google», укажите Client ID и Client Secret (тип приложения Web в Google Cloud Console). " +
  "В Google Cloud → Authorized redirect URIs добавьте https://<ваш-ref>.supabase.co/auth/v1/callback (ref — из Project Settings → API).";

/** GoTrue иногда отдаёт code: 400 (число); семантический код — только в error_code (строка). */
function pickAuthErrorCode(o: Record<string, unknown>): string | undefined {
  const ec = o.error_code;
  if (typeof ec === "string" && ec.length > 0) return ec;
  const c = o.code;
  if (typeof c === "string" && c.length > 0 && !/^\d+$/.test(c)) return c;
  return undefined;
}

function unwrapJsonAuthMessage(message: string): { message: string; code?: string } {
  const t = message.trim();
  if (!t.startsWith("{")) return { message };
  try {
    const j = JSON.parse(t) as Record<string, unknown>;
    const innerMsg =
      typeof j.msg === "string"
        ? j.msg
        : typeof j.message === "string"
          ? j.message
          : message;
    const innerCode = pickAuthErrorCode(j);
    return { message: innerMsg, code: innerCode };
  } catch {
    return { message };
  }
}

/** Ответ `POST /api/auth/signup-email-check` при конфликте — бросается до `signUp`. */
async function assertSignupEmailAllowedByBackend(email: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/auth/signup-email-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  } catch {
    return;
  }
  if (res.ok) return;
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object") return;
  const rec = parsed as { code?: unknown; message?: unknown };
  const msg = typeof rec.message === "string" ? rec.message : "";
  if (rec.code === "EMAIL_REGISTERED_WITH_GOOGLE" && msg) {
    throw Object.assign(new Error(msg), { code: "EMAIL_REGISTERED_WITH_GOOGLE" as const });
  }
  if (rec.code === "EMAIL_ALREADY_REGISTERED" && msg) {
    throw Object.assign(new Error(msg), { code: "EMAIL_ALREADY_REGISTERED" as const });
  }
}

export function authErrorMessage(error: unknown): string {
  let message = "";
  let code: string | undefined;
  let status: number | undefined;

  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (o.code === "EMAIL_REGISTERED_WITH_GOOGLE" || o.code === "EMAIL_ALREADY_REGISTERED") {
      if (typeof o.message === "string" && o.message.length > 0) return o.message;
    }
    if (typeof o.message === "string") message = o.message;
    else if (typeof o.msg === "string") message = o.msg;
    code = pickAuthErrorCode(o);
    if (typeof o.status === "number") status = o.status;
  } else if (error instanceof Error) {
    message = error.message;
  }

  if (!message) {
    if (status === 500) return SIGNUP_SERVER_ERROR_HINT;
    return "Что-то пошло не так. Попробуйте ещё раз.";
  }

  const unwrapped = unwrapJsonAuthMessage(message);
  message = unwrapped.message;
  code = code ?? unwrapped.code;

  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("unsupported provider") || lowerMsg.includes("provider is not enabled")) {
    return GOOGLE_PROVIDER_DISABLED_RU;
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

  if (status === 500) {
    const short = message.replace(/\s+/g, " ").trim();
    if (short.length > 0 && !/^internal server error\.?$/i.test(short)) {
      return `${SIGNUP_SERVER_ERROR_HINT} (${short})`;
    }
    return SIGNUP_SERVER_ERROR_HINT;
  }

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
  await assertSignupEmailAllowedByBackend(email);
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
