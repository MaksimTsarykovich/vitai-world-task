import type { Db } from '@/lib/db';
import type { LeadItem, LeadRequest } from '@/lib/lead-schema';

export type LeadAttributionRow = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  clickIdType: string | null;
  clickId: string | null;
  referrer: string | null;
  landingPath: string | null;
  pageUrl: string | null;
  userAgent: string | null;
};

export type SaveLeadInput = {
  requestId: string;
  name: string;
  phone: string;
  interest: LeadRequest['interest'];
  comment: string;
  items: LeadItem[];
  subscription: boolean;
  attribution: LeadAttributionRow;
};

export type SaveLeadResult =
  | { kind: 'created'; id: number }
  | { kind: 'duplicate'; id: number };

const WINDOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now','-10 minutes')";

/**
 * Атомарная вставка с дедупликацией по нормализованному телефону за 10 минут.
 * BEGIN IMMEDIATE сериализует писателей, INSERT … WHERE NOT EXISTS не даёт
 * создать вторую строку, RETURNING id различает вставку и дубликат.
 */
export function saveLead(db: Db, input: SaveLeadInput): SaveLeadResult {
  const insert = db.prepare(`
    INSERT INTO leads (
      request_id, name, phone, interest, comment, order_items, subscription,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      click_id_type, click_id, referrer, landing_path, page_url, user_agent
    )
    SELECT
      @requestId, @name, @phone, @interest, @comment, @orderItems, @subscription,
      @utmSource, @utmMedium, @utmCampaign, @utmContent, @utmTerm,
      @clickIdType, @clickId, @referrer, @landingPath, @pageUrl, @userAgent
    WHERE NOT EXISTS (
      SELECT 1 FROM leads
      WHERE phone = @phone AND created_at >= ${WINDOW_SQL}
    )
    RETURNING id
  `);

  const findExisting = db.prepare(`
    SELECT id FROM leads
    WHERE phone = ? AND created_at >= ${WINDOW_SQL}
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `);

  const run = db.transaction((lead: SaveLeadInput): SaveLeadResult => {
    const orderItems = lead.items.length > 0 ? JSON.stringify(lead.items) : null;

    const inserted = insert.get({
      requestId: lead.requestId,
      name: lead.name,
      phone: lead.phone,
      interest: lead.interest,
      comment: lead.comment === '' ? null : lead.comment,
      orderItems,
      subscription: lead.subscription ? 1 : 0,
      utmSource: lead.attribution.utmSource,
      utmMedium: lead.attribution.utmMedium,
      utmCampaign: lead.attribution.utmCampaign,
      utmContent: lead.attribution.utmContent,
      utmTerm: lead.attribution.utmTerm,
      clickIdType: lead.attribution.clickIdType,
      clickId: lead.attribution.clickId,
      referrer: lead.attribution.referrer,
      landingPath: lead.attribution.landingPath,
      pageUrl: lead.attribution.pageUrl,
      userAgent: lead.attribution.userAgent,
    }) as { id: number } | undefined;

    if (inserted) {
      return { kind: 'created', id: Number(inserted.id) };
    }

    const existing = findExisting.get(lead.phone) as { id: number } | undefined;

    if (!existing) {
      // Окно истекло между SELECT и INSERT — транзакция IMMEDIATE это исключает,
      // но на всякий случай сообщаем об ошибке, а не врём про дубликат.
      throw new Error('Не удалось определить существующую заявку в окне дедупликации');
    }

    return { kind: 'duplicate', id: Number(existing.id) };
  });

  return run.immediate(input);
}
