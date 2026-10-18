import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, createDbClient, openDatabase, readSchemaVersion } from '@/lib/db';

const dir = mkdtempSync(join(tmpdir(), 'kvarta-db-'));
const url = `file:${join(dir, 'kvarta.db')}`;

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('libSQL: схема и запись', () => {
  it('создаёт таблицу leads и фиксирует версию схемы', async () => {
    const db = await openDatabase(url);

    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
    const names = tables.rows.map((row) => String(row.name));
    expect(names).toContain('leads');
    expect(names).toContain('schema_migrations');

    expect(await readSchemaVersion(db)).toBe(SCHEMA_VERSION);

    db.close();
  });

  it('сохраняет заявку и читает её после переоткрытия файла', async () => {
    const db = await openDatabase(url);
    const info = await db.execute({
      sql: `INSERT INTO leads (request_id, name, phone, interest, comment)
            VALUES (?, ?, ?, ?, ?)`,
      args: ['req-1', 'Аня', '+375291234567', 'subscription', 'две разные пачки'],
    });
    db.close();

    expect(info.rowsAffected).toBe(1);
    const id = Number(info.lastInsertRowid);

    const reopened = await openDatabase(url);
    const result = await reopened.execute({
      sql: 'SELECT name, phone, interest, comment FROM leads WHERE id = ?',
      args: [id],
    });
    const lead = result.rows[0];
    reopened.close();

    expect({
      name: lead.name,
      phone: lead.phone,
      interest: lead.interest,
      comment: lead.comment,
    }).toEqual({
      name: 'Аня',
      phone: '+375291234567',
      interest: 'subscription',
      comment: 'две разные пачки',
    });
  });

  it('не принимает неизвестный интерес (CHECK на уровне БД)', async () => {
    const db = await openDatabase(url);

    await expect(
      db.execute({
        sql: 'INSERT INTO leads (request_id, name, phone, interest) VALUES (?, ?, ?, ?)',
        args: ['req-2', 'Аня', '+375291234567', 'gift'],
      }),
    ).rejects.toThrow(/CHECK/i);

    db.close();
  });
});

describe('createDbClient: нормализация DATABASE_URL', () => {
  it('путь без схемы создаёт рабочую файловую базу', async () => {
    const bare = join(dir, 'bare-path.db');

    // createDbClient принимает «путь без схемы» и подставляет file: сам.
    const client = createDbClient(bare);
    const probe = await client.execute('SELECT 1 AS ok');
    expect(Number(probe.rows[0]?.ok)).toBe(1);
    client.close();

    // Тот же путь через полную миграцию — таблица и вставка работают.
    const db = await openDatabase(bare);
    const info = await db.execute({
      sql: `INSERT INTO leads (request_id, name, phone, interest) VALUES (?, ?, ?, ?)`,
      args: ['req-bare', 'Аня', '+375291234567', 'question'],
    });
    expect(info.rowsAffected).toBe(1);

    const count = await db.execute('SELECT count(*) AS n FROM leads');
    expect(Number(count.rows[0]?.n)).toBe(1);
    db.close();
  });

  it('пустой DATABASE_URL → понятная ошибка, а не URL_INVALID', async () => {
    let error: unknown;

    try {
      createDbClient('');
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/DATABASE_URL/);
    expect((error as Error).message).not.toMatch(/URL_INVALID/);

    await expect(openDatabase('')).rejects.toThrow(/DATABASE_URL/);
  });
});
