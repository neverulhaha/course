/**
 * Single Vercel Serverless Function for all /api/auth/* routes.
 * Subpaths are mapped via vercel.json rewrites → ?__op=...
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as jwt from "jsonwebtoken";
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
import {
  getClientIp,
  parseJsonBody,
  requireMethod,
} from "../lib/server/http.js";
import { verifyAccessToken } from "../lib/server/jwt.js";
import { checkRateLimit } from "../lib/server/rateLimit.js";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  logoutBodySchema,
  parseBody,
  refreshBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "../lib/server/validation.js";

function setCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin;
  const allowed = process.env.FRONTEND_URL?.replace(/\/$/, "");
  if (origin && allowed && origin.replace(/\/$/, "") === allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (process.env.NODE_ENV !== "production" && origin) {
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
      throw new AppError("NOT_FOUND", "Unknown auth route", 404);
    }

    logRequest(req, op);

    switch (op) {
      case "register": {
        requireMethod(req, "POST");
        checkRateLimit(`register:${ip}`, {
          windowMs: 15 * 60 * 1000,
          max: 5,
          message: "Too many registration attempts",
        });
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
          message: "Too many login attempts",
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
          message: "Too many password reset requests",
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
            "Missing or invalid Authorization header",
            401
          );
        }
        let sub: string;
        try {
          ({ sub } = verifyAccessToken(m[1]));
        } catch (e) {
          if (e instanceof jwt.TokenExpiredError) {
            throw new AppError("TOKEN_EXPIRED", "Access token expired", 401);
          }
          throw new AppError("TOKEN_INVALID", "Invalid access token", 401);
        }
        const user = await getUserById(sub);
        if (!user) {
          throw new AppError("UNAUTHORIZED", "User not found", 401);
        }
        res.status(200).json(user);
        break;
      }

      default:
        throw new AppError("NOT_FOUND", "Unknown auth route", 404);
    }
  } catch (e) {
    const { status, body } = toErrorBody(e);
    if (e instanceof Error && !(e instanceof AppError)) {
      console.error("[api/auth] unhandled:", e.message);
    }
    res.status(status).json(body);
  }
}
