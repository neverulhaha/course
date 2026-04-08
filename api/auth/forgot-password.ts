import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestPasswordReset } from "../lib/auth.service.js";
import {
  getClientIp,
  parseJsonBody,
  requireMethod,
  runApi,
} from "../lib/http.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { forgotPasswordBodySchema, parseBody } from "../lib/validation.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  await runApi(req, res, async () => {
    requireMethod(req, "POST");
    checkRateLimit(`forgot:${getClientIp(req)}`, {
      windowMs: 60 * 60 * 1000,
      max: 3,
      message: "Too many password reset requests",
    });
    const body = parseBody(forgotPasswordBodySchema, parseJsonBody(req));
    const out = await requestPasswordReset(body.email);
    res.status(200).json(out);
  });
}
