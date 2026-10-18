#!/usr/bin/env node
/**
 * Консистентная копия базы SQLite через better-sqlite3 `.backup()`.
 *
 *   node scripts/backup-db.mjs
 *   docker compose exec web node scripts/backup-db.mjs
 *   docker compose exec web ls -la /data/backups
 *
 * Источник: DATABASE_PATH (в Docker /data/kvarta.db).
 * Назначение: BACKUP_DIR (по умолчанию /data/backups), файл
 * kvarta-YYYYMMDD-HHMMSS.db. Каталог создаётся автоматически.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

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

const dbPath = process.env.DATABASE_PATH || '/data/kvarta.db';
const backupDir = process.env.BACKUP_DIR || '/data/backups';
const destination = join(backupDir, `kvarta-${timestamp()}.db`);

mkdirSync(backupDir, { recursive: true });

let db;

try {
  db = new Database(dbPath, { readonly: true, fileMustExist: true });
} catch (error) {
  fail(
    `не удалось открыть базу ${resolve(dbPath)}: ${
      error instanceof Error ? error.message : 'unknown'
    }`,
  );
}

try {
  await db.backup(destination);
} catch (error) {
  fail(`бэкап не создан: ${error instanceof Error ? error.message : 'unknown'}`);
} finally {
  db.close();
}

console.log(`✓ Бэкап создан: ${destination}`);
