import { AppError } from "./errors.js";

/**
 * Vercel ↔ Supabase integration injects POSTGRES_* URLs, not DATABASE_URL.
 * Order: explicit DATABASE_URL wins, then typical integration keys.
 */
const POSTGRES_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

export function resolveRawPostgresUrlFromEnv(): string | undefined {
  for (const key of POSTGRES_ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

/** Which env key supplied the URL (for logs only; no secrets). */
export function resolvedPostgresEnvKey(): string | undefined {
  for (const key of POSTGRES_ENV_KEYS) {
    if (process.env[key]?.trim()) return key;
  }
  return undefined;
}

/**
 * Trim quotes; unwrap mistaken bracket-wrapped password from UI copy-paste
 * (`postgresql://user:[pass]@host` → `postgresql://user:pass@host`).
 */
export function normalizeDatabaseConnectionString(raw: string): string {
  let u = raw.trim();
  if (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim();
  }
  u = u.replace(/:\/\/([^/?#]+):\[([^\]]*)\]@/g, "://$1:$2@");
  return u;
}

/**
 * Vercel/Prisma URLs often include `sslmode=verify-full` (needs CA bundle).
 * With node `pg`, TLS is applied via `Pool` options `ssl: { rejectUnauthorized: false }`;
 * leaving sslmode in the URI can cause handshake / verification errors.
 */
export function stripSslQueryParamsFromPostgresUrl(url: string): string {
  let out = url;
  for (const param of [
    "sslmode",
    "sslrootcert",
    "sslcert",
    "sslkey",
    "sslcrl",
    "sslcompression",
  ]) {
    const re = new RegExp(`[?&]${param}=[^&]*`, "gi");
    out = out.replace(re, "");
  }
  out = out.replace(/\?&+/g, "?").replace(/&&+/g, "&");
  // If first query char became "&" (ssl* was first param), fix to "?"
  out = out.replace(/^([^?]+)&([^/]*)$/, (_, base, rest) =>
    rest ? `${base}?${rest}` : base
  );
  if (out.endsWith("?") || out.endsWith("&")) {
    out = out.slice(0, -1);
  }
  return out;
}

/** Non-empty Postgres URI for `pg` Pool, or throws AppError 503. */
export function requirePostgresConnectionString(): string {
  const raw = resolveRawPostgresUrlFromEnv();
  if (!raw) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Нет строки подключения к Postgres: задайте DATABASE_URL или переменные интеграции Vercel+Supabase (POSTGRES_URL).",
      503
    );
  }
  return normalizeDatabaseConnectionString(raw);
}
