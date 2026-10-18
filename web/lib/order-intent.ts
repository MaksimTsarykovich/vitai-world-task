/**
 * «Заказать» в карточке товара должен включить в форме режим заказа и добавить
 * сорт. Карточки — серверные, форма — клиентская, поэтому связываем их событием,
 * а не общим состоянием.
 */
export const ORDER_INTENT_EVENT = 'kvarta:order';

export type OrderIntentDetail = { slug: string };

export function requestOrder(slug: string): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<OrderIntentDetail>(ORDER_INTENT_EVENT, { detail: { slug } }));
}

export function onOrderIntent(handler: (slug: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<OrderIntentDetail>).detail;
    handler(detail.slug);
  };

  window.addEventListener(ORDER_INTENT_EVENT, listener);

  return () => window.removeEventListener(ORDER_INTENT_EVENT, listener);
}
