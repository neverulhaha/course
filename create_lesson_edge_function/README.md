# create_lesson_edge_function

Supabase Edge Function для безопасного создания урока автором курса через фронтенд.

Функция:

- принимает только `POST`;
- ожидает `Authorization: Bearer <JWT пользователя>`;
- использует `SUPABASE_SERVICE_ROLE_KEY`, чтобы обходить RLS на сервере;
- не доверяет `owner_id` из body без проверки;
- проверяет, что `owner_id` совпадает с пользователем из JWT;
- проверяет, что `module_id` относится к курсу этого автора;
- создаёт запись в `lessons` с `content_status = 'empty'`;
- возвращает созданный урок в JSON.

## Структура

```text
create_lesson_edge_function/
├─ index.ts
├─ package.json
└─ README.md
```

## Переменные окружения

В Supabase должны быть доступны секреты:

```bash
supabase secrets set \
  SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>" \
  --project-ref <PROJECT_REF>
```

`SUPABASE_SERVICE_ROLE_KEY` нельзя хранить во фронтенде. Он используется только внутри Edge Function.

## Установка в существующий Supabase-проект

Если функция лежит отдельно в папке `create_lesson_edge_function`, скопируйте `index.ts` в стандартную папку Supabase Functions:

```bash
mkdir -p supabase/functions/create-lesson
cp create_lesson_edge_function/index.ts supabase/functions/create-lesson/index.ts
```

## Локальный запуск

```bash
supabase functions serve create-lesson --env-file .env.local --no-verify-jwt
```

Пример `.env.local`:

```env
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

## Деплой

Рекомендуемый вариант — отключить gateway JWT-проверку и проверять JWT внутри функции. Это нужно, чтобы CORS/preflight и кастомные ошибки работали предсказуемо. Без `Authorization: Bearer <JWT>` функция всё равно вернёт `401`.

```bash
supabase functions deploy create-lesson --project-ref <PROJECT_REF> --no-verify-jwt
```

Альтернативно можно включить проверку JWT на уровне Supabase Gateway, но тогда preflight/ошибки авторизации могут обрабатываться до входа в функцию:

```bash
supabase functions deploy create-lesson --project-ref <PROJECT_REF>
```

## Формат запроса

```json
{
  "module_id": "00000000-0000-4000-8000-000000000001",
  "title": "Введение в тему",
  "position": 1,
  "estimated_duration": 30,
  "learning_outcome": "Пользователь понимает базовые понятия урока",
  "owner_id": "00000000-0000-4000-8000-000000000002"
}
```

## Пример вызова из фронтенда

```ts
import { supabase } from "./supabaseClient";

const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

if (sessionError || !sessionData.session) {
  throw new Error("Пользователь не авторизован");
}

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-lesson`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      module_id: "00000000-0000-4000-8000-000000000001",
      title: "Введение в тему",
      position: 1,
      estimated_duration: 30,
      learning_outcome: "Пользователь понимает базовые понятия урока",
      owner_id: sessionData.session.user.id,
    }),
  },
);

const result = await response.json();

if (!response.ok) {
  throw new Error(result.error?.message ?? "Не удалось создать урок");
}

console.log("Созданный урок:", result.lesson);
```

## Пример curl

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/create-lesson" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "module_id": "00000000-0000-4000-8000-000000000001",
    "title": "Введение в тему",
    "position": 1,
    "estimated_duration": 30,
    "learning_outcome": "Пользователь понимает базовые понятия урока",
    "owner_id": "00000000-0000-4000-8000-000000000002"
  }'
```

## Успешный ответ

```json
{
  "lesson": {
    "id": "...",
    "module_id": "...",
    "title": "Введение в тему",
    "position": 1,
    "objective": null,
    "summary": null,
    "estimated_duration": 30,
    "learning_outcome": "Пользователь понимает базовые понятия урока",
    "content_status": "empty",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

## Ошибки

Функция возвращает ошибки в едином формате:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Пользователь не является автором курса, к которому относится модуль",
    "details": {
      "module_id": "..."
    }
  }
}
```

Основные коды:

- `UNAUTHORIZED` — нет JWT или JWT недействителен;
- `FORBIDDEN` — пользователь не владеет курсом/модулем;
- `MODULE_NOT_FOUND` — модуль не найден;
- `INVALID_INPUT` — неверные поля запроса;
- `LESSON_POSITION_CONFLICT` — конфликт позиции урока;
- `DATABASE_ERROR` — ошибка базы данных.
