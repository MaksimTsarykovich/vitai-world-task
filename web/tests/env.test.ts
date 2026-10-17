import { describe, expect, it } from 'vitest';
import { createEnv } from '@/lib/env';

describe('Переменные окружения', () => {
  it('подставляет значения по умолчанию', () => {
    const env = createEnv({});

    expect(env.DATABASE_PATH).toBe('./data/kvarta.db');
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('падает с понятной ошибкой на некорректном значении', () => {
    expect(() => createEnv({ PORT: 'не-число' })).toThrow(/PORT/);
    expect(() => createEnv({ DATABASE_PATH: '' })).toThrow(/DATABASE_PATH/);
  });
});
