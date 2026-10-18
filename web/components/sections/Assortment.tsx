import Image from 'next/image';
import Container from '@/components/ui/Container';
import SectionLabel from '@/components/ui/SectionLabel';
import OrderButton from '@/components/form/OrderButton';
import { products } from '@/lib/products';

export default function Assortment() {
  return (
    <section
      id="assortiment"
      className="relative paper-grain bg-cream border-b border-ink/25 scroll-mt-24"
      aria-labelledby="assortiment-title"
    >
      <Container className="relative z-10 py-14 lg:py-20">
        <SectionLabel num="01" label="Наше кофе" />

        <h2
          id="assortiment-title"
          className="mt-2 font-display font-semibold text-ink leading-[1.03]"
          style={{ fontSize: 'clamp(1.75rem, 4.6vw, 3.25rem)' }}
        >
          Что обжариваем сейчас
        </h2>

        <p className="mt-4 max-w-[60ch] text-espresso leading-relaxed">
          Все пачки по 250 г. Нужен помол — напишите в комментарии к заявке.
        </p>

        <div className="mt-8 lg:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {products.map((product) => (
            <article
              key={product.slug}
              className="group flex flex-col bg-paper border border-ink/25 rounded-lg overflow-hidden"
            >
              <Image
                src={product.image}
                alt={product.alt}
                width={600}
                height={450}
                sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 100vw"
                className="w-full h-auto object-cover aspect-[4/3]"
              />

              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold text-ink leading-snug">
                    {product.name}
                  </h3>
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-muted border border-ink/25 rounded-full px-2.5 py-1">
                    {product.weight}
                  </span>
                </div>

                <p className="mt-3 text-sm text-espresso leading-relaxed flex-1">{product.note}</p>

                <p className="mt-4 font-display text-2xl font-semibold text-ink tnum">
                  {product.price}{' '}
                  <span className="text-base font-medium text-espresso">BYN</span>
                </p>

                <OrderButton slug={product.slug} className="mt-4" />
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
