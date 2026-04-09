import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import { getPool } from "./db.js";
import { getConfig } from "./config.js";
import { AppError } from "./errors.js";
import { generateOpaqueToken, hashOpaqueToken } from "./cryptoTokens.js";
import { hashPassword, verifyPassword } from "./password.js";
import { signAccessToken } from "./jwt.js";
import { sendPasswordResetEmail } from "./email.js";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerifiedAt: string | null;
}

/** Redact email for logs */
function maskEmail(email: string): string {
  const [a, domain] = email.split("@");
  if (!domain) return "***";
  return `${a.slice(0, 2)}***@${domain}`;
}

function logPgError(context: string, err: unknown): void {
  const e = err as {
    code?: string;
    message?: string;
    detail?: string;
    constraint?: string;
    column?: string;
    table?: string;
  };
  console.error(`[auth:pg] ${context}`, {
    code: e.code,
    message: e.message,
    detail: e.detail,
    constraint: e.constraint,
    column: e.column,
    table: e.table,
  });
}

function mapPgUniqueAndConstraints(err: unknown): AppError | null {
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e.code === "23505") {
    return new AppError(
      "EMAIL_ALREADY_REGISTERED",
      "Аккаунт с таким email уже зарегистрирован",
      409
    );
  }
  if (e.code === "23502") {
    return new AppError(
      "VALIDATION_ERROR",
      "Не заполнено обязательное поле",
      400,
      { pg: e.message }
    );
  }
  if (e.code === "23514") {
    return new AppError(
      "VALIDATION_ERROR",
      "Данные не проходят проверку в базе",
      400,
      { pg: e.message }
    );
  }
  if (e.code === "42703" || e.code === "42883") {
    return new AppError(
      "INTERNAL_ERROR",
      "Несовпадение схемы базы данных",
      500
    );
  }
  return null;
}

/** Node/pg connectivity and auth failures → 503 instead of opaque 500. */
function mapInfrastructureError(e: unknown): AppError | null {
  const err = e as { code?: string; message?: string };
  const c = err.code;
  const m = (err.message ?? "").toLowerCase();
  if (c === "ENOTFOUND" || c === "EAI_AGAIN") {
    return new AppError(
      "SERVICE_UNAVAILABLE",
      "Сервер базы не найден (DNS). Проверьте строку подключения в Supabase и переменные POSTGRES_URL / DATABASE_URL на Vercel.",
      503
    );
  }
  if (c === "ECONNREFUSED" || c === "ETIMEDOUT") {
    return new AppError(
      "SERVICE_UNAVAILABLE",
      "База данных недоступна (таймаут или отказ). Проверьте порт и что проект Supabase не на паузе.",
      503
    );
  }
  if (typeof c === "string" && /^08/.test(c)) {
    return new AppError(
      "SERVICE_UNAVAILABLE",
      "Ошибка соединения с базой данных",
      503
    );
  }
  if (c === "28P01" || m.includes("password authentication failed")) {
    return new AppError(
      "SERVICE_UNAVAILABLE",
      "Неверный логин или пароль к базе — проверьте строку подключения",
      503
    );
  }
  if (m.includes("certificate") || (m.includes("ssl") && m.includes("fail"))) {
    return new AppError(
      "SERVICE_UNAVAILABLE",
      "Ошибка TLS при подключении к базе. Проверьте POSTGRES_URL; после деплоя попробуйте снова.",
      503
    );
  }
  return null;
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified_at: Date | null;
};

