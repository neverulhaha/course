import { AppError } from "./errors.js";

function required(name: string): string {
  const raw = process.env[name];
  const v = raw?.trim();
  if (!v) {
    if (name === "DATABASE_URL") {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "DATABASE_URL is not configured",
        503
      );
    }
    throw new AppError(
      "INTERNAL_ERROR",
      `Missing required configuration: ${name}`,
      500
    );
  }
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1).trim();
  }
  return v;
}

export function getConfig() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isDev: process.env.NODE_ENV !== "production",

    databaseUrl: required("DATABASE_URL"),

    jwtAccessSecret: required("JWT_ACCESS_SECRET"),
    jwtRefreshPepper: process.env.JWT_REFRESH_PEPPER?.trim() ?? "",

    accessTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES) || 15,
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,
    passwordResetTtlHours: Number(process.env.PASSWORD_RESET_TTL_HOURS) || 1,

    defaultUserRole: (process.env.DEFAULT_USER_ROLE ?? "user").trim() || "user",
    frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(
      /\/$/,
      ""
    ),

    smtp: {
      host: process.env.SMTP_HOST?.trim(),
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
      from: process.env.SMTP_FROM?.trim() ?? "noreply@example.com",
    },
  };
}
