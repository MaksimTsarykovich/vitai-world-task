import Container from '@/components/ui/Container';
import SectionLabel from '@/components/ui/SectionLabel';
import { site } from '@/lib/site';

const mapQuery = encodeURIComponent(site.mapQuery);
const mapEmbedSrc = `https://yandex.by/map-widget/v1/?text=${mapQuery}&z=17`;
const mapLink = `https://yandex.by/maps/?text=${mapQuery}`;

const linkClass =
  'text-ink underline decoration-stamp/50 underline-offset-4 hover:decoration-stamp transition-colors duration-200';

export default function Kontakty() {
  return (
    <section
      id="kontakty"
      className="relative paper-grain bg-cream scroll-mt-24"
      aria-labelledby="kontakty-title"
    >
      <Container className="relative z-10 py-14 lg:py-20">
        <SectionLabel num="03" label="Контакты" />

        <h2
          id="kontakty-title"
          className="mt-2 font-display font-semibold text-ink leading-[1.03]"
          style={{ fontSize: 'clamp(1.75rem, 4.6vw, 3.25rem)' }}
        >
          Как нас найти
        </h2>

        <div className="mt-8 lg:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-7">
            <iframe
              src={mapEmbedSrc}
              className="w-full h-[300px] sm:h-[420px] rounded-lg border border-ink/25 bg-paper"
              loading="lazy"
              title="Яндекс.Карта: Минск, улица Короля, 9"
              referrerPolicy="no-referrer-when-downgrade"
            />

            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-4 flex items-center justify-between gap-4 bg-espresso text-paper rounded-lg px-5 py-4 min-h-[64px] hover:bg-ink transition-colors duration-200"
            >
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-paper/70">
                  Открыть в Яндекс.Картах
                </span>
                <span className="block mt-1 font-display text-lg font-semibold">
                  {site.address}
                </span>
              </span>
            </a>
          </div>

          <div className="lg:col-span-5">
            <dl className="bg-paper border border-ink/25 rounded-lg p-6 space-y-5">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  Адрес
                </dt>
                <dd className="mt-1 text-ink leading-relaxed">{site.address}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  Часы работы
                </dt>
                <dd className="mt-1 text-ink leading-relaxed tnum">{site.hours}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  Телефон
                </dt>
                <dd className="mt-1">
                  <a href={`tel:${site.phone.tel}`} className={linkClass}>
                    {site.phone.display}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  Почта и соцсети
                </dt>
                <dd className="mt-1 space-y-2 text-[15px]">
                  <span className="block">
                    <a href={`mailto:${site.email}`} className={linkClass}>
                      {site.email}
                    </a>
                  </span>
                  <span className="block">
                    <a
                      href={site.telegram.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {site.telegram.label}
                    </a>
                  </span>
                  <span className="block">
                    <a
                      href={site.instagram.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {site.instagram.label}
                    </a>
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