/** Prefer DB DEFAULT on `id` (Supabase); fallback to gen_random_uuid() if `id` is NOT NULL without default. */
async function insertUserRow(
  pool: Pool,
  email: string,
  passwordHash: string,
  name: string,
  role: string
): Promise<UserRow> {
  const returning = `RETURNING id, email, name, role, email_verified_at`;
  const vals = `VALUES ($1, $2, $3, $4, NULL, NULL, NOW(), NOW())`;
  const cols =
    "(email, password_hash, name, role, email_verified_at, last_login_at, created_at, updated_at)";

  try {
    const ins = await pool.query<UserRow>(
      `INSERT INTO users ${cols} ${vals} ${returning}`,
      [email, passwordHash, name, role]
    );
    return ins.rows[0];
  } catch (e) {
    const pg = e as { code?: string; column?: string; message?: string };
    const idMissing =
      pg.code === "23502" &&
      (pg.column === "id" ||
        /null value in column "id"/i.test(pg.message ?? ""));
    if (idMissing) {
      const ins = await pool.query<UserRow>(
        `INSERT INTO users (id, email, password_hash, name, role, email_verified_at, last_login_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NULL, NULL, NOW(), NOW())
         ${returning}`,
        [email, passwordHash, name, role]
      );
      return ins.rows[0];
    }
    throw e;
  }
}

