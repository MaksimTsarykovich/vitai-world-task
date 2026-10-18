import Container from '@/components/ui/Container';
import { site } from '@/lib/site';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative paper-grain bg-espresso text-paper">
      <Container className="relative z-10 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="font-display text-3xl font-bold tracking-[0.14em] text-paper">КВАРТА</p>
            <p className="mt-4 text-paper/70 leading-relaxed max-w-[38ch]">
              Маленькая обжарка в Минске. Обжариваем по четвергам, развозим по пятницам.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-paper/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-paper/60">
          <p>{site.legalName}</p>
          <p>
            © {year} {site.name}. Все цены в белорусских рублях.
          </p>
        </div>
      </Container>
    </footer>
  );
}
