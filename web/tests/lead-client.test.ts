import { afterEach, describe, expect, it, vi } from 'vitest';
import { isValidByPhone, normalizeByPhone, submitLead, type LeadPayload } from '@/lib/lead-client';

const payload: LeadPayload = {
  name: 'Аня',
  phone: '+375 29 123-45-67',
  interest: 'order',
  comment: '',
  items: [{ slug: 'ethiopia', qty: 2 }],
  subscription: true,
};

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Клиент заявки', () => {
  it('экспортирует нормализацию телефона', () => {
    expect(normalizeByPhone('+375 29 123-45-67')).toBe('+375291234567');
    expect(isValidByPhone('+375 17 123-45-67')).toBe(true);
  });

  it('отправляет JSON на /api/lead и возвращает успех', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, { status: 'ok', id: 42, requestId: 'req-1' }, { 'X-Request-Id': 'req-1' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitLead(payload)).resolves.toEqual({
      kind: 'success',
      id: 42,
      requestId: 'req-1',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/lead');
    expect(init.method).toBe('POST');
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({
      name: 'Аня',
      phone: '+375 29 123-45-67',
      interest: 'order',
      subscription: true,
      items: [{ slug: 'ethiopia', qty: 2 }],
    });
  });

  it('распознаёт дубликат', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, { status: 'duplicate', id: 41, requestId: 'req-2' }),
      ),
    );

    await expect(submitLead(payload)).resolves.toMatchObject({
      kind: 'duplicate',
      id: 41,
      requestId: 'req-2',
    });
  });

  it('возвращает ошибки полей на 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          status: 'error',
          code: 'VALIDATION',
          fields: { phone: 'Введите белорусский номер: +375 29 123-45-67' },
          requestId: 'req-3',
        }),
      ),
    );

    await expect(submitLead(payload)).resolves.toEqual({
      kind: 'validation',
      fields: { phone: 'Введите белорусский номер: +375 29 123-45-67' },
      requestId: 'req-3',
    });
  });

  it('возвращает rate-limit и Retry-After на 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(429, { status: 'error', code: 'RATE_LIMIT' }, { 'Retry-After': '30' }),
      ),
    );

    await expect(submitLead(payload)).resolves.toMatchObject({
      kind: 'rate-limit',
      retryAfter: 30,
    });
  });

  it('превращает сетевую ошибку в error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(submitLead(payload)).resolves.toEqual({ kind: 'error' });
  });

  it('прерывает запрос по таймауту 12 секунд', async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );

    const result = submitLead(payload);
    await vi.advanceTimersByTimeAsync(12_000);

    await expect(result).resolves.toEqual({ kind: 'error' });
  });
});
