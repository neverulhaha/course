import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Single shared pool per serverless isolate. Keep max small for Supabase pooler.
 */
export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    pool = new Pool({
      connectionString: url,
      max: 1,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      ssl: url.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}
