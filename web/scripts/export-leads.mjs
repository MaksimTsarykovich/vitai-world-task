#!/usr/bin/env node
/**
 * Выгрузка заявок из SQLite для менеджера.
 *
 *   node scripts/export-leads.mjs                        # CSV в stdout
 *   node scripts/export-leads.mjs --format json
 *   node scripts/export-leads.mjs --out /data/leads.csv
 *   docker compose exec web node scripts/export-leads.mjs --format csv
 *
 * База берётся из DATABASE_PATH (в Docker это /data/kvarta.db).
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const COLUMNS = [
  'id',
  'created_at',
  'name',
  'phone',
  'interest',
  'order_items',
  'subscription',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'click_id_type',
  'click_id',
  'referrer',
  'landing_path',
  'page_url',
  'telegram_sent',
];

const USAGE = `Выгрузка заявок из SQLite.

Использование:
  node scripts/export-leads.mjs [--format csv|json] [--out <путь>]

Флаги:
  --format csv|json   формат вывода, по умолчанию csv
  --out <путь>        записать в файл вместо stdout
  -h, --help          эта справка

База: DATABASE_PATH (по умолчанию /data/kvarta.db).`;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { format: 'csv', out: null };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      console.log(USAGE);
      process.exit(0);
    }

    if (arg === '--format') {
      const value = argv[i + 1];
      if (value !== 'csv' && value !== 'json') fail('--format принимает csv или json');
      options.format = value;
      i += 1;
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

function csvCell(value) {
  if (value === null || value === undefined) return '';

  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  const lines = [COLUMNS.join(',')];

  for (const row of rows) {
    lines.push(COLUMNS.map((column) => csvCell(row[column])).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function toJson(rows) {
  const parsed = rows.map((row) => {
    if (row.order_items === null) return { ...row, order_items: null };

    try {
      return { ...row, order_items: JSON.parse(row.order_items) };
    } catch {
      return row;
    }
  });

  return `${JSON.stringify(parsed, null, 2)}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const dbPath = process.env.DATABASE_PATH || '/data/kvarta.db';
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

  let rows;

  try {
    rows = db.prepare(`SELECT ${COLUMNS.join(', ')} FROM leads ORDER BY created_at ASC, id ASC`).all();
  } catch (error) {
    db.close();
    fail(
      `не удалось прочитать заявки: ${error instanceof Error ? error.message : 'unknown'}`,
    );
  }

  db.close();

  const output = options.format === 'json' ? toJson(rows) : toCsv(rows);

  if (options.out) {
    writeFileSync(options.out, output, 'utf8');
    console.error(`✓ Выгружено заявок: ${rows.length}. Файл: ${resolve(options.out)}`);
    return;
  }

  process.stdout.write(output);
  console.error(`✓ Выгружено заявок: ${rows.length}`);
}

main();
