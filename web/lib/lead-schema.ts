import { z } from 'zod';
import { BY_PHONE_MESSAGE, normalizeByPhone } from '@/lib/phone';
import { products } from '@/lib/products';

/** Одна Zod-схема для сервера и для клиентской подсветки полей. */
export const LEAD_NAME_MESSAGE = 'Укажите имя (2–80 символов)';
export const LEAD_PHONE_MESSAGE = BY_PHONE_MESSAGE;
export const LEAD_INTEREST_MESSAGE = 'Выберите, что интересует';
export const LEAD_COMMENT_QUESTION_MESSAGE = 'Напишите вопрос';
export const LEAD_ITEMS_MESSAGE = 'Добавьте хотя бы один сорт кофе';
export const LEAD_ITEM_SLUG_MESSAGE = 'Выберите сорт из ассортимента';
export const LEAD_ITEM_QTY_MESSAGE = 'Количество — целое число от 1 до 10';
export const LEAD_COMMENT_MAX_MESSAGE = 'Комментарий — не больше 1000 символов';

/**
 * Слаги сортов кофе. Единственный источник истины — ассортимент
 * (`products` в web/lib/products.ts): список выводим из него, чтобы enum схемы
 * и карточки товаров не расходились. z.enum c `const`-параметром сохраняет
 * Literal-тип элементов (ProductSlug).
 */
export const LEAD_PRODUCT_SLUGS = products.map((product) => product.slug);

// eslint-disable-next-line no-control-regex -- намеренно вырезаем управляющие символы
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
// eslint-disable-next-line no-control-regex -- намеренно отклоняем управляющие символы
const CONTROL_CHAR = /[\u0000-\u001F\u007F-\u009F]/;

/** Убирает управляющие символы, обрезает пробелы и ограничивает длину. */
export function sanitizeText(value: string | null | undefined, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const clean = value.replace(CONTROL_CHARS, '').trim();
  if (clean === '') return null;

  return clean.slice(0, maxLength);
}

const nameSchema = z
  .string({ error: LEAD_NAME_MESSAGE })
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(2, LEAD_NAME_MESSAGE)
      .max(80, LEAD_NAME_MESSAGE)
      .refine((value) => !CONTROL_CHAR.test(value), LEAD_NAME_MESSAGE),
  );

const phoneSchema = z
  .string({ error: LEAD_PHONE_MESSAGE })
  .transform((value, ctx) => {
    const normalized = normalizeByPhone(value);

    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: LEAD_PHONE_MESSAGE });
      return z.NEVER;
    }

    return normalized;
  });

const commentSchema = z
  .string({ error: LEAD_COMMENT_MAX_MESSAGE })
  .transform((value) => value.trim())
  .pipe(z.string().max(1000, LEAD_COMMENT_MAX_MESSAGE))
  .optional()
  .default('');

const itemSchema = z.object({
  slug: z.enum(LEAD_PRODUCT_SLUGS, { error: LEAD_ITEM_SLUG_MESSAGE }),
  qty: z
    .number({ error: LEAD_ITEM_QTY_MESSAGE })
    .int(LEAD_ITEM_QTY_MESSAGE)
    .min(1, LEAD_ITEM_QTY_MESSAGE)
    .max(10, LEAD_ITEM_QTY_MESSAGE),
});

const optionalText = (maxLength: number) =>
  z
    .string()
    .nullable()
    .optional()
    .transform((value) => sanitizeText(value, maxLength));

export const leadAttributionSchema = z.object({
  utmSource: optionalText(200),
  utmMedium: optionalText(200),
  utmCampaign: optionalText(200),
  utmContent: optionalText(200),
  utmTerm: optionalText(200),
  clickIdType: optionalText(50),
  clickId: optionalText(512),
  referrer: optionalText(1000),
  landingPath: optionalText(1000),
  pageUrl: optionalText(1000),
  userAgent: optionalText(500),
});

export type LeadAttribution = z.output<typeof leadAttributionSchema>;

export type LeadItem = z.output<typeof itemSchema>;

function mergeItems(items: LeadItem[]): LeadItem[] {
  const merged = new Map<LeadItem['slug'], number>();

  for (const item of items) {
    merged.set(item.slug, (merged.get(item.slug) ?? 0) + item.qty);
  }

  return [...merged.entries()].map(([slug, qty]) => ({ slug, qty }));
}

export const leadRequestSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    interest: z.enum(['question', 'order'], { error: LEAD_INTEREST_MESSAGE }),
    comment: commentSchema,
    subscription: z.boolean().optional().default(false),
    items: z.array(itemSchema).optional().default([]),
    attribution: leadAttributionSchema.optional(),
  })
  .superRefine((lead, ctx) => {
    if (lead.interest === 'question' && lead.comment.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['comment'],
        message: LEAD_COMMENT_QUESTION_MESSAGE,
      });
    }

    if (lead.interest === 'order' && lead.items.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: LEAD_ITEMS_MESSAGE,
      });
    }
  })
  .transform((lead) => {
    const items = lead.interest === 'order' ? mergeItems(lead.items) : [];

    return {
      ...lead,
      items,
      subscription: lead.interest === 'order' ? lead.subscription : false,
    };
  });

export type LeadRequest = z.output<typeof leadRequestSchema>;
export type LeadRequestInput = z.input<typeof leadRequestSchema>;

/** Русские сообщения по полям — ровно то, что отдаёт API в `fields`. */
export function formatLeadFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const rawField = issue.path[0];
    const field = typeof rawField === 'string' ? rawField : 'form';

    if (!fields[field]) {
      fields[field] = issue.message || 'Проверьте значение';
    }
  }

  return fields;
}
