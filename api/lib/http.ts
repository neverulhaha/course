import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AppError, toErrorBody } from "./errors.js";

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim() || "unknown";
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export function setCors(req: VercelRequest, res: VercelResponse): void {
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

export function parseJsonBody(req: VercelRequest): unknown {
  const b = req.body;
  if (b == null) return undefined;
  if (typeof b === "string") {
    try {
      return JSON.parse(b) as unknown;
    } catch {
      return undefined;
    }
  }
  return b;
}

export function requireMethod(req: VercelRequest, method: string): void {
  if (req.method !== method) {
    throw new AppError(
      "METHOD_NOT_ALLOWED",
      `Method ${method} required`,
      405
    );
  }
}

export async function runApi(
  req: VercelRequest,
  res: VercelResponse,
  fn: () => Promise<void>
): Promise<void> {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  try {
    await fn();
  } catch (e) {
    const { status, body } = toErrorBody(e);
    res.status(status).json(body);
  }
}
