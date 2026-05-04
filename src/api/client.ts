import { getAccessToken } from "@/services/auth.service";

const DEFAULT_BASE = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Relative to Vite proxy or absolute URL */
  baseUrl?: string;
};

/**
 * Thin fetch wrapper: JSON in/out, typed errors, single place for auth headers.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, baseUrl = DEFAULT_BASE, headers, ...rest } = options;

  const token =
    typeof window !== "undefined" ? await getAccessToken() : null;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body instanceof FormData || typeof body === "string" || body === undefined ? body : JSON.stringify(body),
  });

  const text = await res.text();
  const parsed = text ? (() => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  })() : undefined;

  if (!res.ok) {
    throw new ApiError(res.statusText || "Request failed", res.status, parsed);
  }

  return parsed as T;
}

/** Human-readable message from `{ error: { message } }` or fallback. */
export function apiErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const b = e.body;
    if (b && typeof b === "object" && b !== null && "error" in b) {
      const err = (b as { error?: { message?: string } }).error;
      if (typeof err?.message === "string") return err.message;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return "Что-то пошло не так";
}
