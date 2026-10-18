export type ProductSlug = 'ethiopia' | 'colombia' | 'brazil' | 'drip';

export type Product = {
  slug: ProductSlug;
  name: string;
  /** Нота вкуса — короткая строка из макета. */
  note: string;
  /** Вес или количество в упаковке: «250 г» / «10 шт». */
  weight: string;
  /** Цена в BYN из макета: 32 / 29 / 26 / 18. */
  price: number;
  /** Фото в web/public/images, скачано из макета. */
  image: string;
  alt: string;
};

export const products: Product[] = [
  {
    slug: 'ethiopia',
    name: 'Эфиопия Иргачеффе',
    note: 'Цветочный, бергамот, светлая обжарка.',
    weight: '250 г',
    price: 32,
    image: '/images/ethiopia.jpg',
    alt: 'Обжаренные зёрна Эфиопии Иргачеффе крупным планом',
  },
  {
    slug: 'colombia',
    name: 'Колумбия Уила',
    note: 'Карамель, красное яблоко.',
    weight: '250 г',
    price: 29,
    image: '/images/colombia.jpg',
    alt: 'Обжаренное зерно Колумбия Уила в белой чашке',
  },
  {
    slug: 'brazil',
    name: 'Бразилия Серрадо',
    note: 'Орех, шоколад, под эспрессо.',
    weight: '250 г',
    price: 26,
    image: '/images/brazil.jpg',
    alt: 'Эспрессо из Бразилии Серрадо в стеклянной чашке на блюдце',
  },
  {
    slug: 'drip',
    name: 'Дрип-пакеты, ассорти',
    note: 'Завариваются в чашку кипятком.',
    weight: '10 шт',
    price: 18,
    image: '/images/drip.jpg',
    alt: 'Заваривание кофе через воронку: струя воды льётся в стеклянный сосуд',
  },
];

/** Сколько раз один сорт можно добавить в таблицу заказа. */
export const MAX_QUANTITY = 10;

export function findProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}
