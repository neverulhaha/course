import type { VercelRequest } from "@vercel/node";
import { AppError } from "./errors.js";

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
