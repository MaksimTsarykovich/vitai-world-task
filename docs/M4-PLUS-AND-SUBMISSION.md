# M4: плюсы, SEO и обслуживание (issue #25)

Задача: добавить необязательные плюсы из ТЗ, метаданные и инструменты для менеджера,
подготовить приложение к деплою. Дизайн и вёрстку не трогаем.

**Процесс:** правь `web/` прямо в репозитории. Не снимай скриншоты, не запускай
headless-браузер и Lighthouse, не создавай копии в `/tmp`, не коммить. В конце отчёт.

## 1. Дублирование заявки в Telegram

1. `web/lib/telegram.ts`: `notifyTelegram(lead)` — отправка `POST
   https://api.telegram.org/bot<token>/sendMessage` с `chat_id` из env.
2. Включено только если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`; иначе
   функция молча выключена. Таймаут 2 с (`AbortSignal.timeout(2000)`).
3. Вызов — после ответа пользователю через `after()` из `next/server`, чтобы
   Telegram не влиял на время ответа.
4. Ошибка отправки только логируется, заявка не откатывается и не становится
   ошибочной; при успехе в `leads.telegram_sent` пишется `1`.
5. Текст сообщения: имя, телефон, интерес (вопрос/заказ), сорта с количеством и суммой,
   подписка да/нет, источник (utm/referrer/landing path), комментарий, id заявки.
   Без markdown-разметки, чтобы не ломать отправку.
6. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — необязательные, добавить в
   `web/lib/env.ts`, `.env.example` и прокинуть в `compose.yaml` пустыми значениями.
7. Тесты с моками `fetch`: отправляет при заданных env, ничего не делает без них,
   ошибка Telegram не ломает ответ и не пишет `telegram_sent`.

## 2. Метаданные, OG, robots, sitemap

8. `web/app/opengraph-image.tsx` — `ImageResponse` 1200×630: название «КВАРТА»,
   строка «Кофе, который обжарили в четверг», «Минск · партии по 5 кг · с 2019»
   в палитре макета (`#F2EBDD` фон, `#221A15` текст, `#B4452F` акцент).
   Для кириллицы нужен локальный шрифт: скачай Literata (700, `woff`/`ttf` с
   кириллицей) в `web/public/fonts/`, читай файл через `fs` и передавай в
   `ImageResponse` — без внешних запросов на рантайме.
9. `app/layout.tsx`: `metadata` — `title`/`description` (из макета), `alternates.canonical`
   от `SITE_URL`, `openGraph` (title, description, images), `twitter: summary_large_image`,
   `metadataBase` из `SITE_URL`. На localhost `SITE_URL` по умолчанию `http://localhost:3000`.
10. `web/app/robots.ts` — разрешить всё, указать `sitemap` от `SITE_URL`.
11. `web/app/sitemap.ts` — одна страница `/` с `lastModified`.
12. JSON-LD (`Store`/`LocalBusiness`) инлайном на странице: название, адрес
    (Минск, ул. Короля 9), часы работы, телефон, `priceRange`, ссылка на сайт.

## 3. Инструменты для менеджера

13. `web/scripts/export-leads.mjs` — выгрузка заявок: по умолчанию CSV в stdout,
    флаги `--format csv|json`, `--out <путь>`. Колонки: id, created_at, name, phone,
    interest, order_items, subscription, utm_source/medium/campaign/content/term,
    click_id_type, click_id, referrer, landing_path, page_url, telegram_sent.
    Работает с `DATABASE_PATH` (в Docker файл `/data/kvarta.db`).
14. `web/scripts/backup-db.mjs` — консистентная копия через `.backup()` из
    `better-sqlite3` в `/data/backups/kvarta-YYYYMMDD-HHMMSS.db` (каталог создаётся).
15. Оба скрипта задокументировать в README: как запускать локально и в контейнере
    (`docker compose exec web node scripts/export-leads.mjs`).

## 4. Деплой (документация, не запуск)

16. README, раздел «Деплой на VPS»: требования (Docker + Docker Compose, домен),
    `git pull`, `cp .env.example .env`, `docker compose up -d --build`,
    пример `Caddyfile` (`reverse_proxy 127.0.0.1:3000`, автоматический TLS),
    `SITE_URL` и `TRUST_PROXY=1` за прокси, обновление (`git pull && docker compose
    up -d --build`), бэкап (скрипт), просмотр заявок (экспорт).
17. В `.env.example` привести полный список: `DATABASE_PATH`, `SITE_URL`,
    `PORT`, `LEAD_RATE_LIMIT`, `TRUST_PROXY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## 5. Проверки

```bash
cd web && npm run lint && npm run typecheck && npm test && npm run build
cd .. && docker compose up -d --build && docker compose ps
curl -s localhost:3000/robots.txt
curl -s localhost:3000/sitemap.xml
curl -s -o /tmp/og.png -w '%{http_code} %{content_type} %{size_download}\n' localhost:3000/opengraph-image
curl -s localhost:3000/ | grep -o -E '<meta[^>]+(og:|twitter:|canonical)[^>]*>' | head -8
curl -s -X POST localhost:3000/api/lead -H 'Content-Type: application/json' \
  -d '{"name":"Тест M4","phone":"+375 44 555-33-22","interest":"question","comment":"проверка"}'
docker compose exec web node scripts/export-leads.mjs --format csv | head -3
docker compose exec web node scripts/backup-db.mjs && docker compose exec web ls -la /data/backups
```

- [ ] Telegram: без env функция выключена и заявка сохраняется с `telegram_sent = 0`,
      с моками тесты зелёные.
- [ ] OG-картинка отдаётся `image/png` 1200×630, текст на картинке с кириллицей.
- [ ] `robots.txt` и `sitemap.xml` валидны, canonical и OG-мета в HTML.
- [ ] JSON-LD присутствует и валиден как JSON.
- [ ] Экспорт отдаёт CSV с заявками, бэкап создаёт файл в `/data/backups`.
- [ ] `lint`, `typecheck`, `test`, `build` зелёные, контейнер `healthy`.
- [ ] Отчёт: файлы, код ответов проверок, размер OG-картинки, вывод экспорта.
