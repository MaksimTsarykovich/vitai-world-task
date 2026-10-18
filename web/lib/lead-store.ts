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
 * INSERT … WHERE NOT EXISTS и выборка существующей заявки идут одной
 * write-транзакцией client.batch: RETURNING id различает вставку и дубликат.
 */
export async function saveLead(db: Db, input: SaveLeadInput): Promise<SaveLeadResult> {
  const orderItems = input.items.length > 0 ? JSON.stringify(input.items) : null;

  const insertSql = `
    INSERT INTO leads (
      request_id, name, phone, interest, comment, order_items, subscription,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      click_id_type, click_id, referrer, landing_path, page_url, user_agent
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM leads
      WHERE phone = ? AND created_at >= ${WINDOW_SQL}
    )
    RETURNING id`;

  const findSql = `
    SELECT id FROM leads
    WHERE phone = ? AND created_at >= ${WINDOW_SQL}
    ORDER BY created_at DESC, id DESC
    LIMIT 1`;

  const [inserted, existing] = await db.batch(
    [
      {
        sql: insertSql,
        args: [
          input.requestId,
          input.name,
          input.phone,
          input.interest,
          input.comment === '' ? null : input.comment,
          orderItems,
          input.subscription ? 1 : 0,
          input.attribution.utmSource,
          input.attribution.utmMedium,
          input.attribution.utmCampaign,
          input.attribution.utmContent,
          input.attribution.utmTerm,
          input.attribution.clickIdType,
          input.attribution.clickId,
          input.attribution.referrer,
          input.attribution.landingPath,
          input.attribution.pageUrl,
          input.attribution.userAgent,
          input.phone,
        ],
      },
      { sql: findSql, args: [input.phone] },
    ],
    'write',
  );

  const created = inserted.rows[0];

  if (created) {
    return { kind: 'created', id: Number(created.id) };
  }

  const duplicate = existing.rows[0];

  if (!duplicate) {
    // Окно истекло между INSERT и SELECT — write-транзакция это исключает,
    // но на всякий случай сообщаем об ошибке, а не врём про дубликат.
    throw new Error('Не удалось определить существующую заявку в окне дедупликации');
  }

  return { kind: 'duplicate', id: Number(duplicate.id) };
}

/** Помечает заявку отправленной в Telegram (после успешного ответа Bot API). */
export async function markTelegramSent(db: Db, id: number): Promise<void> {
  await db.execute({ sql: 'UPDATE leads SET telegram_sent = 1 WHERE id = ?', args: [id] });
}
