import { after } from 'next/server';

/**
 * Планирует работу после отправки ответа через `after()` из `next/server` —
 * так Telegram не влияет на время ответа пользователю.
 *
 * Вне request scope (юнит-тесты, которые вызывают обработчик напрямую, и CLI)
 * `after()` бросает исключение. В этом случае выполняем задачу сразу, чтобы
 * поведение оставалось проверяемым без поднятия сервера.
 */
export function scheduleAfterResponse(task: () => void | Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}
