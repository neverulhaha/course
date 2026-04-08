import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logoutUser } from "../lib/auth.service.js";
import {
  getClientIp,
  parseJsonBody,
  requireMethod,
  runApi,
} from "../lib/http.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { logoutBodySchema, parseBody } from "../lib/validation.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  await runApi(req, res, async () => {
    requireMethod(req, "POST");
    checkRateLimit(`logout:${getClientIp(req)}`, {
      windowMs: 15 * 60 * 1000,
      max: 100,
    });
    const body = parseBody(logoutBodySchema, parseJsonBody(req));
    await logoutUser(body.refreshToken);
    res.status(204).end();
  });
}
