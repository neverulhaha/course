import { Pool } from "pg";

let pool: Pool | null = null;

function normalizeDatabaseUrl(raw: string): string {
  let u = raw.trim();
  if (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1);
  }
  return u;
}

/** True for Supabase / remote hosts; false for local Postgres without SSL. */
function shouldUseSsl(connectionString: string): boolean {
  if (/localhost|127\.0\.0\.1/i.test(connectionString)) return false;
  return true;
}

/**
 * Pool for Supabase: always `ssl: { rejectUnauthorized: false }` on remote.
 * Transaction pooler (6543) + multi-statement transactions is unreliable — use single statements / CTE in auth.service.
 */
export function getPool(): Pool {
  if (!pool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) throw new Error("DATABASE_URL is not set");
    const connectionString = normalizeDatabaseUrl(raw);
    const ssl = shouldUseSsl(connectionString)
      ? { rejectUnauthorized: false }
      : undefined;

    pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 15_000,
      ssl,
    });

    pool.on("error", (err) => {
      console.error("[db] idle client error:", err.message);
    });

    const masked = connectionString.replace(/:([^:@/]+)@/, ":****@");
    console.info("[db] pool ready →", masked.replace(/^postgres(ql)?:\/\//, ""));

    pool
      .query("SELECT 1 AS ok")
      .then(() => console.info("[db] connectivity check: OK"))
      .catch((err: Error) =>
        console.error("[db] connectivity check failed:", err.message)
      );
  }
  return pool;
}
