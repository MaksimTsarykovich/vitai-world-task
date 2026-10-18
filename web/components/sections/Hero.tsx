import Image from 'next/image';
import Container from '@/components/ui/Container';
import Stamp from '@/components/ui/Stamp';
import { buttonClasses } from '@/components/ui/Button';
import KtoMy from '@/components/sections/KtoMy';

export default function Hero() {
  return (
    <section
      id="kto-my"
      className="relative paper-grain crease border-b border-ink/25 scroll-mt-20"
      aria-labelledby="hero-title"
    >
      <Container className="relative z-10 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7 lg:order-2 lg:pt-6 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-espresso/80">
              Минск · партии по 5 кг · с 2019 года
            </p>

            <h1
              id="hero-title"
              className="mt-5 font-display font-bold text-ink leading-[0.98] tracking-[-0.01em]"
              style={{ fontSize: 'clamp(2.35rem, 8vw, 5.25rem)' }}
            >
              Кофе, который обжарили в&nbsp;четверг
            </h1>

            <KtoMy />

            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a href="#zayavka" className={buttonClasses('primary', 'lg')}>
                Оставить заявку
              </a>
              <a href="#assortiment" className={buttonClasses('secondary', 'lg')}>
                Ассортимент
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 lg:order-1 relative min-w-0">
            <figure className="relative">
              <Image
                src="/images/hero-beans.jpg"
                alt="Мешок обжаренного кофейного зерна из партии мастерской «Кварта»"
                width={900}
                height={1125}
                priority
                fetchPriority="high"
                quality={70}
                sizes="(min-width: 1024px) 38vw, calc(100vw - 2rem)"
                className="w-full h-auto object-cover rounded-lg border border-ink/25 aspect-[4/5]"
              />
            </figure>

            <Stamp className="absolute -top-4 right-2 sm:right-6 tilt-r" />
          </div>
        </div>
      </Container>
    </section>
  );
}
