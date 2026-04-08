import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loginUser } from "../lib/auth.service.js";
import {
  getClientIp,
  parseJsonBody,
  requireMethod,
  runApi,
} from "../lib/http.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { loginBodySchema, parseBody } from "../lib/validation.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  await runApi(req, res, async () => {
    requireMethod(req, "POST");
    checkRateLimit(`login:${getClientIp(req)}`, {
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: "Too many login attempts",
    });
    const body = parseBody(loginBodySchema, parseJsonBody(req));
    const ua = req.headers["user-agent"] ?? undefined;
    const out = await loginUser(
      body.email,
      body.password,
      typeof ua === "string" ? ua : undefined,
      getClientIp(req)
    );
    res.status(200).json(out);
  });
}
