# QA current scope: пример теста

Сценарий нужен для проверки, что QA оценивает только доступный контент, а не процент заполненности курса.

## Входные условия

- В курсе 10 уроков.
- Только 4 урока имеют непустые записи в `lesson_contents`.
- 6 уроков пока не имеют `lesson_contents`.
- Таблица `sources` для курса пуста.
- Запуск: `qa_scope=current` или обычный запуск QA для частично заполненного курса.

## Ожидаемое поведение

- `qa_scope.mode` становится `current`.
- В AI-промт передаются только 4 урока с контентом.
- 6 отсутствующих уроков не попадают в `issues` и не снижают `total_score`.
- `source_alignment_score=null`, потому что источников нет.
- В `recommendations` есть строка: `Сгенерировать недостающие 6 уроков`.

## Пример корректного JSON-ответа AI

```json
{
  "structure_score": 80,
  "coherence_score": 75,
  "level_match_score": 78,
  "source_alignment_score": null,
  "total_score": 78,
  "summary": "Проверены 4 урока из 10",
  "issues": [],
  "recommendations": ["Сгенерировать недостающие 6 уроков"],
  "suspicious_facts": [],
  "source_alignment": {
    "enabled": false,
    "only_source_mode": false,
    "summary": "",
    "unsupported_claims": []
  }
}
```
