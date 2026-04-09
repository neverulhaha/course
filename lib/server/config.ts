import { AppError } from "./errors.js";
import { requirePostgresConnectionString } from "./databaseUrl.js";

function stripQuotes(v: string): string {
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1).trim();
  }
  return v;
}

function required(name: string): string {
  const raw = process.env[name];
  const v = raw?.trim();
  if (!v) {
    throw new AppError(
      "INTERNAL_ERROR",
      `Не задана обязательная настройка: ${name}`,
      500
    );
  }
  return stripQuotes(v);
}

/** Секрет подписи access JWT для кастомного API (как в интеграции Supabase на Vercel). */
function jwtAccessSecretFromEnv(): string {
  const raw = process.env.SUPABASE_JWT_SECRET?.trim();
  if (!raw) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Задайте SUPABASE_JWT_SECRET",
      500
    );
  }
  return stripQuotes(raw);
}

function accessTtlMinutesFromEnv(): number {
  const hours = Number(process.env.ACCESS_TOKEN_TTL_HOURS);
  if (Number.isFinite(hours) && hours > 0) {
    return Math.min(Math.round(hours * 60), 24 * 60 * 365);
  }
  const mins = Number(process.env.ACCESS_TOKEN_TTL_MINUTES);
  if (Number.isFinite(mins) && mins > 0) return mins;
  return 15;
}

export function getConfig() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isDev: process.env.NODE_ENV !== "production",

    databaseUrl: requirePostgresConnectionString(),

    jwtAccessSecret: jwtAccessSecretFromEnv(),
    jwtRefreshPepper: "",

    accessTtlMinutes: accessTtlMinutesFromEnv(),
    refreshTtlDays: 30,
    passwordResetTtlHours: 1,

    defaultUserRole: "user",
    frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(
      /\/$/,
      ""
    ),

    smtp: {
      host: undefined,
      port: 587,
      secure: false,
      user: undefined,
      pass: undefined,
      from: "noreply@example.com",
    },
  };
}
