import type { AuthTokens, User } from "./types";

/** localStorage key for JWT access (value = API `accessToken`) */
export const AUTH_ACCESS_KEY = "auth_token";
/** Opaque refresh token from API */
export const AUTH_REFRESH_KEY = "refresh_token";

export function persistSession(data: AuthTokens & { user: User }): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_ACCESS_KEY, data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem(AUTH_REFRESH_KEY, data.refreshToken);
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_ACCESS_KEY);
  localStorage.removeItem(AUTH_REFRESH_KEY);
}
