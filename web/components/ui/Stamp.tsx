import { cn } from '@/lib/cn';

/** Круглый штамп «обжарено в четверг». Полустёртость — маска из SVG-шума. */
export default function Stamp({ className }: { className?: string }) {
  return (
    <div className={cn('stamp-mark select-none pointer-events-none', className)} aria-hidden="true">
      <div className="flex flex-col items-center justify-center w-[120px] h-[120px] rounded-full border-2 border-stamp text-stamp tilt-l-s">
        <div className="flex flex-col items-center justify-center w-[108px] h-[108px] rounded-full border border-stamp">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em]">обжарено</span>
          <span className="font-display text-base font-bold leading-none my-1">в четверг</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
            Кварта · Минск
          </span>
        </div>
      </div>
    </div>
  );
}
