import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, openDatabase } from '@/lib/db';

const dir = mkdtempSync(join(tmpdir(), 'kvarta-db-'));
const file = join(dir, 'kvarta.db');

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function tableNames(path: string): string[] {
  const db = openDatabase(path);
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
    name: string;
  }[];
  db.close();

  return rows.map((row) => row.name);
}

describe('SQLite: схема и запись', () => {
  it('создаёт таблицу leads и фиксирует версию схемы', () => {
    const db = openDatabase(file);

    expect(tableNames(file)).toContain('leads');
    expect(Number(db.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    expect(String(db.pragma('journal_mode', { simple: true }))).toBe('wal');

    db.close();
  });

  it('сохраняет заявку и читает её после переоткрытия файла', () => {
    const db = openDatabase(file);
    const info = db
      .prepare(
        `INSERT INTO leads (request_id, name, phone, interest, comment)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run('req-1', 'Аня', '+375291234567', 'subscription', 'две разные пачки');
    db.close();

    expect(info.changes).toBe(1);

    const reopened = openDatabase(file);
    const lead = reopened
      .prepare('SELECT name, phone, interest, comment FROM leads WHERE id = ?')
      .get(info.lastInsertRowid) as {
      name: string;
      phone: string;
      interest: string;
      comment: string;
    };
    reopened.close();

    expect(lead).toEqual({
      name: 'Аня',
      phone: '+375291234567',
      interest: 'subscription',
      comment: 'две разные пачки',
    });
  });

  it('не принимает неизвестный интерес (CHECK на уровне БД)', () => {
    const db = openDatabase(file);

    expect(() =>
      db
        .prepare('INSERT INTO leads (request_id, name, phone, interest) VALUES (?, ?, ?, ?)')
        .run('req-2', 'Аня', '+375291234567', 'gift'),
    ).toThrow(/CHECK/i);

    db.close();
  });
});
