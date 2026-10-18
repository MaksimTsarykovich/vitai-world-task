import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, openDatabase } from '@/lib/db';

const dir = mkdtempSync(join(tmpdir(), 'kvarta-migration-'));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const V1_SCHEMA = `
CREATE TABLE leads (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  request_id     TEXT NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  interest       TEXT NOT NULL CHECK (interest IN ('subscription','order','question')),
  comment        TEXT,
  utm_source     TEXT,
  utm_medium     TEXT,
  utm_campaign   TEXT,
  utm_content    TEXT,
  utm_term       TEXT,
  click_id_type  TEXT,
  click_id       TEXT,
  referrer       TEXT,
  landing_path   TEXT,
  page_url       TEXT,
  user_agent     TEXT,
  telegram_sent  INTEGER NOT NULL DEFAULT 0
);
PRAGMA user_version = 1;
`;

describe('Миграция v1 → v2', () => {
  it('добавляет колонки на существующей базе и сохраняет строки', () => {
    const file = join(dir, 'legacy.db');
    const legacy = new Database(file);
    legacy.exec(V1_SCHEMA);
    legacy
      .prepare(
        `INSERT INTO leads (request_id, name, phone, interest, comment)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run('legacy-1', 'Старая Аня', '+375291111111', 'question', 'старый вопрос');
    legacy.close();

    const db = openDatabase(file);
    const columns = (
      db.prepare('PRAGMA table_info(leads)').all() as Array<{ name: string }>
    ).map((column) => column.name);

    expect(columns).toContain('order_items');
    expect(columns).toContain('subscription');
    expect(Number(db.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(2);

    expect(
      db
        .prepare('SELECT name, phone, comment, order_items, subscription FROM leads WHERE id = 1')
        .get(),
    ).toEqual({
      name: 'Старая Аня',
      phone: '+375291111111',
      comment: 'старый вопрос',
      order_items: null,
      subscription: 0,
    });
    db.close();
  });

  it('идемпотентна: повторное открытие не падает и не меняет данные', () => {
    const file = join(dir, 'legacy.db');

    for (let i = 0; i < 3; i += 1) {
      const db = openDatabase(file);

      expect(Number(db.pragma('user_version', { simple: true }))).toBe(2);
      expect(
        (db.prepare('SELECT count(*) AS n FROM leads').get() as { n: number }).n,
      ).toBe(1);
      db.close();
    }
  });

  it('на чистой базе сразу создаёт полную схему v2', () => {
    const file = join(dir, 'clean.db');
    const db = openDatabase(file);
    const columns = (
      db.prepare('PRAGMA table_info(leads)').all() as Array<{ name: string }>
    ).map((column) => column.name);

    expect(columns).toContain('order_items');
    expect(columns).toContain('subscription');
    expect(Number(db.pragma('user_version', { simple: true }))).toBe(2);
    db.close();
  });
});
