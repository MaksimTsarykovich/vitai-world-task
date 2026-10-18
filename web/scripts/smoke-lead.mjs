#!/usr/bin/env node
/**
 * Smoke-проверка приёма заявок: 10 параллельных POST на живой сервер.
 * Ожидаем ровно одну новую строку в SQLite: 1 × 201 и 9 × 200 duplicate.
 *
 * Запуск из корня репозитория (сервер поднят через docker compose):
 *   node web/scripts/smoke-lead.mjs
 *
 * Переменные:
 *   SMOKE_BASE_URL — адрес сервера, по умолчанию http://localhost:3000
 *   SMOKE_DB_CHECK=0 — не проверять строку в базе (если нет доступа к Docker)
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const baseUrl = process.env.SMOKE_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:3000';

const local = `29${String(Date.now() % 10_000_000).padStart(7, '0')}`;
const phone = `+375${local}`;
const prettyPhone = `+375 ${local.slice(0, 2)} ${local.slice(2, 5)}-${local.slice(5, 7)}-${local.slice(7)}`;

const payload = {
  name: 'Smoke Test',
  phone: prettyPhone,
  interest: 'order',
  comment: 'проверка конкурентной отправки',
  subscription: true,
  items: [{ slug: 'ethiopia', qty: 2 }],
  attribution: {
    utmSource: 'smoke',
    utmMedium: 'test',
    utmCampaign: 'smoke-lead',
    clickIdType: null,
    clickId: null,
    referrer: baseUrl,
    landingPath: '/?utm_source=smoke',
    pageUrl: `${baseUrl}/#zayavka`,
  },
};

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function countRows() {
  const script = `
    const Database = require('better-sqlite3');
    const db = new Database(process.env.DATABASE_PATH || '/data/kvarta.db', { readonly: true });
    const row = db.prepare(
      'SELECT count(*) AS n, sum(subscription) AS subscribed, max(order_items) AS orderItems, max(utm_source) AS utmSource FROM leads WHERE phone = ?'
    ).get(${JSON.stringify(phone)});
    console.log(JSON.stringify(row));
    db.close();
  `;

  try {
    const out = execFileSync('docker', ['compose', 'exec', '-T', 'web', 'node', '-e', script], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    return JSON.parse(out.trim().split('\n').at(-1));
  } catch (dockerError) {
    try {
      const require = createRequire(resolve(repoRoot, 'web', 'package.json'));
      const Database = require('better-sqlite3');
      const dbPath = process.env.DATABASE_PATH ?? resolve(repoRoot, 'web', 'data', 'kvarta.db');
      const db = new Database(dbPath, { readonly: true });
      const row = db
        .prepare(
          'SELECT count(*) AS n, sum(subscription) AS subscribed, max(order_items) AS orderItems, max(utm_source) AS utmSource FROM leads WHERE phone = ?',
        )
        .get(phone);
      db.close();
      return row;
    } catch {
      throw dockerError;
    }
  }
}

console.log(`→ ${baseUrl}/api/lead · ${prettyPhone} · 10 параллельных запросов`);

const responses = await Promise.all(
  Array.from({ length: 10 }, () =>
    fetch(`${baseUrl}/api/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  ),
);

const statuses = responses.map((response) => response.status);
const created = statuses.filter((status) => status === 201).length;
const duplicates = statuses.filter((status) => status === 200).length;
const errors = statuses.filter((status) => status >= 400);

console.log(`  коды ответов: ${statuses.join(', ')}`);

if (created !== 1 || duplicates !== 9 || errors.length > 0) {
  fail(`ожидали 1 × 201 и 9 × 200, получили 201=${created}, 200=${duplicates}, ошибок=${errors.length}`);
}

if (process.env.SMOKE_DB_CHECK === '0') {
  console.log('✓ 10 параллельных заявок: один 201 и девять duplicate (проверка БД пропущена)');
  process.exit(0);
}

const row = countRows();

if (row.n !== 1) {
  fail(`в базе ${row.n} строк для ${phone}, ожидали 1`);
}

console.log(`  в базе: rows=${row.n}, subscription=${row.subscribed}, order_items=${row.orderItems}, utm_source=${row.utmSource}`);
console.log('✓ 10 параллельных заявок: один 201, девять duplicate, в базе одна строка');
