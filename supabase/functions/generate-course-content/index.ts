import { corsHeaders, jsonResponse } from "../_shared/generation-session.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  return jsonResponse({
    error: {
      code: "MASS_GENERATION_DISABLED",
      message: "Массовая генерация уроков отключена. Откройте конкретный урок и нажмите «Сгенерировать урок».",
      details: { generation_target: "single_lesson" },
    },
  }, 410);
});
