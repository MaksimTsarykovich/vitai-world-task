import { describe, expect, it } from 'vitest';
import {
  LEAD_PRODUCT_SLUGS,
  formatLeadFieldErrors,
  leadRequestSchema,
  sanitizeText,
} from '@/lib/lead-schema';
import { products } from '@/lib/products';

const base = {
  name: 'Аня',
  phone: '+375 29 123-45-67',
  interest: 'order' as const,
  comment: '',
  items: [{ slug: 'ethiopia' as const, qty: 2 }],
};

describe('Zod-схема заявки', () => {
  it('нормализует телефон и подставляет значения по умолчанию', () => {
    const parsed = leadRequestSchema.parse(base);

    expect(parsed.phone).toBe('+375291234567');
    expect(parsed.name).toBe('Аня');
    expect(parsed.subscription).toBe(false);
  });

  it.each([
    ['Ан', true],
    ['Аня', true],
    ['А'.repeat(80), true],
    ['А', false],
    ['А'.repeat(81), false],
    ['   ', false],
    ['Аня\u0000', false],
  ])('проверяет границы имени (%s)', (name, valid) => {
    const result = leadRequestSchema.safeParse({ ...base, name });

    expect(result.success).toBe(valid);

    if (!result.success) {
      expect(formatLeadFieldErrors(result.error).name).toBe('Укажите имя (2–80 символов)');
    }
  });

  it('отклоняет небелорусский телефон с подсказкой', () => {
    const result = leadRequestSchema.safeParse({ ...base, phone: '+7 999 123-45-67' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatLeadFieldErrors(result.error).phone).toBe(
        'Введите белорусский номер: +375 29 123-45-67',
      );
    }
  });

  it('принимает только question и order', () => {
    const result = leadRequestSchema.safeParse({ ...base, interest: 'gift' });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(formatLeadFieldErrors(result.error).interest).toBe('Выберите, что интересует');
    }
  });

  it('для вопроса требует непустой комментарий', () => {
    const empty = leadRequestSchema.safeParse({
      name: 'Аня',
      phone: '+375291234567',
      interest: 'question',
      comment: '   ',
      items: [],
    });

    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(formatLeadFieldErrors(empty.error).comment).toBe('Напишите вопрос');
    }

    const filled = leadRequestSchema.parse({
      name: 'Аня',
      phone: '+375291234567',
      interest: 'question',
      comment: '  Есть ли помол под воронку?  ',
      items: [],
      subscription: true,
    });

    expect(filled.comment).toBe('Есть ли помол под воронку?');
    expect(filled.subscription).toBe(false);
    expect(filled.items).toEqual([]);
  });

  it('для заказа требует items и проверяет слаги/количество', () => {
    const empty = leadRequestSchema.safeParse({ ...base, items: [] });
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(formatLeadFieldErrors(empty.error).items).toBe('Добавьте хотя бы один сорт кофе');
    }

    expect(leadRequestSchema.safeParse({ ...base, items: [{ slug: 'gift', qty: 1 }] }).success).toBe(
      false,
    );
    expect(
      leadRequestSchema.safeParse({ ...base, items: [{ slug: 'ethiopia', qty: 0 }] }).success,
    ).toBe(false);
    expect(
      leadRequestSchema.safeParse({ ...base, items: [{ slug: 'ethiopia', qty: 11 }] }).success,
    ).toBe(false);
    expect(
      leadRequestSchema.safeParse({ ...base, items: [{ slug: 'ethiopia', qty: 1.5 }] }).success,
    ).toBe(false);
  });

  it('складывает дубли слагов в количестве', () => {
    const parsed = leadRequestSchema.parse({
      ...base,
      subscription: true,
      items: [
        { slug: 'ethiopia', qty: 2 },
        { slug: 'colombia', qty: 1 },
        { slug: 'ethiopia', qty: 3 },
      ],
    });

    expect(parsed.items).toEqual([
      { slug: 'ethiopia', qty: 5 },
      { slug: 'colombia', qty: 1 },
    ]);
    expect(parsed.subscription).toBe(true);
  });

  it('ограничивает комментарий 1000 символами', () => {
    const result = leadRequestSchema.safeParse({ ...base, comment: 'x'.repeat(1001) });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatLeadFieldErrors(result.error).comment).toBe(
        'Комментарий — не больше 1000 символов',
      );
    }

    expect(leadRequestSchema.parse({ ...base, comment: 'x'.repeat(1000) }).comment).toHaveLength(
      1000,
    );
  });

  it('чистит и обрезает атрибуцию', () => {
    const parsed = leadRequestSchema.parse({
      ...base,
      attribution: {
        utmSource: `  inst\u0000agram  `,
        utmMedium: 'm'.repeat(250),
        clickIdType: 'yclid',
        clickId: '1'.repeat(600),
        referrer: 'r'.repeat(1200),
        landingPath: '/?utm_source=instagram',
        pageUrl: 'https://example.by/#zayavka',
        utmTerm: '',
      },
    });

    expect(parsed.attribution?.utmSource).toBe('instagram');
    expect(parsed.attribution?.utmMedium).toHaveLength(200);
    expect(parsed.attribution?.clickId).toHaveLength(512);
    expect(parsed.attribution?.referrer).toHaveLength(1000);
    expect(parsed.attribution?.utmTerm).toBeNull();
  });

  it('sanitizeText вырезает управляющие символы и пустые строки', () => {
    expect(sanitizeText('  a\u0000b\nc  ', 10)).toBe('abc');
    expect(sanitizeText('   ', 10)).toBeNull();
    expect(sanitizeText('abcdef', 3)).toBe('abc');
    expect(sanitizeText(null, 3)).toBeNull();
  });
});

describe('Слаги сортов — единый источник products', () => {
  it('список слагов схемы совпадает с products по составу и порядку', () => {
    expect(LEAD_PRODUCT_SLUGS).toEqual(products.map((product) => product.slug));
  });

  it('принимает каждый слаг из products в items заказа', () => {
    for (const product of products) {
      const result = leadRequestSchema.safeParse({
        ...base,
        items: [{ slug: product.slug, qty: 1 }],
      });

      expect(result.success, `слаг «${product.slug}» должен приниматься схемой`).toBe(true);
    }
  });

  it('отклоняет несуществующий слаг с сообщением «Выберите сорт из ассортимента»', () => {
    const result = leadRequestSchema.safeParse({
      ...base,
      items: [{ slug: 'gift', qty: 1 }],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(formatLeadFieldErrors(result.error).items).toBe('Выберите сорт из ассортимента');
    }
  });
});
