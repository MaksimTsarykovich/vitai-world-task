import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '@/lib/env';

export const SCHEMA_VERSION = 1;

/*
 * Данные M1: одна таблица заявок и индексы. API записи (/api/lead),
 * нормализация телефона и дедупликация появляются на этапе M3.
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

export type Db = Database.Database;

// Открывает (при необходимости создаёт) файл БД, включает WAL и создаёт схему.
export function openDatabase(path: string): Db {
  mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);

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
