import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // standalone-сборка нужна для минимального production-образа (см. web/Dockerfile)
  output: 'standalone',
  // сетевой/нативный драйвер: не бандлим, подключаем как внешний пакет
  serverExternalPackages: ['@libsql/client', 'libsql'],
  reactStrictMode: true,
  images: {
    // avif отдаётся браузерам с Accept: image/avif (Chrome/Lighthouse), webp — остальным
    formats: ['image/avif', 'image/webp'],
    // quality={70} в next/image должен быть разрешён в конфиге (по умолчанию только 75)
    qualities: [70],
  },
};

export default nextConfig;
