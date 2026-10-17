import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // standalone-сборка нужна для минимального production-образа (см. web/Dockerfile)
  output: 'standalone',
  // нативный модуль: не бандлим, подключаем как внешний пакет
  serverExternalPackages: ['better-sqlite3'],
  reactStrictMode: true,
};

export default nextConfig;
