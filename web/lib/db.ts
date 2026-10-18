import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '@/lib/env';
import { SCHEMA_SQL, SCHEMA_VERSION, applyMigrations, readSchemaVersion } from '@/lib/schema.mjs';

export { SCHEMA_SQL, SCHEMA_VERSION, readSchemaVersion };

export type Db = Client;

/** Для file:-URL создаём каталог локального файла заранее. */
function localFilePath(url: string): string | null {
  if (!url.startsWith('file:')) return null;

  const rest = url.slice('file:'.length).split('?')[0];
  if (rest === '' || rest.startsWith(':')) return null; // file::memory: и т.п.

  return rest;
}

/** Клиент libSQL. url — file:… локально или libsql://…/https://… для Turso. */
export function createDbClient(url: string, authToken?: string): Db {
  const path = localFilePath(url);
  if (path) mkdirSync(dirname(path), { recursive: true });

  return createClient({ url, authToken });
}

/** Открывает (при необходимости создаёт) базу и применяет идемпотентную схему. */
export async function openDatabase(url: string, authToken?: string): Promise<Db> {
  const db = createDbClient(url, authToken);
  await applyMigrations(db);

  return db;
}

const globalForDb = globalThis as unknown as { __kvartaDbPromise?: Promise<Db> };

/**
 * Синглтон на процесс: один клиент libSQL на все запросы. Если подключение
 * упало (например, Turso недоступен на холодном старте), отказ НЕ кэшируется —
 * следующий запрос попробует подключиться снова, а не будет отдавать 500 до
 * перезапуска процесса.
 */
export function getDb(): Promise<Db> {
  if (globalForDb.__kvartaDbPromise) return globalForDb.__kvartaDbPromise;

  const pending = openDatabase(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN).catch(
    (error: unknown) => {
      globalForDb.__kvartaDbPromise = undefined;
      throw error;
    },
  );

  globalForDb.__kvartaDbPromise = pending;

  return pending;
}

export async function dbStatus(): Promise<{ ok: boolean; schemaVersion: number }> {
  const db = await getDb();
  const probe = await db.execute('SELECT 1 AS ok');
  const schemaVersion = await readSchemaVersion(db);

  return {
    ok: Number(probe.rows[0]?.ok) === 1,
    schemaVersion,
  };
}
