import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

type CreateLessonPayload = {
  module_id: string;
  title: string;
  position: number;
  estimated_duration: number;
  learning_outcome: string;
  owner_id: string;
};

class HttpError extends Error {
  code: string;
  status: number;
  details?: JsonRecord;

  constructor(code: string, message: string, status = 400, details?: JsonRecord) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? {},
        },
      },
      error.status,
    );
  }

  console.error("Unhandled create-lesson error", error);
  return jsonResponse(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Внутренняя ошибка функции",
        details: {},
      },
    },
    500,
  );
}

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError("SERVER_NOT_CONFIGURED", `Не задана переменная окружения ${name}`, 500);
  }
  return value;
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !uuidRe.test(value.trim())) {
    throw new HttpError("INVALID_INPUT", `Поле ${field} должно быть UUID`, 400, { field });
  }
  return value.trim();
}

function asRequiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new HttpError("INVALID_INPUT", `Поле ${field} должно быть строкой`, 400, { field });
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError("INVALID_INPUT", `Поле ${field} обязательно`, 400, { field });
  }

  if (trimmed.length > maxLength) {
    throw new HttpError("INVALID_INPUT", `Поле ${field} слишком длинное`, 400, { field, maxLength });
  }

  return trimmed;
}

function asInteger(value: unknown, field: string, minValue: number) {
  const numericValue = typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof numericValue !== "number" || !Number.isInteger(numericValue) || numericValue < minValue) {
    throw new HttpError("INVALID_INPUT", `Поле ${field} должно быть целым числом от ${minValue}`, 400, { field, minValue });
  }

  return numericValue;
}

async function readJson(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Body must be an object");
    }
    return body as JsonRecord;
  } catch (_error) {
    throw new HttpError("INVALID_JSON", "Некорректный JSON body", 400);
  }
}

function validatePayload(body: JsonRecord): CreateLessonPayload {
  return {
    module_id: asUuid(body.module_id, "module_id"),
    title: asRequiredString(body.title, "title", 255),
    position: asInteger(body.position, "position", 1),
    estimated_duration: asInteger(body.estimated_duration, "estimated_duration", 0),
    learning_outcome: asRequiredString(body.learning_outcome, "learning_outcome", 2000),
    owner_id: asUuid(body.owner_id, "owner_id"),
  };
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) {
    throw new HttpError("UNAUTHORIZED", "Нужен заголовок Authorization: Bearer <JWT>", 401);
  }

  return match[1].trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(new HttpError("METHOD_NOT_ALLOWED", "Метод не поддерживается", 405));
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const token = getBearerToken(req);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      throw new HttpError("UNAUTHORIZED", "JWT пользователя недействителен или истек", 401);
    }

    const body = await readJson(req);
    const payload = validatePayload(body);

    if (authData.user.id !== payload.owner_id) {
      throw new HttpError("FORBIDDEN", "owner_id не совпадает с авторизованным пользователем", 403, {
        owner_id: payload.owner_id,
      });
    }

    const { data: moduleRow, error: moduleError } = await supabaseAdmin
      .from("modules")
      .select("id, course_id")
      .eq("id", payload.module_id)
      .maybeSingle();

    if (moduleError) {
      throw new HttpError("DATABASE_ERROR", "Не удалось проверить модуль", 500, { message: moduleError.message });
    }

    if (!moduleRow) {
      throw new HttpError("MODULE_NOT_FOUND", "Модуль не найден", 404, { module_id: payload.module_id });
    }

    const { data: courseRow, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id, author_id")
      .eq("id", moduleRow.course_id)
      .eq("author_id", payload.owner_id)
      .maybeSingle();

    if (courseError) {
      throw new HttpError("DATABASE_ERROR", "Не удалось проверить владельца курса", 500, { message: courseError.message });
    }

    if (!courseRow) {
      throw new HttpError("FORBIDDEN", "Пользователь не является автором курса, к которому относится модуль", 403, {
        module_id: payload.module_id,
      });
    }

    const { data: lesson, error: insertError } = await supabaseAdmin
      .from("lessons")
      .insert({
        module_id: payload.module_id,
        title: payload.title,
        position: payload.position,
        estimated_duration: payload.estimated_duration,
        learning_outcome: payload.learning_outcome,
        content_status: "empty",
      })
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        throw new HttpError("LESSON_POSITION_CONFLICT", "Урок с такой позицией уже существует в модуле", 409, {
          message: insertError.message,
        });
      }

      throw new HttpError("DATABASE_ERROR", "Не удалось создать урок", 500, { message: insertError.message });
    }

    return jsonResponse({ lesson }, 201);
  } catch (error) {
    return errorResponse(error);
  }
});
