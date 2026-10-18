import Container from '@/components/ui/Container';
import SectionLabel from '@/components/ui/SectionLabel';
import LeadForm from '@/components/form/LeadForm';
import { site } from '@/lib/site';

export default function Zayavka() {
  return (
    <section
      id="zayavka"
      className="relative paper-grain bg-espresso text-paper border-b border-ink/25 scroll-mt-24"
      aria-labelledby="form-title"
    >
      <Container className="relative z-10 py-14 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionLabel num="02" label="Заявка" tone="dark" />

            <h2
              id="form-title"
              className="mt-2 font-display font-semibold text-paper leading-[1.03]"
              style={{ fontSize: 'clamp(1.75rem, 4.6vw, 3rem)' }}
            >
              Оставьте заявку — перезвоним
            </h2>

            <p className="mt-5 max-w-[40ch] text-paper/85 leading-relaxed">
              Перезвоним в ближайшее время и оформим заказ. Вы также можете подписаться.
            </p>

            <div className="mt-4 flex flex-col items-start gap-2">
              <p className="inline-flex items-start gap-2 bg-paper/10 border border-paper/20 rounded-md px-4 py-3 text-sm text-paper/90 leading-relaxed">
                Развозим по Минску в пятницу
              </p>
              <p className="inline-flex items-start gap-2 bg-paper/10 border border-paper/20 rounded-md px-4 py-3 text-sm text-paper/90 leading-relaxed">
                От {site.freeDeliveryThreshold} BYN — бесплатно!
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <LeadForm />
          </div>
        </div>
      </Container>
    </section>
  );
}
