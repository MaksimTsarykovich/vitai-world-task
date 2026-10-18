/**
 * Белорусские телефоны: принимаем +375…, 375…, 80…, 0… и локальные 9 цифр,
 * с пробелами, дефисами и скобками. Храним и отдаём только +375XXXXXXXXX.
 */
export const BY_PHONE_MESSAGE = 'Введите белорусский номер: +375 29 123-45-67';

/** Мобильные коды и минский 17. */
const BY_OPERATOR = /^(17|25|29|33|44)\d{7}$/;

/** Разрешённые символы: цифры, пробелы, дефисы, скобки и ведущий плюс. */
const FORMATTING = /^\+?[\d\s()-]+$/;

/**
 * Приводит номер к +375XXXXXXXXX. Возвращает null, если номер не белорусский
 * или содержит посторонние символы.
 */
export function normalizeByPhone(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim();

  if (value === '' || !FORMATTING.test(value)) return null;
  if (value.includes('+') && !value.startsWith('+')) return null;

  let digits = value.replace(/\D/g, '');

  if (value.startsWith('+') && !digits.startsWith('375')) return null;

  if (digits.startsWith('375')) digits = digits.slice(3);
  else if (digits.startsWith('80')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  if (!BY_OPERATOR.test(digits)) return null;

  return `+375${digits}`;
}

export function isValidByPhone(raw: string | null | undefined): boolean {
  return normalizeByPhone(raw) !== null;
}

/**
 * Маскирует нормализованный номер для логов: +375 29 ***-**-67.
 * Невалидные номера не логируем.
 */
export function maskPhone(raw: string | null | undefined): string | null {
  const normalized = normalizeByPhone(raw);
  if (!normalized) return null;

  const rest = normalized.slice(4); // 9 цифр: код оператора + 7
  return `+375 ${rest.slice(0, 2)} ***-**-${rest.slice(-2)}`;
}
