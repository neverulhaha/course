import * as jwt from "jsonwebtoken";
import { getConfig } from "./config.js";

export interface AccessPayload {
  sub: string;
  typ: "access";
}

export function signAccessToken(userId: string): {
  token: string;
  expiresAt: Date;
} {
  const config = getConfig();
  const expiresAt = new Date(
    Date.now() + config.accessTtlMinutes * 60 * 1000
  );
  const token = jwt.sign(
    { sub: userId, typ: "access" } satisfies AccessPayload,
    config.jwtAccessSecret,
    { expiresIn: `${config.accessTtlMinutes}m`, algorithm: "HS256" }
  );
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessPayload {
  const config = getConfig();
  const decoded = jwt.verify(token, config.jwtAccessSecret, {
    algorithms: ["HS256"],
  });
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }
  const sub = (decoded as { sub?: string }).sub;
  const typ = (decoded as { typ?: string }).typ;
  if (!sub || typ !== "access") throw new Error("Invalid access token");
  return { sub, typ: "access" };
}
