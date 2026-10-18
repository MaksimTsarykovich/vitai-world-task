import Assortment from '@/components/sections/Assortment';
import Footer from '@/components/sections/Footer';
import Header from '@/components/sections/Header';
import Hero from '@/components/sections/Hero';
import Kontakty from '@/components/sections/Kontakty';
import Zayavka from '@/components/sections/Zayavka';
import RevealEffect from '@/components/ui/RevealEffect';
import StickyCta from '@/components/ui/StickyCta';

export default function Home() {
  return (
    <>
      <a
        href="#zayavka"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-ink focus:text-paper focus:px-4 focus:py-2 focus:rounded-md"
      >
        Перейти к форме заявки
      </a>

      <RevealEffect />
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
