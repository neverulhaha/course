const CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Войдите в систему.",
  UNAUTHORIZED_NO_AUTH_HEADER: "Войдите в систему и повторите действие.",
  FORBIDDEN: "У вас нет доступа к этому разделу.",
  COURSE_NOT_FOUND: "Курс не найден.",
  GENERATION_FAILED: "Не удалось выполнить генерацию. Попробуйте ещё раз.",
  AI_RESPONSE_INVALID: "ИИ вернул некорректный ответ. Повторите действие.",
  SOURCE_TOO_SHORT: "Источник слишком короткий для генерации.",
  QUIZ_NOT_FOUND: "Квиз не найден.",
  VERSION_NOT_FOUND: "Версия не найдена.",
  DATABASE_ERROR: "Не удалось сохранить данные. Попробуйте ещё раз.",
  INVALID_INPUT: "Проверьте введённые данные и повторите действие.",
  NOT_FOUND: "Данные не найдены.",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stripCodeSuffix(message: string) {
  return message.replace(/\s*\([A-Z0-9_:-]+\)\s*$/g, "").trim();
}

function fromCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  return CODE_MESSAGES[code.trim().toUpperCase()] ?? null;
}

function looksTechnical(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("jwt") || lower.includes("row-level security") || lower.includes("violates") || lower.includes("duplicate key") || lower.includes("foreign key") || lower.includes("null value") || lower.includes("syntaxerror") || lower.includes("stack") || message.trim().startsWith("{") || message.trim().startsWith("[");
}

function mapText(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized") || lower.includes("jwt") || lower.includes("session")) return "Войдите в систему.";
  if (lower.includes("forbidden") || lower.includes("permission") || lower.includes("row-level security") || lower.includes("нет доступа")) return "У вас нет доступа к этому разделу.";
  if (lower.includes("course_not_found") || lower.includes("курс не найден") || lower.includes("not_found")) return "Курс не найден.";
  if (lower.includes("quiz_not_found")) return "Квиз не найден.";
  if (lower.includes("version_not_found")) return "Версия не найдена.";
  if (lower.includes("source_too_short")) return "Источник слишком короткий для генерации.";
  if (lower.includes("ai_response_invalid")) return "ИИ вернул некорректный ответ. Повторите действие.";
  if (lower.includes("generation_failed")) return "Не удалось выполнить генерацию. Попробуйте ещё раз.";
  if (lower.includes("database") || lower.includes("duplicate key") || lower.includes("foreign key") || lower.includes("violates")) return "Не удалось сохранить данные. Попробуйте ещё раз.";
  if (lower.includes("failed to fetch") || lower.includes("network")) return "Не удалось связаться с сервером. Проверьте подключение и повторите действие.";
  return null;
}

export function toUserErrorMessage(error: unknown, fallback = "Не удалось выполнить действие. Попробуйте ещё раз.") {
  const root = asRecord(error);
  const nestedError = asRecord(root?.error);
  const nestedCode = fromCode(nestedError?.code);
  if (nestedCode) return nestedCode;
  const rootCode = fromCode(root?.code);
  if (rootCode) return rootCode;
  const candidates = [nestedError?.message, root?.message, error instanceof Error ? error.message : null, typeof error === "string" ? error : null];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const clean = stripCodeSuffix(candidate);
    if (!clean) continue;
    const mapped = mapText(clean);
    if (mapped) return mapped;
    if (!looksTechnical(clean)) return clean;
  }
  return fallback;
}
