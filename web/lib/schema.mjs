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

/*
 * Переносимая таблица учёта версии схемы. Turso Cloud запрещает
 * `PRAGMA user_version = N` (SQL_PARSE_ERROR), поэтому версия живёт в данных,
 * а не в заголовке файла.
 */
export const CREATE_SCHEMA_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`;

export const SCHEMA_SQL = `${[
  CREATE_LEADS_TABLE,
  ...CREATE_INDEXES,
  CREATE_SCHEMA_MIGRATIONS,
].join(';\n')};`;

export const LEAD_COLUMNS_V2 = [
  { name: 'order_items', ddl: 'ALTER TABLE leads ADD COLUMN order_items TEXT' },
  {
    name: 'subscription',
    ddl: 'ALTER TABLE leads ADD COLUMN subscription INTEGER NOT NULL DEFAULT 0',
  },
];

/**
 * Приводит DATABASE_URL к валидному для libSQL виду, чтобы не падать с
 * URL_INVALID на «путь без схемы»:
 *  - пусто/undefined            → { kind: 'missing' };
 *  - путь без схемы (./data/x,  → { kind: 'url', url: 'file:./data/x', normalized: true };
 *    /data/x)
 *  - file:/libsql:/http(s):/ws: → как есть.
 */
export function normalizeDatabaseUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';

  if (raw === '') return { kind: 'missing' };

  if (/^(file|libsql|https?|wss?):/i.test(raw)) {
    return { kind: 'url', url: raw, normalized: false };
  }

  return { kind: 'url', url: `file:${raw}`, normalized: true };
}

/**
 * Версия схемы из таблицы schema_migrations. Свежая или старая база без этой
 * таблицы — 0 (не падаем).
 */
export async function readSchemaVersion(client) {
  try {
    const result = await client.execute(
      'SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations',
    );

    return Number(result.rows[0]?.v ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Идемпотентная миграция: создаёт таблицу для чистой базы, на базе v1 добавляет
 * недостающие колонки, фиксирует версию в schema_migrations. Пишущие шаги идут
 * write-транзакциями client.batch, PRAGMA table_info читается через execute.
 */
export async function applyMigrations(client) {
  await client.batch(
    [CREATE_LEADS_TABLE, ...CREATE_INDEXES, CREATE_SCHEMA_MIGRATIONS],
    'write',
  );

  const info = await client.execute('PRAGMA table_info(leads)');
  const columns = new Set(info.rows.map((row) => String(row.name)));

  const alters = [];

  for (const column of LEAD_COLUMNS_V2) {
    if (!columns.has(column.name)) {
      alters.push(column.ddl);
    }
  }

  if (alters.length > 0) {
    await client.batch(alters, 'write');
  }

  await client.execute({
    sql: 'INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)',
    args: [SCHEMA_VERSION],
  });

  // PRAGMA user_version нужен только внешним инструментам на локальном файле:
  // Turso Cloud его запрещает, поэтому это отдельный необязательный шаг.
  try {
    await client.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  } catch {
    // Игнорируем: версия уже зафиксирована в schema_migrations.
  }
}