async function insertRefreshTokenRow(
  pool: Pool,
  userId: string,
  refreshHash: string,
  refreshExpires: Date,
  userAgent: string | null | undefined,
  ip: string | null | undefined
): Promise<void> {
  const cols =
    "(user_id, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address)";
  const vals = "VALUES ($1, $2, $3, NOW(), NULL, $4, $5)";

  try {
    await pool.query(
      `INSERT INTO refresh_tokens ${cols} ${vals}`,
      [userId, refreshHash, refreshExpires, userAgent ?? null, ip ?? null]
    );
  } catch (e) {
    const pg = e as { code?: string; column?: string; message?: string };
    const idMissing =
      pg.code === "23502" &&
      (pg.column === "id" ||
        /null value in column "id"/i.test(pg.message ?? ""));
    if (idMissing) {
      await pool.query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NULL, $4, $5)`,
        [userId, refreshHash, refreshExpires, userAgent ?? null, ip ?? null]
      );
      return;
    }
    throw e;
  }
}

function mapUser(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified_at: Date | null;
}): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    emailVerifiedAt: row.email_verified_at
      ? row.email_verified_at.toISOString()
      : null,
  };
}

/**
 * Registration without explicit BEGIN/COMMIT — совместимо с Supabase Transaction pooler (6543).
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  userAgent: string | undefined,
  ip: string | undefined
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: PublicUser;
}> {
  const config = getConfig();
  const pool = getPool();
  /** DB default; override via DEFAULT_USER_ROLE, иначе всегда 'user' для новых аккаунтов */
  const role = (config.defaultUserRole || "user").trim() || "user";

  console.info("[auth:register] request (sanitized)", {
    email: maskEmail(email),
    nameLength: name.length,
    passwordLength: password.length,
    role,
  });

  try {
    const dup = await pool.query(
      `SELECT 1 FROM users WHERE lower(trim(email)) = lower(trim($1::text)) LIMIT 1`,
      [email]
    );
    if (dup.rowCount && dup.rowCount > 0) {
      console.info("[auth:register] email already exists", {
        email: maskEmail(email),
      });
      throw new AppError(
        "EMAIL_ALREADY_REGISTERED",
        "Аккаунт с таким email уже зарегистрирован",
        409
      );
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    logPgError("register email uniqueness check", e);
    const infra = mapInfrastructureError(e);
    if (infra) throw infra;
    throw new AppError("INTERNAL_ERROR", "Не удалось проверить email", 500);
  }

  const passwordHash = await hashPassword(password);
  const plainRefresh = generateOpaqueToken();
  const refreshHash = hashOpaqueToken(plainRefresh + config.jwtRefreshPepper);
  const refreshExpires = new Date(
    Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000
  );

  let userRow: UserRow;

  try {
    userRow = await insertUserRow(pool, email, passwordHash, name, role);
    console.info("[auth:register] users INSERT ok", {
      id: userRow.id,
      email: maskEmail(userRow.email),
      role: userRow.role,
    });
  } catch (e) {
    logPgError("users INSERT", e);
    const infra = mapInfrastructureError(e);
    if (infra) throw infra;
    const mapped = mapPgUniqueAndConstraints(e);
    if (mapped) throw mapped;
    throw new AppError(
      "INTERNAL_ERROR",
      "Не удалось создать пользователя",
      500
    );
  }

  try {
    await insertRefreshTokenRow(
      pool,
      userRow.id,
      refreshHash,
      refreshExpires,
      userAgent,
      ip
    );
    console.info("[auth:register] refresh_tokens INSERT ok", {
      userId: userRow.id,
    });
  } catch (e) {
    logPgError("refresh_tokens INSERT (rolling back user)", e);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userRow.id]).catch(() => {
      console.error("[auth:register] rollback DELETE users failed");
    });
    const infra = mapInfrastructureError(e);
    if (infra) throw infra;
    const mapped = mapPgUniqueAndConstraints(e);
    if (mapped) throw mapped;
    throw new AppError(
      "INTERNAL_ERROR",
      "Не удалось создать сессию",
      500
    );
  }

  const { token: accessToken, expiresAt: accessExp } = signAccessToken(
    userRow.id
  );
  return {
    accessToken,
    refreshToken: plainRefresh,
    expiresAt: accessExp.toISOString(),
    user: mapUser(userRow),
  };
}

const DUMMY_HASH = bcrypt.hashSync(`__no_user__${Math.random()}`, 12);

export async function loginUser(
  email: string,
  password: string,
  userAgent: string | undefined,
  ip: string | undefined
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: PublicUser;
}> {
  const config = getConfig();
  const pool = getPool();

  const res = await pool.query<{
    id: string;
    email: string;
    name: string;
    role: string;
    email_verified_at: Date | null;
    password_hash: string;
  }>(
    `SELECT id, email, name, role, email_verified_at, password_hash FROM users WHERE lower(trim(email)) = lower(trim($1::text))`,
    [email]
  );

  const row = res.rows[0];
  const storedHash = row?.password_hash?.trim();
  const hash = storedHash && storedHash.length > 0 ? storedHash : DUMMY_HASH;
  const ok = await verifyPassword(password, hash);

  if (!row || !storedHash || !ok) {
    console.info("[auth:login] failed", { email: maskEmail(email), found: !!row });
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Неверный email или пароль",
      401
    );
  }

  const plainRefresh = generateOpaqueToken();
  const refreshHash = hashOpaqueToken(plainRefresh + config.jwtRefreshPepper);
  const refreshExpires = new Date(
    Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000
  );

  try {
    await pool.query(
      `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [row.id]
    );
    await insertRefreshTokenRow(
      pool,
      row.id,
      refreshHash,
      refreshExpires,
      userAgent,
      ip
    );
    console.info("[auth:login] ok", { userId: row.id });
  } catch (e) {
    logPgError("login session insert", e);
    const infra = mapInfrastructureError(e);
    if (infra) throw infra;
    throw new AppError(
      "INTERNAL_ERROR",
      "Не удалось создать сессию",
      500
    );
  }

  const { token: accessToken, expiresAt: accessExp } = signAccessToken(row.id);
  return {
    accessToken,
    refreshToken: plainRefresh,
    expiresAt: accessExp.toISOString(),
    user: mapUser(row),
  };
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const config = getConfig();
  const pool = getPool();
  const tokenHash = hashOpaqueToken(refreshToken + config.jwtRefreshPepper);
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

/**
 * Одна SQL-транзакция на уровне Postgres (CTE) — один round-trip, без BEGIN в приложении.
 */
