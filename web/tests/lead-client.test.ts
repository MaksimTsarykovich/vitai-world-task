import { beforeEach, describe, expect, it } from 'vitest';
import {
  isValidByPhone,
  normalizeByPhone,
  resetSubmittedPhones,
  submitLead,
  type LeadPayload,
} from '@/lib/lead-client';

const payload: LeadPayload = {
  name: 'Аня',
  phone: '+375 29 123-45-67',
  interest: 'order',
  comment: '',
  sorts: [{ slug: 'ethiopia', qty: 2 }],
  subscription: false,
};

describe('Телефон и отправка заявки', () => {
  beforeEach(() => resetSubmittedPhones());

  it('нормализует белорусские номера к виду 9 цифр', () => {
    expect(normalizeByPhone('+375 29 123-45-67')).toBe('291234567');
    expect(normalizeByPhone('80291234567')).toBe('291234567');
    expect(normalizeByPhone('+375291234567')).toBe('291234567');
  });

  it('принимает мобильные коды и минский 17, отклоняет остальное', () => {
    expect(isValidByPhone('+375 25 123-45-67')).toBe(true);
    expect(isValidByPhone('+375 17 123-45-67')).toBe(true);
    expect(isValidByPhone('+375 29 12')).toBe(false);
    expect(isValidByPhone('+7 999 123-45-67')).toBe(false);
    expect(isValidByPhone('')).toBe(false);
  });

  it('первая заявка проходит, повтор с того же номера — дубликат', async () => {
    await expect(submitLead(payload)).resolves.toEqual({ kind: 'success' });
    await expect(submitLead(payload)).resolves.toEqual({ kind: 'duplicate' });
  });
});
