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

/** Non-empty Postgres URI for `pg` Pool, or throws AppError 503. */
export function requirePostgresConnectionString(): string {
  const raw = resolveRawPostgresUrlFromEnv();
  if (!raw) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Postgres connection string missing: set DATABASE_URL or use Vercel Supabase integration (POSTGRES_URL / POSTGRES_PRISMA_URL).",
      503
    );
  }
  return normalizeDatabaseConnectionString(raw);
}
