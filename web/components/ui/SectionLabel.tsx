import { cn } from '@/lib/cn';

type SectionLabelProps = {
  /** Номер секции: 01 ассортимент, 02 заявка, 03 контакты. */
  num: string;
  /** Подпись секции. */
  label: string;
  tone?: 'light' | 'dark';
};

/** Подпись секции с контурным номером: цифра декоративная, поэтому aria-hidden. */
export default function SectionLabel({ num, label, tone = 'light' }: SectionLabelProps) {
  return (
    <div className="flex items-baseline gap-3 sm:gap-4">
      <span
        aria-hidden="true"
        className={cn(
          'section-num font-display text-3xl sm:text-4xl lg:text-5xl leading-none',
          tone === 'dark' && 'section-num-dark',
        )}
      >
        {num}
      </span>
      <p
        className={cn(
          'text-[11px] font-bold uppercase tracking-[0.24em]',
          tone === 'dark' ? 'text-paper/70' : 'text-espresso/80',
        )}
      >
        {label}
      </p>
    </div>
  );
}
