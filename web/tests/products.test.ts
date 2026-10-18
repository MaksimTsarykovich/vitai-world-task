import { describe, expect, it } from 'vitest';
import { MAX_QUANTITY, findProduct, products } from '@/lib/products';

describe('Ассортимент', () => {
  it('четыре позиции с ценами из ТЗ', () => {
    expect(products.map((product) => [product.slug, product.price])).toEqual([
      ['ethiopia', 32],
      ['colombia', 29],
      ['brazil', 26],
      ['drip', 18],
    ]);
  });

  it('у зерна вес 250 г, у дрип-пакетов — 10 шт', () => {
    expect(products.filter((product) => product.weight === '250 г')).toHaveLength(3);
    expect(findProduct('drip')?.weight).toBe('10 шт');
  });

  it('находит сорт по slug и не находит неизвестный', () => {
    expect(findProduct('ethiopia')?.name).toBe('Эфиопия Иргачеффе');
    expect(findProduct('gift')).toBeUndefined();
  });

  it('ограничивает количество десятью', () => {
    expect(MAX_QUANTITY).toBe(10);
  });
});
