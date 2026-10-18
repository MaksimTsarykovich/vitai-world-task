import type { LeadAttribution } from '@/lib/lead-schema';

export const ATTRIBUTION_STORAGE_KEY = 'kvarta:attribution';

const UTM_KEYS = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_content', 'utmContent'],
  ['utm_term', 'utmTerm'],
] as const;

const CLICK_IDS = ['yclid', 'gclid', 'fbclid'] as const;

type StoredAttribution = Omit<LeadAttribution, 'pageUrl' | 'userAgent'>;

function readClickId(params: URLSearchParams): { clickIdType: string | null; clickId: string | null } {
  for (const type of CLICK_IDS) {
    const value = params.get(type);
    if (value) return { clickIdType: type, clickId: value };
  }

  return { clickIdType: null, clickId: null };
}

function capture(): StoredAttribution {
  const params = new URLSearchParams(window.location.search);
  const attribution: StoredAttribution = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    ...readClickId(params),
    referrer: document.referrer || null,
    landingPath: `${window.location.pathname}${window.location.search}`,
  };

  for (const [queryKey, field] of UTM_KEYS) {
    attribution[field] = params.get(queryKey);
  }

  return attribution;
}

function readStored(): StoredAttribution | null {
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredAttribution>;
    if (typeof parsed !== 'object' || parsed === null) return null;

    return {
      utmSource: parsed.utmSource ?? null,
      utmMedium: parsed.utmMedium ?? null,
      utmCampaign: parsed.utmCampaign ?? null,
      utmContent: parsed.utmContent ?? null,
      utmTerm: parsed.utmTerm ?? null,
      clickIdType: parsed.clickIdType ?? null,
      clickId: parsed.clickId ?? null,
      referrer: parsed.referrer ?? null,
      landingPath: parsed.landingPath ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Метки первого захода в рамках вкладки. Храним в sessionStorage, cookies не
 * используем: при отправке добавляем текущий pageUrl с якорем формы.
 */
export function getAttribution(): LeadAttribution | undefined {
  if (typeof window === 'undefined') return undefined;

  let stored = readStored();

  if (!stored) {
    stored = capture();

    try {
      window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Приватный режим/запрет storage: отправляем хотя бы текущий заход.
    }
  }

  return { ...stored, pageUrl: window.location.href, userAgent: null };
}
