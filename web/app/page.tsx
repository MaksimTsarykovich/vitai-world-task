import Assortment from '@/components/sections/Assortment';
import Footer from '@/components/sections/Footer';
import Header from '@/components/sections/Header';
import Hero from '@/components/sections/Hero';
import Kontakty from '@/components/sections/Kontakty';
import Zayavka from '@/components/sections/Zayavka';
import StickyCta from '@/components/ui/StickyCta';
import { site } from '@/lib/site';
import { siteUrl } from '@/lib/site-url';

/** JSON-LD LocalBusiness: контакты, адрес, часы и диапазон цен для поиска. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: site.name,
  url: siteUrl,
  telephone: site.phone.tel,
  priceRange: '18–54 BYN',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'ул. Короля, 9',
    addressLocality: 'Минск',
    addressCountry: 'BY',
  },
  openingHours: ['Mo-Fr 08:00-20:00', 'Sa-Su 10:00-18:00'],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD — статический объект; экранируем `<`, чтобы данные не закрыли тег.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <a
        href="#zayavka"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-ink focus:text-paper focus:px-4 focus:py-2 focus:rounded-md"
      >
        Перейти к форме заявки
      </a>

      <Header />

      <main id="top">
        <Hero />
        <Assortment />
        <Zayavka />
        <Kontakty />
      </main>

      <Footer />
      <StickyCta />
    </>
  );
}
