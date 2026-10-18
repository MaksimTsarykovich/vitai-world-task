import type { Metadata, Viewport } from 'next';
import { Literata, Manrope } from 'next/font/google';
import { env } from '@/lib/env';
import './globals.css';

const literata = Literata({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  variable: '--font-literata',
});

const manrope = Manrope({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL ?? 'http://localhost:3000'),
  title: 'Кварта — обжарка кофе в Минске. Кофе, который обжарили в четверг',
  description:
    'Маленькая обжарка в Минске. Обжариваем партиями по 5 кг по четвергам, развозим по пятницам. Зерно у вас на 1–3 день после обжарки. Подписка и разовый заказ.',
  openGraph: {
    type: 'website',
    locale: 'ru_BY',
    siteName: 'Кварта',
    title: 'Кварта — кофе, который обжарили в четверг',
    description:
      'Обжариваем по четвергам, развозим по пятницам. Свежее зерно на 1–3 день после обжарки. Минск, ул. Короля, 9.',
  },
};

export const viewport: Viewport = {
  themeColor: '#3B2A20',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${literata.variable} ${manrope.variable}`}>
      <body className="font-sans bg-paper text-ink antialiased selection:bg-stamp selection:text-paper">
        {children}
      </body>
    </html>
  );
}
