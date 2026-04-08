import bcrypt from "bcryptjs";
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
  const passwordHash = await hashPassword(password);
  const plainRefresh = generateOpaqueToken();
  const refreshHash = hashOpaqueToken(plainRefresh + config.jwtRefreshPepper);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let userRow: {
      id: string;
      email: string;
      name: string;
      role: string;
      email_verified_at: Date | null;
    };
    try {
      const ins = await client.query<typeof userRow>(
        `INSERT INTO users (id, email, password_hash, name, role, email_verified_at, last_login_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NULL, NULL, NOW(), NOW())
         RETURNING id, email, name, role, email_verified_at`,
        [email, passwordHash, name, config.defaultUserRole]
      );
      userRow = ins.rows[0];
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "23505") {
        throw new AppError(
          "EMAIL_ALREADY_REGISTERED",
          "An account with this email already exists",
          409
        );
      }
      throw e;
    }

    const expiresAt = new Date(
      Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000
    );
    await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NULL, $4, $5)`,
      [userRow.id, refreshHash, expiresAt, userAgent ?? null, ip ?? null]
    );

    await client.query("COMMIT");

    const { token: accessToken, expiresAt: accessExp } = signAccessToken(
      userRow.id
    );
    return {
      accessToken,
      refreshToken: plainRefresh,
      expiresAt: accessExp.toISOString(),
      user: mapUser(userRow),
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
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
    `SELECT id, email, name, role, email_verified_at, password_hash FROM users WHERE email = $1`,
    [email]
  );

  const row = res.rows[0];
  const hash = row?.password_hash ?? DUMMY_HASH;
  const ok = await verifyPassword(password, hash);

  if (!row || !ok) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid email or password",
      401
    );
  }

  const plainRefresh = generateOpaqueToken();
  const refreshHash = hashOpaqueToken(plainRefresh + config.jwtRefreshPepper);
  const refreshExpires = new Date(
    Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [row.id]
    );
    await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NULL, $4, $5)`,
      [row.id, refreshHash, refreshExpires, userAgent ?? null, ip ?? null]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{
      id: string;
      user_id: string;
      expires_at: Date;
    }>(
      `SELECT id, user_id, expires_at FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL FOR UPDATE`,
      [tokenHash]
    );
    const rt = found.rows[0];
    if (!rt || rt.expires_at < new Date()) {
      await client.query("ROLLBACK");
      throw new AppError(
        "UNAUTHORIZED",
        "Invalid or expired refresh token",
        401
      );
    }

    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [rt.id]
    );

    const newPlain = generateOpaqueToken();
    const newHash = hashOpaqueToken(newPlain + config.jwtRefreshPepper);
    const refreshExpires = new Date(
      Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000
    );
    await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NULL, $4, $5)`,
      [rt.user_id, newHash, refreshExpires, userAgent ?? null, ip ?? null]
    );

    const u = await client.query<{
      id: string;
      email: string;
      name: string;
      role: string;
      email_verified_at: Date | null;
    }>(
      `SELECT id, email, name, role, email_verified_at FROM users WHERE id = $1`,
      [rt.user_id]
    );
    const userRow = u.rows[0];
    if (!userRow) {
      await client.query("ROLLBACK");
      throw new AppError("UNAUTHORIZED", "User not found", 401);
    }

    await client.query("COMMIT");

    const { token: accessToken, expiresAt: accessExp } = signAccessToken(
      userRow.id
    );
    return {
      accessToken,
      refreshToken: newPlain,
      expiresAt: accessExp.toISOString(),
      user: mapUser(userRow),
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

const FORGOT_OK_MESSAGE =
  "If an account exists for this email, you will receive password reset instructions.";

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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
        user.id,
      ]);
      await client.query(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NULL, NOW())`,
        [user.id, th, expiresAt]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await client.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
       WHERE token_hash = $1 FOR UPDATE`,
      [th]
    );
    const pr = row.rows[0];
    if (!pr || pr.used_at || pr.expires_at < new Date()) {
      await client.query("ROLLBACK");
      throw new AppError(
        "TOKEN_INVALID",
        "Invalid or expired reset token",
        400
      );
    }

    const newHash = await hashPassword(newPassword);
    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, pr.user_id]
    );
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [pr.id]
    );
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [pr.user_id]
    );
    await client.query("COMMIT");
    return {
      message: "Password has been reset. You can sign in with your new password.",
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
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
