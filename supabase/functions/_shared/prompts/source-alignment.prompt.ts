export const SOURCE_ALIGNMENT_PROMPT = `Ты — эксперт по проверке соответствия учебного материала источнику.

Проверь, насколько курс опирается на переданный источник.

Источник:
{{source_text}}

Содержание курса:
{{course_content}}

Режим:
- Использовать только источник: {{only_source_mode}}

Проверь:
1. Какие ключевые тезисы курса подтверждаются источником.
2. Какие тезисы не имеют явной опоры на источник.
3. Где материал слишком сильно расширяет источник.
4. Есть ли утверждения, которые противоречат источнику.
5. Какие места нужно пометить как рискованные.
6. Если включён режим “использовать только источник”, оцени особенно строго.

Верни только валидный JSON без markdown.

Формат:
{
  "source_alignment": {
    "score": 0,
    "supported_claims": [
      {
        "course_place": "string",
        "claim": "string",
        "source_fragment": "string"
      }
    ],
    "unsupported_claims": [
      {
        "course_place": "string",
        "claim": "string",
        "reason": "string"
      }
    ],
    "contradictions": [
      {
        "course_place": "string",
        "claim": "string",
        "source_fragment": "string",
        "reason": "string"
      }
    ],
    "recommendations": ["string"]
  }
}`;
