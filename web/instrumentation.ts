/**
 * Хук Next.js: выполняется один раз при старте серверного процесса.
 *
 * Пишем в лог, включён ли Telegram-дубль заявок, — иначе причину «бот молчит»
 * приходится выяснять вручную. Сами значения TELEGRAM_BOT_TOKEN и
 * TELEGRAM_CHAT_ID не логируем никогда, только имена переменных.
 *
 * Проверку включённости берём из lib/telegram (telegramEnabled), чтобы не
 * дублировать условие «заданы оба значения».
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const [{ env }, { telegramEnabled }] = await Promise.all([
    import('@/lib/env'),
    import('@/lib/telegram'),
  ]);

  if (telegramEnabled()) {
    console.info('[startup] Telegram-дубль: включён');
    return;
  }

  // telegramEnabled() === false ⇒ отсутствует хотя бы одна из переменных.
  const missing = (['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'] as const).filter(
    (name) => !env[name],
  );

  if (missing.length === 2) {
    console.info(
      '[startup] Telegram-дубль: выключен — не заданы TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID',
    );
    return;
  }

  console.info(`[startup] Telegram-дубль: выключен — не хватает ${missing[0]}`);
}
