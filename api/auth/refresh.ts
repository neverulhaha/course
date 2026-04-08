import type { VercelRequest, VercelResponse } from "@vercel/node";
import { refreshSession } from "../lib/auth.service.js";
import {
  getClientIp,
  parseJsonBody,
  requireMethod,
  runApi,
} from "../lib/http.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { parseBody, refreshBodySchema } from "../lib/validation.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  await runApi(req, res, async () => {
    requireMethod(req, "POST");
    checkRateLimit(`refresh:${getClientIp(req)}`, {
      windowMs: 15 * 60 * 1000,
      max: 100,
    });
    const body = parseBody(refreshBodySchema, parseJsonBody(req));
    const ua = req.headers["user-agent"] ?? undefined;
    const out = await refreshSession(
      body.refreshToken,
      typeof ua === "string" ? ua : undefined,
      getClientIp(req)
    );
    res.status(200).json(out);
  });
}
