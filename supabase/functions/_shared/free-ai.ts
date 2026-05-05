export type FreeAiProvider = "openrouter";

export type FreeAiConfig = {
  provider: FreeAiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  useResponseFormat: boolean;
  siteUrl: string;
  appName: string;
};

export const DEFAULT_FREE_AI_MODEL = "openai/gpt-oss-120b:free";
export const FREE_AI_BASE_URL = "https://openrouter.ai/api/v1";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeAsciiHeader(value: unknown, fallback: string): string {
  const raw = clean(value) || fallback;
  return raw.replace(/[^\x20-\x7E]/g, "").slice(0, 120) || fallback;
}

function safeReferer(value: unknown): string {
  const raw = clean(value);
  if (!raw) return "https://course-rosy.vercel.app";
  try {
    const url = new URL(raw);
    return url.toString();
  } catch {
    return "https://course-rosy.vercel.app";
  }
}

export function isFreeOpenRouterModel(model: string): boolean {
  const value = clean(model);
  return value === "openrouter/free" || value.endsWith(":free");
}

function selectedFreeModel(): string {
  const requested = clean(Deno.env.get("OPENROUTER_FREE_MODEL")) || clean(Deno.env.get("AI_FREE_MODEL"));
  if (requested && isFreeOpenRouterModel(requested)) return requested;
  if (requested && !isFreeOpenRouterModel(requested)) {
    console.warn(`Blocked non-free OpenRouter model '${requested}'. Falling back to ${DEFAULT_FREE_AI_MODEL}.`);
  }
  return DEFAULT_FREE_AI_MODEL;
}

export function getFreeAiConfig(): FreeAiConfig {
  const responseFormatSetting = clean(Deno.env.get("AI_USE_RESPONSE_FORMAT")).toLowerCase();
  return {
    provider: "openrouter",
    baseUrl: FREE_AI_BASE_URL,
    apiKey: clean(Deno.env.get("OPENROUTER_API_KEY")) || clean(Deno.env.get("AI_API_KEY")),
    model: selectedFreeModel(),
    useResponseFormat: responseFormatSetting === "true",
    siteUrl: safeReferer(Deno.env.get("OPENROUTER_SITE_URL")),
    appName: safeAsciiHeader(Deno.env.get("OPENROUTER_APP_NAME"), "Diplom Course Generator"),
  };
}

export function buildFreeAiHeaders(config = getFreeAiConfig()): Record<string, string> {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": config.siteUrl,
    "X-Title": config.appName,
  };
}

export function freeAiDiagnostics(config = getFreeAiConfig()): Record<string, unknown> {
  return {
    provider: config.provider,
    base_url: config.baseUrl,
    model: config.model,
    free_only: true,
    paid_model_env_ignored: true,
    accepted_model_env: "OPENROUTER_FREE_MODEL or AI_FREE_MODEL; value must be openrouter/free or end with :free",
  };
}
