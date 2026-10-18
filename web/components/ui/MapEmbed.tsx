'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

type MapEmbedProps = {
  /** Адрес виджета Яндекс.Карт. Загружается только по нажатию. */
  src: string;
  /** Заголовок iframe для скринридеров. */
  title: string;
  /** Адрес мастерской — показываем на статичной заглушке. */
  address: string;
};

/**
 * Карта по клику: до нажатия — статичный блок с адресом и кнопкой, после —
 * iframe Яндекс.Карт. Так первый экран не тянет ~4,5 МБ тайлов, сторонние
 * скрипты и чужие cookie. Внешняя ссылка на карту остаётся в Kontakty.
 */
export default function MapEmbed({ src, title, address }: MapEmbedProps) {
  const [shown, setShown] = useState(false);
  const frameClass =
    'w-full h-[300px] sm:h-[420px] rounded-lg border border-ink/25 bg-paper overflow-hidden';

  if (shown) {
    return (
      <iframe
        src={src}
        className={frameClass}
        title={title}
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <div
      className={`${frameClass} flex flex-col items-center justify-center gap-4 px-6 text-center`}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-stamp"
      >
        <path
          d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      </svg>

      <p className="font-display text-lg font-semibold text-ink">{address}</p>

      <p className="max-w-[42ch] text-sm leading-relaxed text-muted">
        Карта Яндекса загрузится только по нажатию — так страница остаётся быстрой
        и без сторонних cookie.
      </p>

      <Button onClick={() => setShown(true)}>Показать карту</Button>
    </div>
  );
}
