import { getPool } from "./db.js";

/**
 * Провайдеры из `auth.identities` (GoTrue): `email`, `google`, и т.д.
 * Один пользователь может иметь несколько строк identities.
 */
export type SignupEmailConflict =
  | "available"
  | "google_only"
  | "email_identity"
  | "oauth_other";

/**
 * Читает `auth.users` + `auth.identities` тем же подключением, что и приложение.
 * Нужны права роли БД на чтение `auth` (у `postgres` в Supabase обычно есть).
 * При ошибке доступа / сети — `available` (не блокируем регистрацию).
 */
export async function resolveSignupEmailConflict(
  email: string
): Promise<SignupEmailConflict> {
  const pool = getPool();
  try {
    const res = await pool.query<{ provider: string }>(
      `SELECT DISTINCT i.provider
       FROM auth.users u
       INNER JOIN auth.identities i ON i.user_id = u.id
       WHERE lower(trim(u.email::text)) = lower(trim($1::text))`,
      [email]
    );
    if (!res.rowCount) return "available";
    const providers = new Set(
      res.rows.map((r) => r.provider).filter((p): p is string => typeof p === "string")
    );
    if (providers.has("email")) return "email_identity";
    if (providers.has("google")) return "google_only";
    return "oauth_other";
  } catch (e) {
    console.warn("[supabaseAuthIdentities] cannot inspect auth.identities:", e);
    return "available";
  }
}
