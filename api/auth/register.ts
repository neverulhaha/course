import type { VercelRequest, VercelResponse } from "@vercel/node";
import { registerUser } from "../lib/auth.service.js";
import {
  getClientIp,
  parseJsonBody,
  requireMethod,
  runApi,
} from "../lib/http.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { parseBody, registerBodySchema } from "../lib/validation.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  await runApi(req, res, async () => {
    requireMethod(req, "POST");
    checkRateLimit(`register:${getClientIp(req)}`, {
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: "Too many registration attempts",
    });
    const body = parseBody(registerBodySchema, parseJsonBody(req));
    const ua = req.headers["user-agent"] ?? undefined;
    const out = await registerUser(
      body.email,
      body.password,
      body.name,
      typeof ua === "string" ? ua : undefined,
      getClientIp(req)
    );
    res.status(201).json(out);
  });
}
