import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '@/lib/env';

export const SCHEMA_VERSION = 2;

/*
 * Полная схема для чистой базы. На существующей базе v1 недостающие колонки
 * добавляются миграцией ниже через ALTER TABLE — данные не теряются.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS leads (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  request_id     TEXT NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  interest       TEXT NOT NULL CHECK (interest IN ('subscription','order','question')),
  comment        TEXT,
  order_items    TEXT,
  subscription   INTEGER NOT NULL DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_leads_phone_created ON leads (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
`;

const LEAD_COLUMNS_V2: Array<{ name: string; ddl: string }> = [
  { name: 'order_items', ddl: 'ALTER TABLE leads ADD COLUMN order_items TEXT' },
  {
    name: 'subscription',
    ddl: 'ALTER TABLE leads ADD COLUMN subscription INTEGER NOT NULL DEFAULT 0',
  },
];

function leadColumns(db: Database.Database): Set<string> {
  const rows = db.prepare('PRAGMA table_info(leads)').all() as Array<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

/**
 * Идемпотентная миграция: создаёт полную таблицу для чистой базы, а на базе v1
 * добавляет только недостающие колонки и выставляет user_version = 2.
 */
function migrate(db: Database.Database): void {
  db.exec(SCHEMA_SQL);

  const columns = leadColumns(db);

  for (const column of LEAD_COLUMNS_V2) {
    if (!columns.has(column.name)) {
      db.exec(column.ddl);
    }
  }

  db.exec(SCHEMA_SQL);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

export type Db = Database.Database;

// Открывает (при необходимости создаёт) файл БД, включает WAL и применяет схему.
export function openDatabase(path: string): Db {
  mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  const apply = db.transaction(() => migrate(db));
  apply();

  return db;
}

const globalForDb = globalThis as unknown as { __kvartaDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__kvartaDb) {
    globalForDb.__kvartaDb = openDatabase(env.DATABASE_PATH);
  }

  return globalForDb.__kvartaDb;
}

export function dbStatus(): { ok: boolean; schemaVersion: number } {
  const db = getDb();
  const row = db.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
  const schemaVersion = Number(db.pragma('user_version', { simple: true }));

  return { ok: row?.ok === 1, schemaVersion };
}