export async function refreshSession(
  refreshToken: string,
  userAgent: string | undefined,
  ip: string | undefined
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: PublicUser;
}> {
  const config = getConfig();
  const pool = getPool();
  const tokenHash = hashOpaqueToken(refreshToken + config.jwtRefreshPepper);
  const newPlain = generateOpaqueToken();
  const newHash = hashOpaqueToken(newPlain + config.jwtRefreshPepper);
  const refreshExpires = new Date(
    Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000
  );

  try {
    const result = await pool.query<{ user_id: string }>(
      `WITH revoked AS (
         UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE token_hash = $1
           AND revoked_at IS NULL
           AND expires_at > NOW()
         RETURNING user_id
       )
       INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address)
       SELECT gen_random_uuid(), user_id, $2, $3, NOW(), NULL, $4, $5
       FROM revoked
       RETURNING user_id`,
      [tokenHash, newHash, refreshExpires, userAgent ?? null, ip ?? null]
    );

    const userId = result.rows[0]?.user_id;
    if (!userId) {
      console.info("[auth:refresh] invalid or expired token");
      throw new AppError(
        "UNAUTHORIZED",
        "Сессия недействительна или истекла — войдите снова",
        401
      );
    }

    const u = await pool.query<{
      id: string;
      email: string;
      name: string;
      role: string;
      email_verified_at: Date | null;
    }>(
      `SELECT id, email, name, role, email_verified_at FROM users WHERE id = $1`,
      [userId]
    );
    const userRow = u.rows[0];
    if (!userRow) {
      throw new AppError("UNAUTHORIZED", "Пользователь не найден", 401);
    }

    const { token: accessToken, expiresAt: accessExp } = signAccessToken(
      userRow.id
    );
    console.info("[auth:refresh] ok", { userId: userRow.id });
    return {
      accessToken,
      refreshToken: newPlain,
      expiresAt: accessExp.toISOString(),
      user: mapUser(userRow),
    };
  } catch (e) {
    if (e instanceof AppError) throw e;
    logPgError("refreshSession", e);
    const infra = mapInfrastructureError(e);
    if (infra) throw infra;
    throw new AppError(
      "INTERNAL_ERROR",
      "Не удалось обновить сессию",
      500
    );
  }
}

const FORGOT_OK_MESSAGE =
  "Если аккаунт с таким email есть, мы отправим инструкцию по сбросу пароля.";

export async function requestPasswordReset(email: string): Promise<{
  message: string;
}> {
  const config = getConfig();
  const pool = getPool();
  const res = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );
  const user = res.rows[0];

  if (user) {
    const plain = generateOpaqueToken();
    const th = hashOpaqueToken(plain);
    const expiresAt = new Date(
      Date.now() + config.passwordResetTtlHours * 60 * 60 * 1000
    );

    try {
      await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
        user.id,
      ]);
      await pool.query(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NULL, NOW())`,
        [user.id, th, expiresAt]
      );
      console.info("[auth:forgot-password] token row created", {
        userId: user.id,
        email: maskEmail(email),
      });
    } catch (e) {
      logPgError("password_reset_tokens", e);
      throw new AppError(
        "INTERNAL_ERROR",
        "Не удалось начать сброс пароля",
        500
      );
    }

    const resetUrl = `${config.frontendUrl}/auth/reset-password?token=${encodeURIComponent(plain)}`;
    await sendPasswordResetEmail(email, resetUrl);
  }

  return { message: FORGOT_OK_MESSAGE };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  const pool = getPool();
  const th = hashOpaqueToken(token);
  const newHash = await hashPassword(newPassword);

  try {
    const sel = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [th]
    );
    const pr = sel.rows[0];
    if (!pr) {
      console.info("[auth:reset-password] invalid or expired token");
      throw new AppError(
        "TOKEN_INVALID",
        "Ссылка сброса недействительна или истекла",
        400
      );
    }

    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, pr.user_id]
    );
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [pr.user_id]
    );
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [pr.id]
    );
    console.info("[auth:reset-password] ok", { userId: pr.user_id });
    return {
      message: "Пароль изменён. Войдите с новым паролем.",
    };
  } catch (e) {
    if (e instanceof AppError) throw e;
    logPgError("resetPasswordWithToken", e);
    throw new AppError(
      "INTERNAL_ERROR",
      "Не удалось сбросить пароль",
      500
    );
  }
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    email: string;
    name: string;
    role: string;
    email_verified_at: Date | null;
  }>(
    `SELECT id, email, name, role, email_verified_at FROM users WHERE id = $1`,
    [userId]
  );
  const row = res.rows[0];
  return row ? mapUser(row) : null;
}
