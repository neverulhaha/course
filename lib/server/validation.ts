import { z } from "zod";
import { AppError } from "./errors.js";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email format")
  .max(320, "Email is too long")
  .transform((s: string) => s.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit");

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(255, "Name is too long");

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "token is required"),
  newPassword: passwordSchema,
});

export function parseBody<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown
): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid request body",
      400,
      r.error.flatten()
    );
  }
  return r.data;
}
