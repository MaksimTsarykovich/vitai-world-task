import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'kvarta-api-'));
const dbFile = join(dir, 'api.db');

// Явные заглушки: тест не должен зависеть от окружения, из которого запущен.
vi.stubEnv('DATABASE_URL', `file:${dbFile}`);
vi.stubEnv('LEAD_RATE_LIMIT', '20');
vi.stubEnv('TRUST_PROXY', '0');
// Telegram выключен, иначе route попытается отправить заявку по-настоящему.
vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
vi.stubEnv('TELEGRAM_CHAT_ID', '');

const { POST, GET } = await import('@/app/api/lead/route');
const { getDb } = await import('@/lib/db');
const { resetLeadRateLimit } = await import('@/lib/rate-limit');

const validLead = {
  name: 'Аня',
  phone: '+375 29 123-45-67',
  interest: 'order',
  comment: 'помол под воронку',
  subscription: true,
  items: [{ slug: 'ethiopia', qty: 2 }],
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
    pageUrl: 'https://example.by/#zayavka',
  },
};

function phoneWith(seed: number): string {
  const tail = String(1_000_000 + seed).slice(-7);
  return `+375 29 ${tail.slice(0, 3)}-${tail.slice(3, 5)}-${tail.slice(5)}`;
}

function request(body: unknown, headers: Record<string, string> = {}): Request {
  const text = typeof body === 'string' ? body : JSON.stringify(body);

  return new Request('http://localhost/api/lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(text, 'utf8')),
      ...headers,
    },
    body: text,
  });
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  resetLeadRateLimit();
});

afterAll(async () => {
  (await getDb()).close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe('POST /api/lead', () => {
  it('201 сохраняет заявку и возвращает id + requestId', async () => {
    const response = await POST(request({ ...validLead, phone: phoneWith(1) }));
    const payload = await body(response);

    expect(response.status).toBe(201);
    expect(payload.status).toBe('ok');
    expect(typeof payload.id).toBe('number');
    expect(typeof payload.requestId).toBe('string');
    expect(response.headers.get('x-request-id')).toBe(payload.requestId);
  });

  it('200 duplicate на тот же телефон в другом формате', async () => {
    const first = await POST(request({ ...validLead, phone: '+375 29 555-44-33' }));
    const firstBody = await body(first);
    const second = await POST(request({ ...validLead, phone: '80295554433' }));
    const secondBody = await body(second);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(secondBody).toMatchObject({ status: 'duplicate', id: firstBody.id });
  });

  it('400 отдаёт ошибку поля без stack trace и SQL', async () => {
    const response = await POST(request({ ...validLead, phone: '+7 999 123-45-67' }));
    const payload = await body(response);

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      status: 'error',
      code: 'VALIDATION',
      fields: { phone: 'Введите белорусский номер: +375 29 123-45-67' },
    });
    expect(JSON.stringify(payload)).not.toMatch(/SQL|better-sqlite|stack/i);
  });

  it('413 на тело больше 16 КБ', async () => {
    const response = await POST(
      request({
        ...validLead,
        comment: 'x'.repeat(17 * 1024),
      }),
    );

    expect(response.status).toBe(413);
    expect(await body(response)).toEqual({
      status: 'error',
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('429 после лимита запросов и Retry-After', async () => {
    const phone = phoneWith(2);
    let response: Response | undefined;

    for (let i = 0; i < 21; i += 1) {
      response = await POST(request({ ...validLead, phone }));
    }

    expect(response?.status).toBe(429);
    expect(await body(response as Response)).toEqual({
      status: 'error',
      code: 'RATE_LIMIT',
    });
    expect(Number(response?.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('405 на GET с Allow: POST', async () => {
    const response = GET();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('500 при ошибке БД, с requestId и без деталей', async () => {
    const db = await getDb();
    await db.execute('ALTER TABLE leads RENAME TO leads_broken');

    try {
      const response = await POST(request({ ...validLead, phone: phoneWith(3) }));
      const payload = await body(response);

      expect(response.status).toBe(500);
      expect(payload).toMatchObject({ status: 'error', code: 'SERVER' });
      expect(typeof payload.requestId).toBe('string');
      expect(JSON.stringify(payload)).not.toMatch(/SQL|leads_broken|stack/i);
    } finally {
      await db.execute('ALTER TABLE leads_broken RENAME TO leads');
    }
  });

  it('сохраняет order_items, subscription и атрибуцию, fallback на заголовки', async () => {
    const phone = phoneWith(4);
    const response = await POST(
      request(
        {
          name: 'Аня',
          phone,
          interest: 'order',
          items: [
            { slug: 'ethiopia', qty: 2 },
            { slug: 'colombia', qty: 1 },
          ],
          subscription: true,
          attribution: { utmSource: 'yandex', clickIdType: 'yclid', clickId: '42' },
        },
        {
          Referer: 'https://yandex.by/search',
          'User-Agent': 'Vitest Browser',
        },
      ),
    );

    expect(response.status).toBe(201);

    const rows = await (
      await getDb()
    ).execute({
      sql: `SELECT order_items, subscription, utm_source, click_id_type, click_id, referrer, user_agent
            FROM leads WHERE phone = ?`,
      args: [phone.replace(/\D/g, '').replace(/^375/, '+375')],
    });
    const row = rows.rows[0];

    expect({
      order_items: row.order_items,
      subscription: row.subscription,
      utm_source: row.utm_source,
      click_id_type: row.click_id_type,
      click_id: row.click_id,
      referrer: row.referrer,
      user_agent: row.user_agent,
    }).toEqual({
      order_items: '[{"slug":"ethiopia","qty":2},{"slug":"colombia","qty":1}]',
      subscription: 1,
      utm_source: 'yandex',
      click_id_type: 'yclid',
      click_id: '42',
      referrer: 'https://yandex.by/search',
      user_agent: 'Vitest Browser',
    });
  });
});
