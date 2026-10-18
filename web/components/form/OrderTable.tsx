import { cn } from '@/lib/cn';
import { MAX_QUANTITY, findProduct } from '@/lib/products';

export type OrderItem = {
  slug: string;
  qty: number;
};

type OrderTableProps = {
  items: OrderItem[];
  onIncrease: (slug: string) => void;
  onDecrease: (slug: string) => void;
  onRemove: (slug: string) => void;
};

const qtyButtonClass = (disabled: boolean) =>
  cn(
    'inline-flex items-center justify-center w-6 h-9 text-base transition-colors duration-200',
    disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-ink hover:text-paper',
  );

/**
 * Таблица заказа: Наименование / Кол-во / Сумма и строка «Итого».
 * Строка — по одной на сорт; повторное добавление увеличивает количество.
 */
export default function OrderTable({ items, onIncrease, onDecrease, onRemove }: OrderTableProps) {
  const isEmpty = items.length === 0;
  const total = items.reduce(
    (sum, item) => sum + (findProduct(item.slug)?.price ?? 0) * item.qty,
    0,
  );

  return (
    <div className="mt-3" aria-live="polite">
      <p hidden={!isEmpty} className="text-xs text-muted">
        Выберите сорт и нажмите «Добавить».
      </p>

      <div
        hidden={isEmpty}
        className="overflow-hidden rounded-md border border-ink/25 bg-paper"
      >
        <table className="w-full text-sm tnum">
          <caption className="sr-only">Состав заказа</caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <th scope="col" className="font-bold px-1.5 py-2">
                Наименование
              </th>
              <th
                scope="col"
                className="font-bold px-1.5 py-2 text-center w-[1%] whitespace-nowrap"
              >
                Кол-во
              </th>
              <th
                scope="col"
                className="font-bold px-1.5 py-2 text-right w-[1%] whitespace-nowrap"
              >
                Сумма
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-ink/15">
            {items.map((item) => {
              const product = findProduct(item.slug);
              if (!product) return null;

              return (
                <tr key={item.slug}>
                  <td className="px-1.5 py-2.5 align-middle">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-ink leading-snug">{product.name}</span>
                      <button
                        type="button"
                        onClick={() => onRemove(item.slug)}
                        className="shrink-0 inline-flex items-center justify-center w-6 h-6 -mt-0.5 rounded-md text-espresso hover:bg-stamp hover:text-paper transition-colors duration-200"
                        aria-label={`Удалить: ${product.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </td>

                  <td className="px-1.5 py-2.5 align-middle">
                    <div className="inline-flex items-center overflow-hidden rounded-md border border-ink/30 bg-paper">
                      <button
                        type="button"
                        onClick={() => onDecrease(item.slug)}
                        disabled={item.qty <= 1}
                        className={cn(qtyButtonClass(item.qty <= 1), 'rounded-l-md')}
                        aria-label={`Уменьшить количество: ${product.name}`}
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm text-ink tnum">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => onIncrease(item.slug)}
                        disabled={item.qty >= MAX_QUANTITY}
                        className={cn(qtyButtonClass(item.qty >= MAX_QUANTITY), 'rounded-r-md')}
                        aria-label={`Увеличить количество: ${product.name}`}
                      >
                        +
                      </button>
                    </div>
                  </td>

                  <td className="px-1.5 py-2.5 text-right align-middle whitespace-nowrap text-ink">
                    {product.price * item.qty} BYN
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-ink/30">
              <td className="px-1.5 py-3 font-semibold text-ink">Итого</td>
              <td className="px-1.5 py-3" />
              <td className="px-1.5 py-3 text-right font-semibold text-ink whitespace-nowrap">
                {total} BYN
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
