#!/usr/bin/env node
/**
 * Резервная копия базы.
 *
 *   node scripts/backup-db.mjs
 *   node scripts/backup-db.mjs --out /data/backups/kvarta.db
 *   docker compose exec web node scripts/backup-db.mjs
 *   docker compose exec web ls -la /data/backups
 *
 * Источник: DATABASE_URL (file:… или libsql://…).
 *  - file:…   — консистентная бинарная копия через `VACUUM INTO`.
 *  - libsql:// — логический дамп (схема + INSERT-ы) в .sql.
 *
 * Назначение: --out <путь>, иначе BACKUP_DIR (по умолчанию /data/backups) и
 * kvarta-YYYYMMDD-HHMMSS.<db|sql>. Каталог создаётся автоматически.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { readSchemaVersion, normalizeDatabaseUrl } from '../lib/schema.mjs';

const USAGE = `Резервная копия базы.

Использование:
  node scripts/backup-db.mjs [--out <путь>] [--dump]

Флаги:
  --out <путь>   куда положить копию (по умолчанию /data/backups/kvarta-….db)
  --dump         принудительно логический дамп (.sql) даже для file:-базы
  -h, --help     эта справка

База: DATABASE_URL (file:… копируется через VACUUM INTO, libsql://… — дамп в .sql).`;

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp(date = new Date()) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { out: null, dump: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      console.log(USAGE);
      process.exit(0);
    }

    if (arg === '--dump') {
      options.dump = true;
      continue;
    }

    if (arg === '--out') {
      const value = argv[i + 1];
      if (!value) fail('--out требует путь к файлу');
      options.out = value;
      i += 1;
      continue;
    }

    fail(`неизвестный аргумент: ${arg}`);
  }

  return options;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'bigint') return value.toString();

  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Логический дамп для сетевой базы: схема всех таблиц + данные в виде INSERT-ов. */
async function logicalDump(db) {
  const objects = await db.execute(
    `SELECT type, name, sql FROM sqlite_master
     WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
     ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name`,
  );
  // Версию берём из schema_migrations: PRAGMA user_version на Turso недоступен.
  const version = await readSchemaVersion(db);

  const lines = ['-- Логический дамп Kvarta', `PRAGMA user_version = ${version};`, ''];

  for (const row of objects.rows) {
    lines.push(`${String(row.sql).trim()};`);
  }

  lines.push('');

  const tables = objects.rows
    .filter((row) => row.type === 'table')
    .map((row) => String(row.name));

  for (const table of tables) {
    const columns = await db.execute(`PRAGMA table_info(${table})`);
    const names = columns.rows.map((row) => String(row.name));

    if (names.length === 0) continue;

    const orderBy = table === 'leads' ? ' ORDER BY id' : '';
    const data = await db.execute(`SELECT ${names.join(', ')} FROM ${table}${orderBy}`);

    for (const row of data.rows) {
      const values = names.map((name) => sqlLiteral(row[name]));
      lines.push(`INSERT INTO ${table} (${names.join(', ')}) VALUES (${values.join(', ')});`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const resolved = normalizeDatabaseUrl(process.env.DATABASE_URL);

  if (resolved.kind === 'missing') {
    fail(
      'DATABASE_URL не задан — укажите "file:/путь" или "libsql://хост" (+ DATABASE_AUTH_TOKEN)',
    );
  }

  if (resolved.normalized) {
    console.error(`⚠ DATABASE_URL без схемы — использую "${resolved.url}"`);
  }

  const url = resolved.url;
  const useDump = options.dump || !url.startsWith('file:');
  const extension = useDump ? 'sql' : 'db';
  const destination = resolve(
    options.out ?? join(process.env.BACKUP_DIR || '/data/backups', `kvarta-${timestamp()}.${extension}`),
  );

  mkdirSync(dirname(destination), { recursive: true });

  const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

  try {
    if (useDump) {
      writeFileSync(destination, await logicalDump(db), 'utf8');
    } else {
      await db.execute({ sql: 'VACUUM INTO ?', args: [destination] });
    }
  } catch (error) {
    fail(`бэкап не создан: ${error instanceof Error ? error.message : 'unknown'}`);
  } finally {
    db.close();
  }

  console.log(`✓ Бэкап создан: ${destination}`);
}

await main();
