import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limit';

describe('Rate limit', () => {
  it('пропускает до лимита и блокирует с Retry-After', () => {
    const limiter = createRateLimiter(3, 60_000);
    const now = 1_000_000;

    expect(limiter.check('ip', now)).toEqual({ allowed: true });
    expect(limiter.check('ip', now + 1)).toEqual({ allowed: true });
    expect(limiter.check('ip', now + 2)).toEqual({ allowed: true });

    const blocked = limiter.check('ip', now + 3);
    expect(blocked).toEqual({ allowed: false, retryAfter: 60 });
  });

  it('после окна счётчик сбрасывается', () => {
    const limiter = createRateLimiter(1, 60_000);

    expect(limiter.check('ip', 0)).toEqual({ allowed: true });
    expect(limiter.check('ip', 1)).toEqual({ allowed: false, retryAfter: 60 });
    expect(limiter.check('ip', 60_000)).toEqual({ allowed: true });
  });

  it('считает ключи раздельно', () => {
    const limiter = createRateLimiter(1, 60_000);

    expect(limiter.check('a', 0)).toEqual({ allowed: true });
    expect(limiter.check('b', 0)).toEqual({ allowed: true });
    expect(limiter.check('a', 1)).toEqual({ allowed: false, retryAfter: 60 });
  });
});
