/**
 * Контактные данные и факты о мастерской — единый источник для разметки.
 * Телефон, почта и соцсети вымышленные: это тестовое задание, пометка ниже.
 */
export const site = {
  name: 'Кварта',
  legalName: 'ИП «Кварта», УНП 000000000, г. Минск.',
  city: 'Минск',
  address: 'Минск, ул. Короля, 9',
  /** Строка для поиска в Яндекс.Картах. */
  mapQuery: 'Минск, улица Короля 9',
  hours: 'пн–пт 8:00–20:00 · сб–вс 10:00–18:00',
  phone: {
    display: '+375 29 123-45-67',
    tel: '+375291234567',
  },
  email: 'hello@kvarta.by',
  telegram: {
    label: 'Telegram: @kvarta_minsk',
    url: 'https://t.me/kvarta_minsk',
  },
  instagram: {
    label: 'Instagram: @kvarta.minsk',
    url: 'https://instagram.com/kvarta.minsk',
  },
  /** Порог бесплатной доставки по Минску. */
  freeDeliveryThreshold: 50,
  /** Подписка: цена в месяц и состав месячной посылки. */
  subscription: {
    price: 54,
    packs: 2,
    weightGrams: 250,
  },
} as const;

/** Текст свитчера подписки, собранный из фактов выше. */
export const subscriptionLabel =
  `Оформить подписку — ${site.subscription.price} BYN/мес, ` +
  `${site.subscription.packs} пачки по ${site.subscription.weightGrams} г, доставка бесплатно`;
