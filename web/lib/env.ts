import { z } from 'zod';

/**
 * Необязательное значение: пустая строка (приходит из compose как `${VAR:-}`)
 * считается отсутствующей, чтобы Telegram не «включался» на пустых env.
 */
const optionalString = z
  .string()
  .optional()
  .transform((value) => (typeof value === 'string' && value.trim() !== '' ? value : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // URL базы: локально файл (file:./data/kvarta.db), на Vercel/Turso — libsql://…
  DATABASE_URL: z.string().min(1).default('file:./data/kvarta.db'),
  // токен Turso: необязательный, в логи не выводим
  DATABASE_AUTH_TOKEN: optionalString,
  // публичный адрес сайта: canonical, OG, sitemap. На деплое задаётся обязательно.
  SITE_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  HOSTNAME: z.string().default('0.0.0.0'),
  // лимит POST /api/lead с одного IP в минуту
  LEAD_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  // доверять X-Forwarded-For только за своим reverse proxy (Caddy и т.п.)
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
  // Telegram-дубль заявки: включается только когда заданы оба значения.
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
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
