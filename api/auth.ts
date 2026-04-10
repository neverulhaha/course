/**
 * Single Vercel Serverless Function for all /api/auth/* routes.
 * Subpaths are mapped via vercel.json rewrites → ?__op=...
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import {
  getUserById,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from "../lib/server/auth.service.js";
import { AppError, toErrorBody } from "../lib/server/errors.js";

const SIGNUP_GOOGLE_MESSAGE =
  "Этот email уже зарегистрирован через Google. Войдите через Google.";
const SIGNUP_EMAIL_TAKEN_MESSAGE =
  "Пользователь с таким email уже зарегистрирован.";
import {
  getClientIp,
  parseJsonBody,
  requireMethod,
} from "../lib/server/http.js";
import { verifyAccessToken } from "../lib/server/jwt.js";
import { checkRateLimit } from "../lib/server/rateLimit.js";
import { resolveSignupEmailConflict } from "../lib/server/supabaseAuthIdentities.js";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  logoutBodySchema,
  parseBody,
  refreshBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  signupEmailCheckBodySchema,
} from "../lib/server/validation.js";

function setCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin;
  const allowed = process.env.FRONTEND_URL?.replace(/\/$/, "");
  if (origin && allowed && origin.replace(/\/$/, "") === allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
}

/** From rewrite ?__op=register or path /api/auth/register (fallback). */
function resolveOp(req: VercelRequest): string | undefined {
  const q = req.query.__op;
  if (Array.isArray(q) && q[0]) return q[0];
  if (typeof q === "string" && q) return q;

  const raw = req.url ?? "";
  const pathOnly = raw.split("?")[0] ?? "";
  const m = pathOnly.match(/\/api\/auth\/([^/]+)\/?$/);
  return m?.[1];
}

function userAgent(req: VercelRequest): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

function logRequest(req: VercelRequest, op: string): void {
  const raw = parseJsonBody(req);
  let meta: Record<string, unknown> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const b = raw as Record<string, unknown>;
    if (typeof b.email === "string") {
      const [a, d] = b.email.split("@");
      meta.emailPreview = d ? `${a.slice(0, 2)}***@${d}` : "***";
    }
    if (typeof b.name === "string") meta.nameLen = b.name.length;
    if ("password" in b) meta.hasPassword = true;
    if ("refreshToken" in b) meta.hasRefreshToken = true;
    if ("token" in b) meta.hasResetToken = true;
    if ("newPassword" in b) meta.hasNewPassword = true;
  }
  console.info("[api/auth]", req.method, op, meta);
}

