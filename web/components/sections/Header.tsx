'use client';

import { useEffect, useState } from 'react';
import Container from '@/components/ui/Container';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '#kto-my', label: 'Кто мы' },
  { href: '#assortiment', label: 'Наше кофе' },
  { href: '#kontakty', label: 'Контакты' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-espresso text-paper border-b border-ink shadow-bar">
      <Container>
        <div className="flex h-16 lg:h-20 items-center justify-between gap-4">
          <a
            href="#top"
            className="group flex items-baseline gap-2 shrink-0"
            aria-label="Кварта, на главную"
          >
            <span className="font-display text-2xl lg:text-[28px] font-bold tracking-[0.14em] text-paper group-hover:text-cream transition-colors duration-200">
              КВАРТА
            </span>
          </a>

          <div className="flex items-center gap-5 lg:gap-7">
            <nav
              className="hidden lg:flex items-center gap-7 text-sm font-medium"
              aria-label="Основная навигация"
            >
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-paper/85 hover:text-cream transition-colors duration-200 py-2"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <a
                href="#zayavka"
                className={cn(buttonClasses('primary-dark', 'sm'), 'hidden sm:inline-flex')}
              >
                Оставить заявку
              </a>

              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 -mr-1 text-paper rounded-md border border-paper/30 hover:border-paper hover:bg-ink/40 transition-colors duration-200"
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="2" y1="15" x2="13" y2="15" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <nav
          id="mobile-menu"
          hidden={!open}
          className="lg:hidden border-t border-paper/20 py-3"
          aria-label="Мобильная навигация"
        >
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-paper/90 border-b border-paper/10 hover:text-cream transition-colors duration-200"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  );
}
