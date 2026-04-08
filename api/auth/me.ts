import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as jwt from "jsonwebtoken";
import { getUserById } from "../lib/auth.service.js";
import { AppError, toErrorBody } from "../lib/errors.js";
import { getClientIp, requireMethod, setCors } from "../lib/http.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { checkRateLimit } from "../lib/rateLimit.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    requireMethod(req, "GET");
    checkRateLimit(`me:${getClientIp(req)}`, {
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
  } catch (e) {
    const { status, body } = toErrorBody(e);
    res.status(status).json(body);
  }
}
