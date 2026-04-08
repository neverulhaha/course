export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "EMAIL_ALREADY_REGISTERED"
  | "RATE_LIMITED"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorBody(err: unknown): {
  status: number;
  body: { error: { code: ErrorCode; message: string; details?: unknown } };
} {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
    };
  }

  console.error(err);
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR" as const,
        message: "An unexpected error occurred",
      },
    },
  };
}
