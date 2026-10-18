import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TelegramLead } from '@/lib/telegram';

const lead: TelegramLead = {
  id: 7,
  name: 'Аня',
  phone: '+375291234567',
  interest: 'order',
  comment: 'помол под воронку',
  items: [
    { slug: 'ethiopia', qty: 2 },
    { slug: 'brazil', qty: 1 },
  ],
  subscription: true,
  attribution: {
    utmSource: 'instagram',
    utmMedium: 'social',
    utmCampaign: 'october',
    utmContent: 'reels-1',
    utmTerm: null,
    clickIdType: 'yclid',
    clickId: '1234567890',
    referrer: 'https://www.instagram.com/',
    landingPath: '/?utm_source=instagram',
    pageUrl: 'https://kvarta.by/#zayavka',
    userAgent: 'Vitest',
  },
};

/** Свежий импорт модуля с нужными env (env читается один раз при импорте). */
async function loadTelegram(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();

  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }

  return import('@/lib/telegram');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('notifyTelegram', () => {
  it('молча выключен, если TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID не заданы', async () => {
    const { notifyTelegram } = await loadTelegram();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(notifyTelegram(lead)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('молча выключен, если задан только токен', async () => {
    const { notifyTelegram } = await loadTelegram({ TELEGRAM_BOT_TOKEN: 'token' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(notifyTelegram(lead)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('отправляет sendMessage при заданных env, с таймаутом 2 с', async () => {
    const { notifyTelegram } = await loadTelegram({
      TELEGRAM_BOT_TOKEN: 'token-123',
      TELEGRAM_CHAT_ID: '-100500',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    vi.stubGlobal('fetch', fetchMock);

    await expect(notifyTelegram(lead)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).toHaveBeenCalledWith(2000);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/bottoken-123/sendMessage');
    expect(init.method).toBe('POST');
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.chat_id).toBe('-100500');
    expect(body.parse_mode).toBeUndefined();
    expect(body.text).toContain('Новая заявка №7');
    expect(body.text).toContain('Аня');
    expect(body.text).toContain('+375291234567');
  });

  it('ошибка сети логируется и возвращает false, не бросая исключение', async () => {
    const { notifyTelegram } = await loadTelegram({
      TELEGRAM_BOT_TOKEN: 'token',
      TELEGRAM_CHAT_ID: '42',
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(notifyTelegram(lead)).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('network down'));
  });

  it('ответ не 2xx логируется и возвращает false', async () => {
    const { notifyTelegram } = await loadTelegram({
      TELEGRAM_BOT_TOKEN: 'token',
      TELEGRAM_CHAT_ID: '42',
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));

    await expect(notifyTelegram(lead)).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('500'));
  });
});

describe('buildTelegramText', () => {
  it('собирает имя, телефон, интерес, сорта с суммой, подписку, источник, комментарий и id', async () => {
    const { buildTelegramText } = await loadTelegram();
    const text = buildTelegramText(lead);

    expect(text).toContain('Новая заявка №7');
    expect(text).toContain('Имя: Аня');
    expect(text).toContain('Телефон: +375291234567');
    expect(text).toContain('Интерес: заказ');
    expect(text).toContain('Эфиопия Иргачеффе, 2 шт = 64 BYN');
    expect(text).toContain('Бразилия Серрадо, 1 шт = 26 BYN');
    expect(text).toContain('Сумма: 90 BYN');
    expect(text).toContain('Подписка: да');
    expect(text).toContain('utm_source=instagram');
    expect(text).toContain('referrer=https://www.instagram.com/');
    expect(text).toContain('landing=/?utm_source=instagram');
    expect(text).toContain('Комментарий: помол под воронку');

    // Сообщение отправляется без parse_mode: markdown-символы не используем.
    expect(text).not.toContain('*');
    expect(text).not.toContain('`');
    expect(text).not.toContain('[');
    expect(text).not.toContain(']');
  });

  it('для вопроса без сортов не печатает блок заказа', async () => {
    const { buildTelegramText } = await loadTelegram();
    const text = buildTelegramText({
      ...lead,
      interest: 'question',
      items: [],
      subscription: false,
    });

    expect(text).toContain('Интерес: вопрос');
    expect(text).not.toContain('Сорта:');
    expect(text).not.toContain('Сумма:');
    expect(text).toContain('Подписка: нет');
  });
});
