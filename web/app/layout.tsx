import type { Metadata, Viewport } from 'next';
import { Literata, Manrope } from 'next/font/google';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

const literata = Literata({
  subsets: ['cyrillic', 'latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-literata',
});

const manrope = Manrope({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-manrope',
  // не прелоадим: текстовый шрифт не LCP-элемент, уступает приоритет hero-картинке
  preload: false,
});

const OG_IMAGE_ALT = 'Кварта — кофе, который обжарили в четверг';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Кварта — обжарка кофе в Минске. Кофе, который обжарили в четверг',
  description:
    'Маленькая обжарка в Минске. Обжариваем партиями по 5 кг по четвергам, развозим по пятницам. Зерно у вас на 1–3 день после обжарки. Подписка и разовый заказ.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_BY',
    siteName: 'Кварта',
    url: '/',
    title: 'Кварта — кофе, который обжарили в четверг',
    description:
      'Обжариваем по четвергам, развозим по пятницам. Свежее зерно на 1–3 день после обжарки. Минск, ул. Короля, 9.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Кварта — кофе, который обжарили в четверг',
    description:
      'Обжариваем по четвергам, развозим по пятницам. Свежее зерно на 1–3 день после обжарки. Минск, ул. Короля, 9.',
    images: ['/opengraph-image'],
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
