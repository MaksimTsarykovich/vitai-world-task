import { env } from '@/lib/env';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number };

type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;

/**
 * Простой лимитер в памяти процесса: окно 1 минута, счётчик на ключ (IP).
 * При переполнении отдаёт Retry-After в секундах.
 */
export function createRateLimiter(limit: number, windowMs = WINDOW_MS) {
  const buckets = new Map<string, Bucket>();

  function prune(now: number): void {
    if (buckets.size < MAX_BUCKETS) return;

    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        prune(now);
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }

      if (bucket.count >= limit) {
        return {
          allowed: false,
          retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        };
      }

      bucket.count += 1;
      return { allowed: true };
    },

    reset(): void {
      buckets.clear();
    },
  };
}

export const leadRateLimiter = createRateLimiter(env.LEAD_RATE_LIMIT);

export function resetLeadRateLimit(): void {
  leadRateLimiter.reset();
}

/**
 * IP для лимита. За прокси доверяем X-Forwarded-For только при TRUST_PROXY=1;
 * иначе используем адрес соединения, если платформа его отдаёт, либо общий
 * локальный ключ (в одном контейнере без прокси это ожидаемо).
 */
export function getClientIp(request: Request): string {
  const trustProxy = env.TRUST_PROXY === '1';

  if (trustProxy) {
    const forwarded = request.headers.get('x-forwarded-for');
    const first = forwarded?.split(',')[0]?.trim();
    if (first) return first;

    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;
  }

  const connectionIp = (request as Request & { ip?: string }).ip;
  return connectionIp ?? 'direct';
}
