/**
 * Соглашение по сервисному слою (п. 8):
 * — мутации и списки: `{ ..., error: Error | null }`;
 * — read с сообщением для UI без throw: `{ ..., error: string | null }` (как раньше в проекте).
 * Не смешивать: при ошибке всегда явный `error`, без исключений для ожидаемых сбоев БД.
 */
export type ServiceMutationResult = { error: Error | null };