/** Safe logging of register payload (no secrets). */
function logRegisterRequestBody(req: VercelRequest): void {
  const raw = parseJsonBody(req);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    console.info("[api/auth] register req.body", {
      shape: raw === undefined ? "empty" : typeof raw,
    });
    return;
  }
  const b = raw as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email : "";
  const [a, d] = email.split("@");
  console.info("[api/auth] register req.body (sanitized)", {
    emailPreview: d ? `${a.slice(0, 2)}***@${d}` : "***",
    nameLen: typeof b.name === "string" ? b.name.length : 0,
    passwordLen: typeof b.password === "string" ? b.password.length : 0,
    keys: Object.keys(b),
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const ip = getClientIp(req);
  const ua = userAgent(req);

  try {
    const op = resolveOp(req);
    if (!op) {
      console.warn("[api/auth] missing __op; url=", req.url);
      throw new AppError("NOT_FOUND", "Неизвестный маршрут API", 404);
    }

    logRequest(req, op);

    switch (op) {
      case "signup-email-check": {
        requireMethod(req, "POST");
        checkRateLimit(`signup-email-check:${ip}`, {
          windowMs: 15 * 60 * 1000,
          max: 40,
        });
        const body = parseBody(signupEmailCheckBodySchema, parseJsonBody(req));
        const conflict = await resolveSignupEmailConflict(body.email);
        if (conflict === "available") {
          res.status(200).json({ code: "OK", message: "" });
          break;
        }
        if (conflict === "google_only") {
          res.status(409).json({
            code: "EMAIL_REGISTERED_WITH_GOOGLE",
            message: SIGNUP_GOOGLE_MESSAGE,
          });
          break;
        }
        res.status(409).json({
          code: "EMAIL_ALREADY_REGISTERED",
          message: SIGNUP_EMAIL_TAKEN_MESSAGE,
        });
        break;
      }

      case "register": {
        requireMethod(req, "POST");
        checkRateLimit(`register:${ip}`, {
          windowMs: 15 * 60 * 1000,
          max: 5,
          message: "Слишком много попыток регистрации. Подождите 15 минут.",
        });
        logRegisterRequestBody(req);
        const body = parseBody(registerBodySchema, parseJsonBody(req));
        const out = await registerUser(
          body.email,
          body.password,
          body.name,
          ua,
          ip
        );
        res.status(201).json(out);
        break;
      }

      case "login": {
        requireMethod(req, "POST");
        checkRateLimit(`login:${ip}`, {
          windowMs: 15 * 60 * 1000,
          max: 10,
          message: "Слишком много попыток входа. Подождите 15 минут.",
        });
        const body = parseBody(loginBodySchema, parseJsonBody(req));
        const out = await loginUser(body.email, body.password, ua, ip);
        res.status(200).json(out);
        break;
      }

      case "logout": {
        requireMethod(req, "POST");
        checkRateLimit(`logout:${ip}`, {
          windowMs: 15 * 60 * 1000,
          max: 100,
        });
        const body = parseBody(logoutBodySchema, parseJsonBody(req));
        await logoutUser(body.refreshToken);
        res.status(204).end();
        break;
      }

      case "refresh": {
        requireMethod(req, "POST");
        checkRateLimit(`refresh:${ip}`, {
          windowMs: 15 * 60 * 1000,
          max: 100,
        });
        const body = parseBody(refreshBodySchema, parseJsonBody(req));
        const out = await refreshSession(body.refreshToken, ua, ip);
        res.status(200).json(out);
        break;
      }

      case "forgot-password": {
        requireMethod(req, "POST");
        checkRateLimit(`forgot:${ip}`, {
          windowMs: 60 * 60 * 1000,
          max: 3,
          message: "Слишком много запросов сброса пароля. Попробуйте позже.",
        });
        const body = parseBody(forgotPasswordBodySchema, parseJsonBody(req));
        const out = await requestPasswordReset(body.email);
        res.status(200).json(out);
        break;
      }

      case "reset-password": {
        requireMethod(req, "POST");
        checkRateLimit(`reset:${ip}`, {
          windowMs: 15 * 60 * 1000,
          max: 30,
        });
        const body = parseBody(resetPasswordBodySchema, parseJsonBody(req));
        const out = await resetPasswordWithToken(body.token, body.newPassword);
        res.status(200).json(out);
        break;
      }

      case "me": {
        requireMethod(req, "GET");
        checkRateLimit(`me:${ip}`, {
          windowMs: 15 * 60 * 1000,
          max: 200,
        });
        const h = req.headers.authorization;
        const m = h?.match(/^Bearer\s+(.+)$/i);
        if (!m) {
          throw new AppError(
            "UNAUTHORIZED",
            "Нет или неверный заголовок Authorization",
            401
          );
        }
        let sub: string;
        try {
          ({ sub } = verifyAccessToken(m[1]));
        } catch (e) {
          if (e instanceof jwt.TokenExpiredError) {
            throw new AppError("TOKEN_EXPIRED", "Срок действия токена истёк", 401);
          }
          throw new AppError("TOKEN_INVALID", "Недействительный токен доступа", 401);
        }
        const user = await getUserById(sub);
        if (!user) {
          throw new AppError("UNAUTHORIZED", "Пользователь не найден", 401);
        }
        res.status(200).json(user);
        break;
      }

      default:
        throw new AppError("NOT_FOUND", "Неизвестный маршрут API", 404);
    }
  } catch (e) {
    const { status, body } = toErrorBody(e);
    if (e instanceof Error && !(e instanceof AppError)) {
      console.error("[api/auth] unhandled:", e.message);
    }
    res.status(status).json(body);
  }
}
