'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

/** Липкая кнопка на мобильных: появляется после первого экрана. */
export default function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      href="#zayavka"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        'lg:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-center min-h-[52px] bg-stamp text-paper font-semibold rounded-md border border-stamp shadow-lift transition-[opacity,transform] duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
      )}
    >
      Оставить заявку
    </a>
  );
}
