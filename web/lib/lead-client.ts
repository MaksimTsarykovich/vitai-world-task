export type LeadInterest = 'question' | 'order';

export type LeadOrderItem = {
  slug: string;
  qty: number;
};

export type LeadPayload = {
  name: string;
  phone: string;
  interest: LeadInterest;
  comment: string;
  sorts: LeadOrderItem[];
  subscription: boolean;
};

export type LeadResult = { kind: 'success' } | { kind: 'duplicate' };

/** Белорусские мобильные коды и минский 17: список расширяем здесь. */
const BY_PHONE = /^(17|25|29|33|44)\d{7}$/;

/** Оставляет только 9 значащих цифр номера: код оператора + 7. */
export function normalizeByPhone(raw: string): string {
  let digits = String(raw ?? '').replace(/\D/g, '');

  if (digits.startsWith('375')) digits = digits.slice(3);
  else if (digits.startsWith('80')) digits = digits.slice(2);

  return digits;
}

export function isValidByPhone(raw: string): boolean {
  return BY_PHONE.test(normalizeByPhone(raw));
}

/**
 * Демонстрация дедупликации до появления сервера: номер из этой сессии
 * повторно даёт дубликат. В #24 проверку делает API.
 */
const submittedPhones = new Set<string>();

export function resetSubmittedPhones(): void {
  submittedPhones.clear();
}

/**
 * Единая точка отправки заявки. Собирает payload и отдаёт результат.
 * TODO(#24): POST /api/lead — интерфейс функции при этом не меняется.
 */
export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  // TODO(#24): POST /api/lead
  await new Promise((resolve) => setTimeout(resolve, 700));

  const key = normalizeByPhone(payload.phone);

  if (submittedPhones.has(key)) {
    return { kind: 'duplicate' };
  }

  submittedPhones.add(key);

  return { kind: 'success' };
}
