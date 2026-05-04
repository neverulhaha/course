export const LESSON_QUIZ_PROMPT = `Ты — методист и автор проверочных заданий.

Сгенерируй квиз по одному уроку. Вопросы должны проверять понимание материала урока, а не случайные факты.

Данные курса:
- Название курса: {{course_title}}
- Уровень: {{level}}
- Цель курса: {{course_goal}}

Данные урока:
- Название урока: {{lesson_title}}
- Цель урока: {{lesson_objective}}
- Ожидаемый результат: {{learning_outcome}}

Содержание урока:
{{lesson_blocks}}

Требования:
1. Создай вопросы только по материалу этого урока.
2. Не спрашивай о том, чего нет в уроке.
3. Вопросы должны проверять понимание, применение и ключевые выводы.
4. Неправильные варианты должны быть правдоподобными.
5. Не используй очевидные варианты вроде “всё вышеперечисленное”, если они делают вопрос слишком простым.
6. Каждый вопрос должен иметь объяснение правильного ответа.
7. Количество вопросов: {{question_count}}.
8. Тип вопросов: single_choice.
9. Уровень сложности должен соответствовать уровню курса.

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
      "options": [
        { "answer_text": "string", "is_correct": true },
        { "answer_text": "string", "is_correct": false },
        { "answer_text": "string", "is_correct": false },
        { "answer_text": "string", "is_correct": false }
      ]
    }
  ]
}`;
