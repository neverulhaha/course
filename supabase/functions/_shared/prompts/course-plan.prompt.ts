export const COURSE_PLAN_PROMPT = `Ты — опытный методист и проектировщик образовательных программ.

Сгенерируй только структуру учебного курса. Не создавай полное содержание уроков, теорию, практику, чек-листы или квизы.

Параметры курса:
- Тема: {{topic}}
- Уровень: {{level}}
- Цель обучения: {{goal}}
- Длительность: {{duration}}
- Формат обучения: {{format}}
- Язык: {{language}}
- Тон изложения: {{tone}}
- Режим по источнику: {{source_mode}}
- Использовать только источник: {{only_source_mode}}
- Источник: {{source_text}}

Требования:
1. Курс должен иметь логичную последовательность от простого к сложному.
2. Каждый модуль должен иметь понятное название и краткое описание.
3. Каждый урок должен иметь название, цель, краткое описание, ожидаемый результат и примерную длительность.
4. Добавь recommended_blocks — какие блоки могут понадобиться при будущей генерации урока.
5. Не добавляй лишние модули ради объёма.
6. Не используй общие и пустые формулировки.
7. Если используется источник, план должен опираться на него.
8. Если включён режим “использовать только источник”, не добавляй темы, которых нет в источнике.

Верни только валидный JSON без markdown.

Формат:
{
  "course": {
    "title": "string",
    "description": "string",
    "level": "string",
    "estimated_duration": "string",
    "learning_outcomes": ["string"]
  },
  "course_title": "string",
  "course_summary": "string",
  "warnings": ["string"],
  "modules": [
    {
      "title": "string",
      "description": "string",
      "position": 1,
      "estimated_duration": "string",
      "practice_required": true,
      "lessons": [
        {
          "title": "string",
          "position": 1,
          "objective": "string",
          "summary": "string",
          "estimated_duration": "string",
          "learning_outcome": "string",
          "recommended_blocks": ["explanation", "example", "practice", "summary"]
        }
      ]
    }
  ],
  "qa_notes": ["string"]
}`;
