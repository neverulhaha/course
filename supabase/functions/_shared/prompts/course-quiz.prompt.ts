export const COURSE_QUIZ_PROMPT = `Ты — методист и специалист по оценке знаний.

Сгенерируй итоговый квиз по всему курсу. Квиз должен проверять основные цели курса и ключевые результаты обучения.

Данные курса:
- Название курса: {{course_title}}
- Тема: {{course_topic}}
- Уровень: {{level}}
- Цель курса: {{course_goal}}
- Ожидаемые результаты курса: {{course_learning_outcomes}}

Структура и содержание курса:
{{course_structure_with_lessons}}

Требования:
1. Вопросы должны покрывать ключевые модули курса.
2. Не создавай вопросы по второстепенным деталям.
3. Вопросы должны проверять понимание, применение и связь тем между собой.
4. Не спрашивай о материале, которого нет в курсе.
5. Каждый вопрос должен иметь объяснение.
6. Неправильные варианты должны быть реалистичными.
7. Количество вопросов: {{question_count}}.
8. Тип вопросов: single_choice.
9. Уровень сложности должен соответствовать уровню курса.
10. Не делай все вопросы однотипными.

Верни только валидный JSON без markdown.

Формат ответа:
{
  "title": "string",
  "description": "string",
  "warnings": ["string"],
  "questions": [
    {
      "question_text": "string",
      "question_type": "single_choice",
      "explanation": "string",
      "related_lesson_title": "string",
      "options": [
        { "answer_text": "string", "is_correct": true },
        { "answer_text": "string", "is_correct": false },
        { "answer_text": "string", "is_correct": false },
        { "answer_text": "string", "is_correct": false }
      ]
    }
  ]
}`;
