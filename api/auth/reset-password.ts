import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resetPasswordWithToken } from "../lib/auth.service.js";
import {
  getClientIp,
  parseJsonBody,
  requireMethod,
  runApi,
} from "../lib/http.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { parseBody, resetPasswordBodySchema } from "../lib/validation.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  await runApi(req, res, async () => {
    requireMethod(req, "POST");
    checkRateLimit(`reset:${getClientIp(req)}`, {
      windowMs: 15 * 60 * 1000,
      max: 30,
    });
    const body = parseBody(resetPasswordBodySchema, parseJsonBody(req));
    const out = await resetPasswordWithToken(body.token, body.newPassword);
    res.status(200).json(out);
  });
}
