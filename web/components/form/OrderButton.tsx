'use client';

import Button from '@/components/ui/Button';
import { requestOrder } from '@/lib/order-intent';

type OrderButtonProps = {
  slug: string;
  className?: string;
};

/** «Заказать» в карточке товара: включает режим заказа в форме и добавляет сорт. */
export default function OrderButton({ slug, className }: OrderButtonProps) {
  return (
    <Button variant="invert" size="sm" className={className} onClick={() => requestOrder(slug)}>
      Заказать
    </Button>
  );
}
