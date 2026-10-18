import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // путь к файлу SQLite: локально ./data/kvarta.db, в Docker /data/kvarta.db
  DATABASE_PATH: z.string().min(1).default('./data/kvarta.db'),
  // публичный адрес сайта: canonical, OG, sitemap. На деплое задаётся обязательно.
  SITE_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  HOSTNAME: z.string().default('0.0.0.0'),
  // лимит POST /api/lead с одного IP в минуту
  LEAD_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  // доверять X-Forwarded-For только за своим reverse proxy (Caddy и т.п.)
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
});

export type Env = z.infer<typeof schema>;

export function createEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Некорректные переменные окружения: ${details}`);
  }

  return parsed.data;
}

export const env = createEnv();
