function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function getConfig() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isDev: process.env.NODE_ENV !== "production",

    databaseUrl: required("DATABASE_URL"),

    jwtAccessSecret: required("JWT_ACCESS_SECRET"),
    jwtRefreshPepper: process.env.JWT_REFRESH_PEPPER ?? "",

    accessTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES) || 15,
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,
    passwordResetTtlHours: Number(process.env.PASSWORD_RESET_TTL_HOURS) || 1,

    defaultUserRole: process.env.DEFAULT_USER_ROLE ?? "user",
    frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(
      /\/$/,
      ""
    ),

    smtp: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM ?? "noreply@example.com",
    },
  };
}
