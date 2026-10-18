import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { scheduleAfterResponse } from '@/lib/after-response';
import { getDb } from '@/lib/db';
import {
  formatLeadFieldErrors,
  leadRequestSchema,
  sanitizeText,
  type LeadRequest,
} from '@/lib/lead-schema';
import { markTelegramSent, saveLead, type LeadAttributionRow } from '@/lib/lead-store';
import { maskPhone } from '@/lib/phone';
import { getClientIp, leadRateLimiter } from '@/lib/rate-limit';
import { notifyTelegram } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16 * 1024;

function resolveAttribution(
  lead: LeadRequest,
  request: Request,
): LeadAttributionRow {
  const attribution = lead.attribution;

  return {
    utmSource: attribution?.utmSource ?? null,
    utmMedium: attribution?.utmMedium ?? null,
    utmCampaign: attribution?.utmCampaign ?? null,
    utmContent: attribution?.utmContent ?? null,
    utmTerm: attribution?.utmTerm ?? null,
    clickIdType: attribution?.clickIdType ?? null,
    clickId: attribution?.clickId ?? null,
    referrer:
      attribution?.referrer ?? sanitizeText(request.headers.get('referer'), 1000),
    landingPath: attribution?.landingPath ?? null,
    pageUrl: attribution?.pageUrl ?? null,
    userAgent:
      attribution?.userAgent ?? sanitizeText(request.headers.get('user-agent'), 500),
  };
}

function json(
  requestId: string,
  status: number,
  body: unknown,
  headers?: Record<string, string>,
) {
  return NextResponse.json(body, {
    status,
    headers: { 'X-Request-Id': requestId, ...headers },
  });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  let phoneForLog: string | null = null;

  const log = (status: number) => {
    const phone = maskPhone(phoneForLog);
    const parts = [
      `[lead] requestId=${requestId}`,
      `status=${status}`,
      `duration=${Date.now() - startedAt}ms`,
    ];

    if (phone) parts.push(`phone=${phone}`);

    console.info(parts.join(' '));
  };

  const respond = (status: number, body: unknown, headers?: Record<string, string>) => {
    log(status);
    return json(requestId, status, body, headers);
  };

  try {
    const declaredLength = Number(request.headers.get('content-length'));

    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return respond(413, { status: 'error', code: 'PAYLOAD_TOO_LARGE' });
    }

    const rate = leadRateLimiter.check(getClientIp(request));

    if (!rate.allowed) {
      return respond(
        429,
        { status: 'error', code: 'RATE_LIMIT' },
        { 'Retry-After': String(rate.retryAfter) },
      );
    }

    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

    if (!contentType.includes('application/json')) {
      return respond(400, {
        status: 'error',
        code: 'VALIDATION',
        fields: {},
        requestId,
      });
    }

    let raw: string;

    try {
      raw = await request.text();
    } catch {
      return respond(400, {
        status: 'error',
        code: 'VALIDATION',
        fields: {},
        requestId,
      });
    }

    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return respond(413, { status: 'error', code: 'PAYLOAD_TOO_LARGE' });
    }

    let input: unknown;

    try {
      input = JSON.parse(raw);
    } catch {
      return respond(400, {
        status: 'error',
        code: 'VALIDATION',
        fields: { form: 'Некорректный формат данных' },
        requestId,
      });
    }

    const parsed = leadRequestSchema.safeParse(input);

    if (!parsed.success) {
      return respond(400, {
        status: 'error',
        code: 'VALIDATION',
        fields: formatLeadFieldErrors(parsed.error),
        requestId,
      });
    }

    const lead = parsed.data;
    phoneForLog = lead.phone;

    const attribution = resolveAttribution(lead, request);
    const db = await getDb();

    const saved = await saveLead(db, {
      requestId,
      name: lead.name,
      phone: lead.phone,
      interest: lead.interest,
      comment: lead.comment,
      items: lead.items,
      subscription: lead.subscription,
      attribution,
    });

    if (saved.kind === 'duplicate') {
      return respond(200, { status: 'duplicate', id: saved.id, requestId });
    }

    // Дубль в Telegram — уже после ответа пользователю, чтобы не влиять на время.
    // Ошибка отправки только логируется, заявка остаётся успешной.
    scheduleAfterResponse(async () => {
      const sent = await notifyTelegram({
        id: saved.id,
        name: lead.name,
        phone: lead.phone,
        interest: lead.interest,
        comment: lead.comment === '' ? null : lead.comment,
        items: lead.items,
        subscription: lead.subscription,
        attribution,
      });

      if (sent) await markTelegramSent(db, saved.id);
    });

    return respond(201, { status: 'ok', id: saved.id, requestId });
  } catch (error) {
    console.error(
      `[lead] requestId=${requestId} status=500 error=${
        error instanceof Error ? error.message : 'unknown'
      }`,
    );

    return respond(500, { status: 'error', code: 'SERVER', requestId });
  }
}

export function GET() {
  const requestId = randomUUID();

  return json(
    requestId,
    405,
    { status: 'error', code: 'METHOD_NOT_ALLOWED' },
    { Allow: 'POST' },
  );
}
