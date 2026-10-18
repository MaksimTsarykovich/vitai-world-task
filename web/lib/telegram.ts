import { env } from '@/lib/env';
import type { LeadItem } from '@/lib/lead-schema';
import type { LeadAttributionRow } from '@/lib/lead-store';
import { findProduct } from '@/lib/products';

/**
 * Дубль заявки в Telegram — необязательный плюс к ТЗ. Отправляем простым
 * текстом без markdown, чтобы специальные символы в имени или комментарии не
 * ломали сообщение. Модуль намеренно не бросает исключений наружу: сбой
 * Telegram не должен влиять на приём заявки.
 */
export type TelegramLead = {
  id: number;
  name: string;
  phone: string;
  interest: 'question' | 'order';
  comment: string | null;
  items: LeadItem[];
  subscription: boolean;
  attribution: LeadAttributionRow;
};

export const TELEGRAM_TIMEOUT_MS = 2000;

const INTEREST_LABELS: Record<TelegramLead['interest'], string> = {
  question: 'вопрос',
  order: 'заказ',
};

/** Включён ли дубль: нужны оба значения — токен бота и id чата. */
export function telegramEnabled(
  source: { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string } = env,
): boolean {
  return Boolean(source.TELEGRAM_BOT_TOKEN && source.TELEGRAM_CHAT_ID);
}

function orderLines(items: LeadItem[]): string[] {
  return items.map((item) => {
    const product = findProduct(item.slug);
    const name = product?.name ?? item.slug;
    const price = product ? ` = ${product.price * item.qty} BYN` : '';

    return `- ${name}, ${item.qty} шт${price}`;
  });
}

function attributionLine(attribution: LeadAttributionRow): string {
  const parts: string[] = [];
  const utm: Array<[string, string | null]> = [
    ['utm_source', attribution.utmSource],
    ['utm_medium', attribution.utmMedium],
    ['utm_campaign', attribution.utmCampaign],
    ['utm_content', attribution.utmContent],
    ['utm_term', attribution.utmTerm],
  ];

  for (const [key, value] of utm) {
    if (value) parts.push(`${key}=${value}`);
  }

  if (attribution.clickId) {
    const prefix = attribution.clickIdType ? `${attribution.clickIdType}:` : '';
    parts.push(`click_id=${prefix}${attribution.clickId}`);
  }

  if (attribution.referrer) parts.push(`referrer=${attribution.referrer}`);
  if (attribution.landingPath) parts.push(`landing=${attribution.landingPath}`);

  return parts.length > 0 ? parts.join(', ') : 'прямой заход';
}

/** Текст сообщения: имя, телефон, интерес, сорта с суммой, подписка, источник, комментарий, id. */
export function buildTelegramText(lead: TelegramLead): string {
  const lines = [
    `Новая заявка №${lead.id}`,
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Интерес: ${INTEREST_LABELS[lead.interest] ?? lead.interest}`,
  ];

  if (lead.items.length > 0) {
    const sum = lead.items.reduce((total, item) => {
      const product = findProduct(item.slug);
      return total + (product ? product.price * item.qty : 0);
    }, 0);

    lines.push('Сорта:');
    lines.push(...orderLines(lead.items));
    lines.push(`Сумма: ${sum} BYN`);
  }

  lines.push(`Подписка: ${lead.subscription ? 'да' : 'нет'}`);
  lines.push(`Источник: ${attributionLine(lead.attribution)}`);

  if (lead.comment) lines.push(`Комментарий: ${lead.comment}`);

  return lines.join('\n');
}

export type NotifyTelegramOptions = {
  /** Мок fetch в тестах; по умолчанию — глобальный fetch. */
  fetchImpl?: typeof fetch;
};

/**
 * Отправляет POST https://api.telegram.org/bot<token>/sendMessage.
 * Возвращает true только при успешном ответе API. Без обоих env — молча
 * выключено. Ошибка отправки логируется и превращается в false.
 */
export async function notifyTelegram(
  lead: TelegramLead,
  options: NotifyTelegramOptions = {},
): Promise<boolean> {
  if (!telegramEnabled()) return false;

  const token = env.TELEGRAM_BOT_TOKEN as string;
  const chatId = env.TELEGRAM_CHAT_ID as string;
  const doFetch = options.fetchImpl ?? fetch;

  try {
    const response = await doFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildTelegramText(lead),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[telegram] отправка не удалась: статус ${response.status}, заявка №${lead.id}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[telegram] ошибка отправки, заявка №${lead.id}: ${
        error instanceof Error ? error.message : 'unknown'
      }`,
    );
    return false;
  }
}
