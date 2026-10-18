type MapEmbedProps = {
  /** Адрес виджета Яндекс.Карт. */
  src: string;
  /** Заголовок iframe для скринридеров. */
  title: string;
};

/**
 * Встроенная карта Яндекс.Карт. iframe рендерится сразу в разметке, но с
 * loading="lazy": браузер загружает карту, не блокируя первую отрисовку.
 * Внешняя ссылка «Открыть в Яндекс.Картах» остаётся в Kontakty.
 */
export default function MapEmbed({ src, title }: MapEmbedProps) {
  return (
    <iframe
      src={src}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="w-full h-[300px] sm:h-[420px] rounded-lg border border-ink/25 bg-paper overflow-hidden"
    />
  );
}
