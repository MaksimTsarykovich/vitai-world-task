import { dbStatus } from '@/lib/db';
import { env } from '@/lib/env';

// страница читает состояние БД при каждом запросе
export const dynamic = 'force-dynamic';

const STAGES = [
  ['M1', 'Каркас: Next.js, SQLite, Docker — текущий шаг'],
  ['M2', 'Лендинг: блоки ТЗ, адаптив, доступность'],
  ['M3', 'Форма и API: /api/lead, дедупликация, атрибуция'],
  ['M4', 'Плюсы и сдача: Telegram, OG, деплой, Lighthouse'],
];

function dbSummary(): string {
  try {
    const { ok, schemaVersion } = dbStatus();
    return ok ? `SQLite подключена, версия схемы ${schemaVersion}` : 'SQLite отвечает ошибкой';
  } catch (error) {
    console.error('[page] db check failed', error);
    return 'SQLite недоступна — смотрите логи контейнера';
  }
}

export default function Home() {
  const db = dbSummary();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-12 sm:py-16">
      <header className="flex flex-col gap-4 border-b-2 border-ink pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-stamp">
          Каркас приложения · M1
        </p>
        <h1 className="text-4xl leading-none font-semibold sm:text-6xl">Кварта</h1>
        <p className="max-w-xl text-lg text-espresso">
          Обжариваем партиями по 5 кг в Минске: по четвергам печём, по пятницам развозим.
          Это технический каркас — дизайн, тексты и форма заявки появятся на следующих этапах.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-olive">Состояние</h2>
        <dl className="grid gap-2 text-base">
          <div className="flex gap-2">
            <dt className="w-40 text-espresso">Приложение</dt>
            <dd>Next.js, App Router, TypeScript strict</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 text-espresso">База данных</dt>
            <dd>{db}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 text-espresso">Файл БД</dt>
            <dd className="break-all">{env.DATABASE_PATH}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-olive">План этапов</h2>
        <ol className="grid gap-2">
          {STAGES.map(([code, text]) => (
            <li key={code} className="flex gap-3 rounded-sm bg-cream/60 px-4 py-3">
              <span className="font-semibold text-stamp">{code}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="flex flex-col gap-2 border-t border-ink/20 pt-6 text-sm text-espresso">
        <p>
          Проверка живости: <a className="underline" href="/api/health">/api/health</a>
        </p>
        <p>Объём, стек и критерии приёмки — в docs/SPEC.md репозитория.</p>
      </footer>
    </main>
  );
}
