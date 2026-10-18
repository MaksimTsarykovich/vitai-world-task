import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // запас под параллельную сборку/Docker: синхронный better-sqlite3 и
    // фоновые after()-задачи под нагрузкой идут медленнее дефолтных 5 с
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
});
