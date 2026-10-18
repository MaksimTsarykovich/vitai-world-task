/**
 * Схема и идемпотентная миграция базы «Кварты» — единый источник для рантайма
 * (web/lib/db.ts) и CLI-скриптов (web/scripts/*.mjs, которые не умеют
 * импортировать TypeScript). Пишут только через libSQL.
 */
export const SCHEMA_VERSION = 2;

/*
 * Полная схема для чистой базы. На существующей базе v1 недостающие колонки
 * добавляются миграцией ниже через ALTER TABLE — данные не теряются.
 */
export const CREATE_LEADS_TABLE = `
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
)`;

export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_leads_phone_created ON leads (phone, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC)',
];

export const SCHEMA_SQL = `${[CREATE_LEADS_TABLE, ...CREATE_INDEXES].join(';\n')};`;

export const LEAD_COLUMNS_V2 = [
  { name: 'order_items', ddl: 'ALTER TABLE leads ADD COLUMN order_items TEXT' },
  {
    name: 'subscription',
    ddl: 'ALTER TABLE leads ADD COLUMN subscription INTEGER NOT NULL DEFAULT 0',
  },
];

/**
 * Идемпотентная миграция: создаёт полную таблицу для чистой базы, а на базе v1
 * добавляет только недостающие колонки и выставляет user_version = 2.
 * PRAGMA table_info читаем через execute, пишущие шаги идут одной
 * write-транзакцией client.batch.
 */
export async function applyMigrations(client) {
  await client.batch([CREATE_LEADS_TABLE, ...CREATE_INDEXES], 'write');

  const info = await client.execute('PRAGMA table_info(leads)');
  const columns = new Set(info.rows.map((row) => String(row.name)));

  const statements = [];

  for (const column of LEAD_COLUMNS_V2) {
    if (!columns.has(column.name)) {
      statements.push(column.ddl);
    }
  }

  statements.push(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  await client.batch(statements, 'write');
}
