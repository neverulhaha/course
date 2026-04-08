import { apiRequest } from "./client";
import { AUTH_REFRESH_KEY } from "./session";
import type { AuthTokens, User } from "./types";

export async function register(payload: {
  email: string;
  password: string;
  name: string;
}) {
  return apiRequest<AuthTokens & { user: User }>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export async function login(payload: { email: string; password: string }) {
  return apiRequest<AuthTokens & { user: User }>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export async function refresh(refreshToken: string) {
  return apiRequest<AuthTokens & { user: User }>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export async function logout() {
  const rt =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_REFRESH_KEY)
      : null;
  if (rt) {
    await apiRequest<void>("/auth/logout", {
      method: "POST",
      body: { refreshToken: rt },
    });
  }
}

export async function me() {
  return apiRequest<User>("/auth/me");
}

export async function forgotPassword(payload: { email: string }) {
  return apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export async function resetPassword(payload: { token: string; newPassword: string }) {
  return apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}
