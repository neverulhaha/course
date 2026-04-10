import { z } from "zod";
import { AppError } from "./errors.js";

/** Спецсимволы для пароля (латиница + классические символы). */
const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{}|;:,.?/`~]/;

const emailSchema = z
  .string()
  .trim()
  .min(1, "Укажите email")
  .email("Некорректный формат email")
  .max(320, "Email слишком длинный")
  .refine(
    (s) => !/\s/.test(s),
    "Email не должен содержать пробелы"
  )
  .transform((s: string) => s.toLowerCase());

const strongPasswordSchema = z
  .string()
  .min(10, "Пароль не короче 10 символов")
  .max(128, "Пароль не длиннее 128 символов")
  .refine((s) => s === s.trim(), "Уберите пробелы в начале и в конце пароля")
  .refine((s) => /[a-z]/.test(s), "Нужна хотя бы одна строчная латинская буква (a–z)")
  .refine((s) => /[A-Z]/.test(s), "Нужна хотя бы одна заглавная латинская буква (A–Z)")
  .refine((s) => /[0-9]/.test(s), "Нужна хотя бы одна цифра")
  .refine(
    (s) => PASSWORD_SPECIAL.test(s),
    "Нужен хотя бы один спецсимвол: !@#$%^&*()_+-=[]{}|;:,.?/`~"
  )
  .refine(
    (s) => !/(.)\1{4,}/.test(s),
    "Не более четырёх одинаковых символов подряд"
  )
  .refine(
    (s) => /[a-zA-Z]/.test(s.replace(/[^a-zA-Z]/g, "")) && s.replace(/[^a-zA-Z]/g, "").length >= 3,
    "В пароле должно быть минимум 3 латинские буквы (не только цифры и символы)"
  );

const registerNameSchema = z
  .string()
  .trim()
  .min(2, "Имя — минимум 2 символа")
  .max(64, "Имя не длиннее 64 символов")
  .refine(
    (s) => /^[\p{L}]([\p{L}\s\-'.]*[\p{L}])?$/u.test(s),
    "Имя: только буквы (в т.ч. кириллица), пробел, дефис, точка, апостроф; начинается и заканчивается буквой"
  )
  .refine((s) => /[\p{L}]/u.test(s), "В имени должны быть буквы")
  .refine(
    (s) => (s.match(/[\p{L}]/gu) ?? []).length >= 2,
    "В имени минимум две буквы"
  )
  .refine((s) => !/^\d+$/.test(s), "Имя не может состоять только из цифр")
  .refine((s) => !/<|>|\/|\\|\{|\}/.test(s), "Недопустимые символы в имени");

export const registerBodySchema = z
  .object({
    email: emailSchema,
    password: strongPasswordSchema,
    name: registerNameSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const lower = data.password.toLowerCase();
    const emailLocal = data.email.split("@")[0] ?? "";
    if (emailLocal.length >= 3 && lower.includes(emailLocal.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Пароль не должен содержать локальную часть email",
      });
    }
    if (lower.includes(data.name.toLowerCase().replace(/\s+/g, "")) && data.name.length >= 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Пароль не должен содержать ваше имя",
      });
    }
  });

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Введите пароль")
    .max(200, "Слишком длинное значение"),
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1, "Нужен refresh-токен"),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, "Нужен refresh-токен"),
});

/** Только email — проверка перед signUp в Supabase (без пароля). */
export const signupEmailCheckBodySchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Нужен токен сброса"),
  newPassword: strongPasswordSchema,
});

function firstFlattenedMessage(
  flat: ReturnType<z.ZodError["flatten"]>
): string {
  const order = [
    "email",
    "name",
    "password",
    "newPassword",
    "token",
    "refreshToken",
  ];
  for (const k of order) {
    const msgs = flat.fieldErrors[k as keyof typeof flat.fieldErrors];
    if (Array.isArray(msgs)) {
      for (const m of msgs) {
        if (typeof m === "string" && m.length > 0) return m;
      }
    }
  }
  for (const msgs of Object.values(flat.fieldErrors)) {
    if (Array.isArray(msgs)) {
      for (const m of msgs) {
        if (typeof m === "string" && m.length > 0) return m;
      }
    }
  }
  for (const m of flat.formErrors) {
    if (typeof m === "string" && m.length > 0) return m;
  }
  return "Проверьте данные в форме";
}

export function parseBody<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown
): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const flat = r.error.flatten();
    throw new AppError(
      "VALIDATION_ERROR",
      firstFlattenedMessage(flat),
      400,
      flat
    );
  }
  return r.data;
}
