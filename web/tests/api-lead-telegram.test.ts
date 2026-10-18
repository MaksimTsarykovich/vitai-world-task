import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'kvarta-tg-api-'));
const dbFile = join(dir, 'tg.db');

// env читается при импорте route/db — задаём до динамического импорта.
vi.stubEnv('DATABASE_PATH', dbFile);
vi.stubEnv('LEAD_RATE_LIMIT', '20');
vi.stubEnv('TRUST_PROXY', '0');
vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
vi.stubEnv('TELEGRAM_CHAT_ID', '42');

const { POST } = await import('@/app/api/lead/route');
const { getDb } = await import('@/lib/db');
const { resetLeadRateLimit } = await import('@/lib/rate-limit');

function phoneWith(seed: number): string {
  const tail = String(2_000_000 + seed).slice(-7);
  return `+375 44 ${tail.slice(0, 3)}-${tail.slice(3, 5)}-${tail.slice(5)}`;
}

function request(body: unknown): Request {
  const text = JSON.stringify(body);

  return new Request('http://localhost/api/lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(text, 'utf8')),
    },
    body: text,
  });
}

function telegramSent(id: number): number {
  const row = getDb().prepare('SELECT telegram_sent FROM leads WHERE id = ?').get(id) as
    | { telegram_sent: number }
    | undefined;

  return row?.telegram_sent ?? -1;
}

beforeEach(() => {
  resetLeadRateLimit();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe('POST /api/lead + Telegram', () => {
  it('отвечает 201 и после ответа пишет telegram_sent = 1 при успехе', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      request({
        name: 'Тест M4',
        phone: phoneWith(1),
        interest: 'order',
        items: [{ slug: 'ethiopia', qty: 1 }],
        subscription: true,
      }),
    );
    const payload = (await response.json()) as { id: number };

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => expect(telegramSent(payload.id)).toBe(1), {
      timeout: 5000,
      interval: 50,
    });
  });

  it('ошибка Telegram не ломает ответ и не пишет telegram_sent', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error('telegram down'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      request({
        name: 'Тест M4',
        phone: phoneWith(2),
        interest: 'question',
        comment: 'телеграм недоступен',
      }),
    );
    const payload = (await response.json()) as { id: number };

    expect(response.status).toBe(201);
    expect(payload.id).toBeTypeOf('number');

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
      interval: 50,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(telegramSent(payload.id)).toBe(0);
    expect(errorSpy).toHaveBeenCalled();
  });
});
