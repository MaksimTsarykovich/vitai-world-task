# Эксплуатация: VPS, API, выгрузка заявок, диагностика

Здесь подробности, которые не поместились в README: запуск на своём сервере,
контракт API заявки, работа с базой, скрипты для менеджера, диагностика
Telegram-дубля. Деплой на Vercel — в [`DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md).

## Запуск на VPS (Docker + Caddy)

Нужны VPS с Docker Engine и плагином Compose, домен (A-запись на IP сервера) и
открытые порты 80/443 для Caddy. Приложение слушает `3000`, наружу его публикует
reverse proxy с автоматическим TLS.

```bash
git clone <репозиторий> /srv/kvarta && cd /srv/kvarta   # или git pull на сервере
cp .env.example .env
# в .env: SITE_URL=https://kvarta.example.by и TRUST_PROXY=1
docker compose up -d --build
docker compose ps          # web должен стать healthy
```

Пример `/etc/caddy/Caddyfile` (Caddy сам получит сертификат Let's Encrypt):

```caddyfile
kvarta.example.by {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

За прокси обязательно задайте `SITE_URL` (canonical, OG, robots и sitemap) и
`TRUST_PROXY=1`, иначе лимит запросов увидит один IP прокси. `SITE_URL` передаётся
в сборку и вшивается в статические страницы, поэтому после его изменения нужен
`docker compose up -d --build`. Порт приложения можно не публиковать наружу:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

Обновление версии: `git pull && docker compose up -d --build`.

Контейнер всегда пишет в том `kvarta-data` (`DATABASE_URL=file:/data/kvarta.db`
задан в `compose.yaml`, а не берётся из `.env`) — иначе `docker compose` подхватил
бы адрес Turso из `.env` и VPS-версия молча ушла бы в облако. База и бэкапы лежат
в томе (`/data`), переживают `docker compose restart web` и `docker compose down`,
удаляются только вместе с `docker compose down -v`.

Регулярный бэкап — тем же скриптом из cron (флаг `-T` обязателен: у cron нет TTY):

```cron
0 3 * * * cd /srv/kvarta && docker compose exec -T web node scripts/backup-db.mjs
```

Копии складываются в `/data/backups`; чтобы держать их вне сервера, забирайте
`docker compose cp web:/data/backups/...` или синхронизируйте каталог через `rsync`.

## Заявки: `POST /api/lead`

Контракт и правила — в [`M3-LEAD-API.md`](M3-LEAD-API.md): Zod-валидация,
нормализация белорусского телефона к `+375XXXXXXXXX`, дедупликация 10 минут
(атомарный `INSERT … WHERE NOT EXISTS`), атрибуция из `sessionStorage`, лимит тела
16 КБ и лимит запросов с одного IP. Коды ответа: `201` — принято,
`200 duplicate` — повтор, `400` — ошибки полей, `413` — большое тело, `429` — лимит,
`405` — не POST.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Аня","phone":"+375 29 123-45-67","interest":"order","items":[{"slug":"ethiopia","qty":2}],"subscription":true}'
# повторный тот же запрос в течение 10 минут → 200 duplicate

node web/scripts/smoke-lead.mjs   # 10 параллельных POST → в базе одна строка
```

Smoke-скрипт сам считает строки в базе; если доступа к Docker нет, проверку можно
пропустить: `SMOKE_DB_CHECK=0`.

## Выгрузка заявок и бэкап

Скрипты работают с той же базой, что и приложение: адрес берётся из `DATABASE_URL`
(`file:/data/kvarta.db` в контейнере, `libsql://…` для Turso).

```bash
# CSV в stdout (формат по умолчанию)
docker compose exec web node scripts/export-leads.mjs

# JSON в stdout
docker compose exec web node scripts/export-leads.mjs --format json

# файл внутри контейнера (том /data)
docker compose exec web node scripts/export-leads.mjs --format csv --out /data/leads.csv
docker compose cp web:/data/leads.csv ./leads.csv

# бэкап: /data/backups/kvarta-YYYYMMDD-HHMMSS.db (VACUUM INTO для файла,
# логический дамп для Turso — флаг --dump)
docker compose exec web node scripts/backup-db.mjs
docker compose exec web ls -la /data/backups
```

Локально без Docker:

```bash
cd web
DATABASE_URL=file:./data/kvarta.db node scripts/export-leads.mjs --format json
DATABASE_URL=file:./data/kvarta.db node scripts/backup-db.mjs --out ./data/backups
```

CSV-колонки: `id`, `created_at`, `name`, `phone`, `interest`, `order_items`,
`subscription`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term`, `click_id_type`, `click_id`, `referrer`, `landing_path`, `page_url`,
`telegram_sent`.

Миграция схемы: `npm run db:migrate` (применяет идемпотентно, версия видна в
таблице `schema_migrations`). На Vercel она выполняется на этапе сборки.

## Telegram-дубль заявки

Заявка уходит в Telegram после ответа пользователю (через `after()`), поэтому
Bot API не влияет на время ответа. Ошибка отправки только логируется, заявка
остаётся успешной, а `leads.telegram_sent` остаётся `0`. Чтобы включить, заполните
`TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` и пересоздайте контейнер:
`docker compose up -d --force-recreate`. Без обоих значений функция выключена,
при старте в лог пишется `[startup] Telegram-дубль: включён/выключен`.

Бот должен быть добавлен в канал (лучше администратором), `chat_id` канала —
вида `-100…`; для публичного канала можно указать `@username`.

### Если заявки не приходят в Telegram

1. Проверьте, дошли ли переменные до контейнера:

   ```bash
   docker compose exec web sh -lc 'echo ${#TELEGRAM_BOT_TOKEN} $TELEGRAM_CHAT_ID'
   ```

2. **После правки `.env` нужен пересоздающий запуск** `docker compose up -d --force-recreate`:
   `docker compose restart web` переменные окружения не перечитывает — типичная
   причина «бот молчит».
3. Проверка Bot API напрямую (значения подставьте из `.env`):

   ```bash
   set -a; . ./.env; set +a
   curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
   curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${TELEGRAM_CHAT_ID}"
   curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
     -d "chat_id=${TELEGRAM_CHAT_ID}" -d "text=тест"
   ```

   `ok:false` подсказывает причину: `chat not found` — неверный `chat_id` или бот
   не добавлен, `not enough rights` — бот не администратор.
4. Ошибки отправки пишутся в лог: `docker compose logs web | grep '\[telegram\]'`.
   `статус 401` — неверный токен, `403` — бот не участник канала или без прав.
5. Если у заявки `telegram_sent = 0`, а в логах пусто — переменные не дошли до
   контейнера: вернитесь к пункту 1.

## Метаданные и SEO

`app/opengraph-image.tsx` отдаёт OG-превью 1200×630 (`image/png`) с локальным
шрифтом Literata из `web/public/fonts/` — без внешних запросов на рантайме.
`app/robots.ts` и `app/sitemap.ts` строятся от `SITE_URL`, canonical, Open Graph и
Twitter-мета заданы в `app/layout.tsx`, JSON-LD `LocalBusiness` встроен на главной.

## Переменные окружения

| Переменная | Обязательна | Назначение |
|---|---|---|
| `DATABASE_URL` | да (есть значение по умолчанию) | база: `file:./data/kvarta.db` локально, `file:/data/kvarta.db` в Docker, `libsql://…turso.io` на Vercel |
| `DATABASE_AUTH_TOKEN` | для Turso | токен доступа к базе; для файла не нужен |
| `SITE_URL` | на деплое | публичный адрес: canonical, OG, sitemap |
| `PORT` | нет | порт приложения, по умолчанию 3000 |
| `LEAD_RATE_LIMIT` | нет | лимит `POST /api/lead` с одного IP в минуту, по умолчанию 20 |
| `TRUST_PROXY` | нет | `1` — брать IP из `X-Forwarded-For` за Caddy или Vercel |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | нет | дубль заявки в Telegram, включается только парой |

Секреты в репозиторий не попадают: `.env` в `.gitignore`, в `.env.example` только
имена и безопасные значения.
