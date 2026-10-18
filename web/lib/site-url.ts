import { env } from '@/lib/env';

/**
 * Публичный адрес сайта для canonical, OG, robots и sitemap. На деплое задаётся
 * через SITE_URL; на localhost по умолчанию http://localhost:3000.
 */
export const siteUrl = env.SITE_URL ?? 'http://localhost:3000';
