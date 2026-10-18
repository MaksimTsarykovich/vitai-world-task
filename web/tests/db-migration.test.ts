import { createClient, type Client, type InStatement } from '@libsql/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, openDatabase, readSchemaVersion } from '@/lib/db';
import { applyMigrations } from '@/lib/schema.mjs';

const dir = mkdtempSync(join(tmpdir(), 'kvarta-migration-'));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Схема v1: без order_items/subscription — их должна добавить миграция. */
const V1_CREATE_TABLE = `
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
)`;

async function columns(db: Awaited<ReturnType<typeof openDatabase>>): Promise<string[]> {
  const result = await db.execute('PRAGMA table_info(leads)');
  return result.rows.map((row) => String(row.name));
}

/**
 * Обёртка над клиентом, которая, как Turso Cloud, отклоняет любой statement
 * вида `PRAGMA user_version = N` (SQL_PARSE_ERROR). Всё остальное проксируется.
 */
function strictTursoClient(client: Client): Client {
  const assertAllowed = (statement: InStatement): void => {
    const sql = typeof statement === 'string' ? statement : statement.sql;

    if (/^\s*PRAGMA\s+user_version\s*=/i.test(sql)) {
      throw new Error('SQL_PARSE_ERROR: SQL not allowed statement: PRAGMA user_version = 2');
    }
  };

  return {
    execute: (statement: InStatement) => {
      assertAllowed(statement);
      return client.execute(statement);
    },
    batch: (statements: InStatement[], mode?: Parameters<Client['batch']>[1]) => {
      statements.forEach(assertAllowed);
      return client.batch(statements, mode);
    },
    close: () => client.close(),
  } as unknown as Client;
}

describe('Миграция v1 → v2', () => {
  it('добавляет колонки на существующей базе и сохраняет строки', async () => {
    const url = `file:${join(dir, 'legacy.db')}`;

    const legacy = createClient({ url });
    await legacy.batch([V1_CREATE_TABLE], 'write');
    await legacy.execute({
      sql: `INSERT INTO leads (request_id, name, phone, interest, comment)
            VALUES (?, ?, ?, ?, ?)`,
      args: ['legacy-1', 'Старая Аня', '+375291111111', 'question', 'старый вопрос'],
    });
    await legacy.execute('PRAGMA user_version = 1');
    legacy.close();

    const db = await openDatabase(url);
    const names = await columns(db);

    expect(names).toContain('order_items');
    expect(names).toContain('subscription');
    expect(await readSchemaVersion(db)).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(2);

    const result = await db.execute(
      'SELECT name, phone, comment, order_items, subscription FROM leads WHERE id = 1',
    );
    const row = result.rows[0];

    expect({
      name: row.name,
      phone: row.phone,
      comment: row.comment,
      order_items: row.order_items,
      subscription: row.subscription,
    }).toEqual({
      name: 'Старая Аня',
      phone: '+375291111111',
      comment: 'старый вопрос',
      order_items: null,
      subscription: 0,
    });
    db.close();
  });

  it('идемпотентна: повторное открытие не падает и не меняет данные', async () => {
    const url = `file:${join(dir, 'legacy.db')}`;

    for (let i = 0; i < 3; i += 1) {
      const db = await openDatabase(url);

      expect(await readSchemaVersion(db)).toBe(2);
      const count = await db.execute('SELECT count(*) AS n FROM leads');
      expect(Number(count.rows[0]?.n)).toBe(1);
      db.close();
    }
  });

  it('на чистой базе сразу создаёт полную схему v2', async () => {
    const url = `file:${join(dir, 'clean.db')}`;
    const db = await openDatabase(url);
    const names = await columns(db);

    expect(names).toContain('order_items');
    expect(names).toContain('subscription');
    expect(await readSchemaVersion(db)).toBe(2);
    db.close();
  });
});

describe('Переносимая версия схемы (без PRAGMA user_version)', () => {
  it('readSchemaVersion на чистой базе возвращает 0', async () => {
    const url = `file:${join(dir, 'fresh.db')}`;
    const db = createClient({ url });

    expect(await readSchemaVersion(db)).toBe(0);

    db.close();
  });

  it('миграция проходит, даже когда Turso запрещает PRAGMA user_version = N', async () => {
    const url = `file:${join(dir, 'turso.db')}`;
    const real = createClient({ url });
    const client = strictTursoClient(real);

    await expect(applyMigrations(client)).resolves.toBeUndefined();

    expect(await readSchemaVersion(client)).toBe(SCHEMA_VERSION);

    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
    expect(tables.rows.map((row) => String(row.name))).toContain('schema_migrations');

    real.close();
  });
});
