import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'kvarta-singleton-'));

const state = vi.hoisted(() => ({ failNext: true, clients: 0 }));

// Первый клиент падает на миграции (эмулируем недоступный Turso на холодном
// старте), второй — успешен. Проверяем, что getDb() не кэширует отказ.
vi.mock('@libsql/client', () => ({
  createClient: () => {
    state.clients += 1;
    const shouldFail = state.failNext;
    state.failNext = false;

    return {
      batch: async () => {
        if (shouldFail) throw new Error('Turso недоступен');
        return [];
      },
      execute: async () => ({ rows: [], rowsAffected: 0 }),
      close: async () => {},
    };
  },
}));

vi.stubEnv('DATABASE_URL', `file:${join(dir, 'singleton.db')}`);

const { getDb } = await import('@/lib/db');

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('getDb: отказ подключения не кэшируется навсегда', () => {
  it('первый вызов падает, второй успешен — следующий запрос пробует снова', async () => {
    await expect(getDb()).rejects.toThrow('Turso недоступен');

    const db = await getDb();
    expect(db).toBeDefined();
    expect(state.clients).toBe(2);
  });
});
