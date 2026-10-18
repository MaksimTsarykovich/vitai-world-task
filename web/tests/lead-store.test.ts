import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '@/lib/db';
import { saveLead, type SaveLeadInput } from '@/lib/lead-store';

const dir = mkdtempSync(join(tmpdir(), 'kvarta-dedup-'));
let db: Db;

beforeEach(async () => {
  db = await openDatabase(`file:${join(dir, `dedup-${Date.now()}-${Math.random()}.db`)}`);
});

afterEach(() => {
  db.close();
});

function input(overrides: Partial<SaveLeadInput> = {}): SaveLeadInput {
  return {
    requestId: 'req-test',
    name: 'Аня',
    phone: '+375291234567',
    interest: 'order',
    comment: 'помол под воронку',
    items: [{ slug: 'ethiopia', qty: 2 }],
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
      pageUrl: 'https://example.by/#zayavka',
      userAgent: 'vitest',
    },
    ...overrides,
  };
}

async function insertExisting(db: Db, phone: string, secondsAgo: number): Promise<number> {
  const at = await db.execute({
    sql: "SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now',?) AS at",
    args: [`-${secondsAgo} seconds`],
  });
  const createdAt = String(at.rows[0]?.at);

  const result = await db.execute({
    sql: `INSERT INTO leads (created_at, request_id, name, phone, interest)
          VALUES (?, ?, ?, ?, ?)`,
    args: [createdAt, `old-${secondsAgo}`, 'Старая', phone, 'question'],
  });

  return Number(result.lastInsertRowid);
}

async function count(db: Db, phone: string): Promise<number> {
  const result = await db.execute({
    sql: 'SELECT count(*) AS n FROM leads WHERE phone = ?',
    args: [phone],
  });

  return Number(result.rows[0]?.n);
}

describe('Дедупликация заявок', () => {
  it('сохраняет заявку с заказом, подпиской и атрибуцией', async () => {
    const result = await saveLead(db, input());

    expect(result.kind).toBe('created');
    expect(await count(db, '+375291234567')).toBe(1);

    const rows = await db.execute({
      sql: `SELECT phone, order_items, subscription, utm_source, click_id_type, click_id, referrer,
                   landing_path, page_url, user_agent
            FROM leads WHERE id = ?`,
      args: [result.id],
    });
    const row = rows.rows[0];

    expect({
      phone: row.phone,
      order_items: row.order_items,
      subscription: row.subscription,
      utm_source: row.utm_source,
      click_id_type: row.click_id_type,
      click_id: row.click_id,
      referrer: row.referrer,
      landing_path: row.landing_path,
      page_url: row.page_url,
      user_agent: row.user_agent,
    }).toEqual({
      phone: '+375291234567',
      order_items: '[{"slug":"ethiopia","qty":2}]',
      subscription: 1,
      utm_source: 'instagram',
      click_id_type: 'yclid',
      click_id: '1234567890',
      referrer: 'https://www.instagram.com/',
      landing_path: '/?utm_source=instagram',
      page_url: 'https://example.by/#zayavka',
      user_agent: 'vitest',
    });
  });

  it('возвращает id существующей заявки в окне 10 минут', async () => {
    const first = await saveLead(db, input());
    const second = await saveLead(db, { ...input(), requestId: 'req-second', name: 'Другая' });

    expect(first.kind).toBe('created');
    expect(second).toEqual({ kind: 'duplicate', id: first.id });
    expect(await count(db, '+375291234567')).toBe(1);
  });

  it('на границе 9:59 — дубликат, на 10:01 — новая заявка', async () => {
    const phone = '+375291112233';

    await insertExisting(db, phone, 9 * 60 + 59);
    const within = await saveLead(db, input({ phone }));
    expect(within.kind).toBe('duplicate');
    expect(await count(db, phone)).toBe(1);

    await db.execute({ sql: 'DELETE FROM leads WHERE phone = ?', args: [phone] });
    await insertExisting(db, phone, 10 * 60 + 1);
    const after = await saveLead(db, input({ phone, requestId: 'after-window' }));
    expect(after.kind).toBe('created');
    expect(await count(db, phone)).toBe(2);
  });

  it('10 параллельных промисов создают одну строку', async () => {
    const phone = '+375293334455';

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        saveLead(db, input({ phone, requestId: `parallel-${index}` })),
      ),
    );

    expect(results.filter((result) => result.kind === 'created')).toHaveLength(1);
    expect(results.filter((result) => result.kind === 'duplicate')).toHaveLength(9);
    expect(new Set(results.map((result) => result.id)).size).toBe(1);
    expect(await count(db, phone)).toBe(1);
  });

  it('разные телефоны создают разные строки', async () => {
    const first = await saveLead(db, input({ phone: '+375291111111', requestId: 'one' }));
    const second = await saveLead(db, input({ phone: '+375292222222', requestId: 'two' }));

    expect(first.kind).toBe('created');
    expect(second.kind).toBe('created');
    expect(first.id).not.toBe(second.id);
    expect(await count(db, '+375291111111')).toBe(1);
    expect(await count(db, '+375292222222')).toBe(1);
  });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});
