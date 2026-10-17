import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Кварта — обжарка кофе в Минске',
  description:
    'Маленькая обжарка в Минске: обжариваем по четвергам, развозим по пятницам. Подписка и разовый заказ.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
