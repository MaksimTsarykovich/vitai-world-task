#!/usr/bin/env node
/**
 * Применяет идемпотентную миграцию схемы к базе по DATABASE_URL и печатает
 * версию схемы. Нужно, чтобы прогнать миграцию на Turso до/во время деплоя.
 *
 *   DATABASE_URL=file:./data/kvarta.db npm run db:migrate
 *   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:migrate
 *
 * Миграция — та же, что использует рантайм (lib/db.ts → lib/schema.mjs).
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@libsql/client';
import { SCHEMA_VERSION, applyMigrations, readSchemaVersion } from '../lib/schema.mjs';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('✖ Не задан DATABASE_URL (file:./data/kvarta.db или libsql://…)');
  process.exit(1);
}

if (url.startsWith('file:')) {
  const path = url.slice('file:'.length).split('?')[0];
  if (path && !path.startsWith(':')) mkdirSync(dirname(path), { recursive: true });
}

const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

try {
  await applyMigrations(db);

  const schemaVersion = await readSchemaVersion(db);

  console.log(`✓ Миграция применена. Версия схемы: ${schemaVersion} (актуальная ${SCHEMA_VERSION})`);

  if (schemaVersion !== SCHEMA_VERSION) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    `✖ Миграция не удалась: ${error instanceof Error ? error.message : 'unknown'}`,
  );
  process.exit(1);
} finally {
  db.close();
}
