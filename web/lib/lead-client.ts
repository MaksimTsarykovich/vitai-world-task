import { getAttribution } from '@/lib/attribution';
import type { LeadItem } from '@/lib/lead-schema';

export type LeadInterest = 'question' | 'order';

export type LeadOrderItem = LeadItem;

export type LeadPayload = {
  name: string;
  phone: string;
  interest: LeadInterest;
  comment: string;
  items: LeadOrderItem[];
  subscription: boolean;
};

export type LeadResult =
  | { kind: 'success'; id?: number; requestId?: string }
  | { kind: 'duplicate'; id?: number; requestId?: string }
  | {
      kind: 'validation';
      fields: Record<string, string>;
      requestId?: string;
    }
  | { kind: 'rate-limit'; retryAfter?: number; requestId?: string }
  | { kind: 'error'; requestId?: string };

export { isValidByPhone, normalizeByPhone } from '@/lib/phone';

const REQUEST_TIMEOUT_MS = 12_000;

type LeadResponseBody = {
  status?: string;
  id?: number;
  requestId?: string;
  code?: string;
  fields?: Record<string, string>;
};

function readRequestId(response: Response, body: LeadResponseBody | null): string | undefined {
  return response.headers.get('x-request-id') ?? body?.requestId ?? undefined;
}

async function readJson(response: Response): Promise<LeadResponseBody | null> {
  try {
    return (await response.json()) as LeadResponseBody;
  } catch {
    return null;
  }
}

/**
 * Единая точка отправки заявки в POST /api/lead. Таймаут 12 секунд,
 * атрибуция первого захода добавляется здесь же. Данные формы не трогаем.
 */
export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        name: payload.name,
        phone: payload.phone,
        interest: payload.interest,
        comment: payload.comment,
        subscription: payload.subscription,
        items: payload.items,
        attribution: getAttribution(),
      }),
    });

    const body = await readJson(response);
    const requestId = readRequestId(response, body);

    if (response.status === 201) {
      return { kind: 'success', id: body?.id, requestId };
    }

    if (response.status === 200 && body?.status === 'duplicate') {
      return { kind: 'duplicate', id: body.id, requestId };
    }

    if (response.status === 400) {
      return {
        kind: 'validation',
        fields: body?.fields ?? {},
        requestId,
      };
    }

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'));

      return {
        kind: 'rate-limit',
        retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
        requestId,
      };
    }

    return { kind: 'error', requestId };
  } catch {
    // Сеть, таймаут, отмена — форма покажет «Попробовать ещё раз».
    return { kind: 'error' };
  } finally {
    clearTimeout(timeout);
  }
}
