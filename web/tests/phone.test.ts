import { describe, expect, it } from 'vitest';
import {
  BY_PHONE_MESSAGE,
  isValidByPhone,
  maskPhone,
  normalizeByPhone,
} from '@/lib/phone';

describe('Нормализация белорусского телефона', () => {
  it.each([
    ['+375 29 123-45-67', '+375291234567'],
    ['375291234567', '+375291234567'],
    ['80291234567', '+375291234567'],
    ['0291234567', '+375291234567'],
    ['291234567', '+375291234567'],
    ['+375 (17) 123-45-67', '+375171234567'],
    ['+375-25-123-45-67', '+375251234567'],
    ['+375 33 123 45 67', '+375331234567'],
    ['80 44 1234567', '+375441234567'],
    ['  +375 29 123 45 67  ', '+375291234567'],
  ])('принимает %s', (raw, expected) => {
    expect(normalizeByPhone(raw)).toBe(expected);
    expect(isValidByPhone(raw)).toBe(true);
  });

  it.each([
    '',
    '   ',
    '+7 999 123-45-67',
    '+375 11 123-45-67',
    '+375 29 12',
    '+375 29 123-45-678',
    '+375 29 123-45-67 доб. 5',
    'phone',
    '375+291234567',
    '+375 29 123-45-67,',
    null,
    undefined,
  ])('отклоняет %s', (raw) => {
    expect(normalizeByPhone(raw)).toBeNull();
    expect(isValidByPhone(raw)).toBe(false);
  });

  it('маскирует номер для логов', () => {
    expect(maskPhone('+375 29 123-45-67')).toBe('+375 29 ***-**-67');
    expect(maskPhone('+375 17 765-43-21')).toBe('+375 17 ***-**-21');
    expect(maskPhone('не номер')).toBeNull();
  });

  it('отдаёт подсказку для невалидного номера', () => {
    expect(BY_PHONE_MESSAGE).toBe('Введите белорусский номер: +375 29 123-45-67');
  });
});
