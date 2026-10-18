# Кварта — лендинг обжарки кофе

Тестовое задание: одностраничный лендинг маленькой минской обжарки «Кварта» с
рабочей формой заявки. Корзины и онлайн-оплаты нет — менеджер перезванивает и
оформляет заказ.

- Исходное ТЗ: <https://tz.vitai.world/>
- Дедлайн: 19.10.2026, 18:00 МСК
- Спецификация: [`docs/SPEC.md`](docs/SPEC.md) — единственный источник правды по
  объёму, стеку и критериям приёмки.

## Стек

| Слой | Решение |
|---|---|
| Приложение | Next.js 16 (App Router, React 19) + TypeScript strict |
| Стили | Tailwind CSS 4 + собственные design tokens |
| Данные | SQLite-совместимая база через `@libsql/client`: файл в томе (VPS) или Turso по сети (Vercel) |
| Валидация | Zod — одна схема для клиента и сервера |
| Тесты | Vitest |
| Запуск | Docker multi-stage (`output: 'standalone'`) + Docker Compose |
| Прод | два пути из одного кода: VPS + Caddy (Docker/SQLite) и Vercel + Turso — [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) |

## Структура

```text
.
├── web/          # приложение: Next.js, компоненты, API, тесты, Dockerfile
├── docs/SPEC.md  # спецификация
├── compose.yaml  # приложение + том с базой SQLite
├── .env.example  # переменные окружения без секретов
└── README.md
```

## Статус

Все этапы из [`docs/SPEC.md`](docs/SPEC.md), §8 пройдены, задачи закрыты в GitHub Issues:

- **M0. Планирование** — спецификация первым коммитом репозитория;
- **M1. Каркас** — Next.js, SQLite, Docker, healthcheck ([#21](../../issues/21));
- **M2. Лендинг** — блоки ТЗ, адаптив, доступность, перенос макета в компоненты ([#23](../../issues/23));
- **M3. Форма и API** — `/api/lead`, дедупликация, атрибуция, тесты ([#24](../../issues/24));
- **M4. Плюсы и сдача** — Telegram-дубль, OG/SEO, экспорт и бэкап, деплой-инструкция ([#25](../../issues/25)).

За пределами репозитория: деплой на VPS (по инструкции ниже), отчёт Lighthouse mobile
и публичный доступ к репозиторию — на этапе отправки работы.

## Процесс: что делали сами, что ИИ

**Сами (заказчик):** постановка задачи и решения по структуре — стек, какие блоки
убрать, оформление подписки свитчером, таблица заказа с количеством и «Итого», два
селекта с зависимыми полями, hero с фото слева. Макет принят и правлен вручную,
деплой — на заказчике.

**ИИ (OpenCode CLI, модель `opencode-go/deepseek-v4.1-flash`; оркестрация и проверки —
Hermes Agent):** спецификация, каркас приложения, макет и дизайн-система, перенос
макета в Next.js, API заявки с дедупликацией и атрибуцией, тесты, скрипты для
менеджера, документация.

**Где ИИ ошибался и как это заметили:**

- в первом макете — битые `tel:`-ссылки (звёздочки прямо в `href`), бессмысленная
  подпись «обжарка льном» в шапке, эмодзи в `<title>`, контраст подсказки об ошибке
  3.89:1 при норме 4.5:1 и `backdrop-blur`, который бриф запрещал. Нашли техническим
  аудитом: разбор разметки, расчёт контраста по WCAG, замеры размеров;
- при переносе в Next.js агент добавил от себя блок «Ближайшая обжарка» и строку
  «Данные тестовые», которых в финальном макете нет, и получил 10 px горизонтального
  скролла на 360 px. Поймали сверкой текста макета и страницы фраза за фразой и
  замером `scrollWidth` на 320/360/390/414;
- вместо правок агент уходил в собственный визуальный QA: десятки скриншотов в
  headless-браузере и 45 минут на прогон. Прогон прервали и запретили скриншоты —
  визуальную приёмку делает человек;
- в комментарии к issue #24 оркестратор сначала написал, что скрипты экспорта и
  бэкапа готовы, хотя их не было. Комментарий отредактирован, скрипты вошли в M4;
- миграцию написали через запись `PRAGMA user_version` — на локальном SQLite-файле
  это работает, а Turso Cloud такую запись запрещает (`SQL not allowed statement`).
  Поймали не на ревью, а живой проверкой против Turso до деплоя: против удалённой
  базы `GET /api/health` отдавал ошибку, а `POST /api/lead` — 500, то есть на
  Vercel форма не работала бы совсем. Версию схемы перенесли в обычную таблицу
  `schema_migrations`, которая работает и в файле, и в облаке; на запрет PRAGMA
  теперь есть отдельный тест;
- тесты оказались зависимы от окружения: если в шелле экспортированы
  `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`, два теста «выключено без переменных»
  падали. Заглушки выставили явно, прогон проверяется в обоих режимах.

Полный лог с экспортом сессий ИИ — [`artifacts/ai-log/`](artifacts/ai-log/README.md):
транскрипт сессии Hermes, где агент работал оркестратором (680 сообщений), и
выгрузки сессий OpenCode с дизайном и кодом.

## Что не успели или сделали бы иначе

- Живую ссылку и деплой делает заказчик: в репозитории инструкции для обоих путей
  (Docker на VPS и Vercel + Turso), в `docs/DEPLOY-VERCEL.md` — пошагово.
- Telegram-дубль включается переменными; без токена он выключен — так и будет в проде,
  пока не заполнят `.env`.
- Авторов фотографий с Unsplash подтвердить автоматически не удалось (страницы кадров
  закрыты анти-ботом), в [`artifacts/issues/23-landing/licenses.md`](artifacts/issues/23-landing/licenses.md)
  стоит «автор уточняется».
- Сделали бы иначе: часть правок дизайна пришла уже после переноса в Next, поэтому
  связку «макет → компоненты» переделывали дважды. Правильнее было заморозить макет
  до старта переноса.

Задачи велись в GitHub Issues.

## Запуск

Нужен Docker (проверено на Docker 29 и Compose v2).

```bash
cp .env.example .env        # по желанию: можно поправить SITE_URL
docker compose up -d --build
# сайт — http://localhost:3000, проверка живости — /api/health
docker compose logs -f web
docker compose down         # данные остаются в томе kvarta-data
```

Локальная разработка без Docker (Node.js 22+):

```bash
cd web
npm ci
DATABASE_URL=file:./data/kvarta.db npm run dev
```

Проверки:

```bash
cd web
npm run lint && npm run typecheck && npm test && npm run build
```

### Заявки: `POST /api/lead`

Контракт и правила — в [`docs/M3-LEAD-API.md`](docs/M3-LEAD-API.md): Zod-валидация,
нормализация белорусского телефона к `+375XXXXXXXXX`, дедупликация 10 минут
(атомарный `INSERT … WHERE NOT EXISTS`), атрибуция из `sessionStorage`,
лимит тела 16 КБ и rate limit. Коды: `201` — принято, `200 duplicate` — повтор,
`400` — ошибки полей, `413` — большое тело, `429` — лимит, `405` — не POST.

После `docker compose up -d --build`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Аня","phone":"+375 29 123-45-67","interest":"order","items":[{"slug":"ethiopia","qty":2}],"subscription":true}'
# повторный тот же запрос в течение 10 минут → 200 duplicate

node web/scripts/smoke-lead.mjs   # 10 параллельных POST → в базе одна строка
```

Smoke-скрипт сам считает строки в SQLite (через `docker compose exec web`);
если доступа к Docker нет, проверку БД можно пропустить: `SMOKE_DB_CHECK=0`.

### Выгрузка заявок и бэкап

Два скрипта работают с той же базой, что и приложение: путь берётся из
`DATABASE_PATH` (в Docker — `/data/kvarta.db`).

```bash
# CSV в stdout (формат по умолчанию)
docker compose exec web node scripts/export-leads.mjs

# JSON в stdout
docker compose exec web node scripts/export-leads.mjs --format json

# файл внутри контейнера (том /data)
docker compose exec web node scripts/export-leads.mjs --format csv --out /data/leads.csv

# забрать файл на хост
docker compose cp web:/data/leads.csv ./leads.csv

# консистентный бэкап: /data/backups/kvarta-YYYYMMDD-HHMMSS.db
docker compose exec web node scripts/backup-db.mjs
docker compose exec web ls -la /data/backups
```

Локально без Docker:

```bash
cd web
DATABASE_PATH=./data/kvarta.db node scripts/export-leads.mjs --format json
DATABASE_PATH=./data/kvarta.db BACKUP_DIR=./data/backups node scripts/backup-db.mjs
```

CSV-колонки: `id`, `created_at`, `name`, `phone`, `interest`, `order_items`,
`subscription`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term`, `click_id_type`, `click_id`, `referrer`, `landing_path`, `page_url`,
`telegram_sent`. У `backup-db.mjs` каталог назначения меняется через
`BACKUP_DIR` (по умолчанию `/data/backups`), каталог создаётся сам.

База лежит в томе `kvarta-data` как `/data/kvarta.db` и переживает
`docker compose restart web` и `docker compose down`; удаляется только вместе с
`docker compose down -v`.

## Переменные окружения

| Переменная | Обязательна | Назначение |
|---|---|---|
| `DATABASE_URL` | да (есть значение по умолчанию) | база: локально `file:./data/kvarta.db`, в Docker — `file:/data/kvarta.db` (задан в `compose.yaml`, не берётся из `.env`), на Vercel — `libsql://…turso.io` |
| `DATABASE_AUTH_TOKEN` | для Turso | токен доступа к базе; для локального файла не нужен |
| `SITE_URL` | на деплое | публичный адрес: canonical, OG, sitemap |
| `PORT` | нет | порт приложения, по умолчанию 3000 |
| `LEAD_RATE_LIMIT` | нет | лимит `POST /api/lead` с одного IP в минуту, по умолчанию 20 |
| `TRUST_PROXY` | нет | `1` — брать IP из `X-Forwarded-For` за Caddy или Vercel, по умолчанию `0` |
| `TELEGRAM_BOT_TOKEN` | нет | токен бота для дубля заявки в Telegram; без пары с `TELEGRAM_CHAT_ID` выключено |
| `TELEGRAM_CHAT_ID` | нет | id чата/канала для дубля заявки; включается только вместе с токеном |

Секреты в репозиторий не попадают: `.env` в `.gitignore`, в `.env.example`
только имена и безопасные значения.

## Деплой на VPS

Нужны VPS с Docker Engine и плагином Docker Compose, домен (A-запись на IP
сервера) и открытые порты 80/443 для Caddy. Приложение слушает `3000`, наружу
его публикует reverse proxy с автоматическим TLS.

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
`TRUST_PROXY=1`, иначе rate limit увидит один IP прокси. `SITE_URL` передаётся
в сборку как build arg и вшивается в статические страницы, поэтому после его
изменения нужен `docker compose up -d --build`. Порт приложения можно
не публиковать наружу, а оставить только на loopback:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

Обновление версии:

```bash
git pull && docker compose up -d --build
```

База и бэкапы лежат в томе `kvarta-data` (`/data`). Регулярный бэкап — тем же
скриптом из cron (флаг `-T` обязателен: у cron нет TTY):

```cron
0 3 * * * cd /srv/kvarta && docker compose exec -T web node scripts/backup-db.mjs
```

Копии складываются в `/data/backups`; чтобы держать их вне сервера, забирайте
`docker compose cp web:/data/backups/...` или синхронизируйте каталог через
rsync. Посмотреть заявки можно экспортом:

```bash
docker compose exec web node scripts/export-leads.mjs --format csv
```

### Telegram-дубль заявки

Заявка уходит в Telegram после ответа пользователю (через `after()`), поэтому
Bot API не влияет на время ответа. Ошибка отправки только логируется, заявка
остаётся успешной, а `leads.telegram_sent` остаётся `0`. Чтобы включить,
заполните `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env` и пересоздайте
контейнер: `docker compose up -d --force-recreate`. Без обоих значений функция
выключена.

Бот должен быть добавлен в канал (лучше администратором), `chat_id` канала —
вида `-100…`; для публичного канала можно указать `@username`.

#### Если заявки не приходят в Telegram

1. Проверьте, что переменные дошли до контейнера:

   ```bash
   docker compose exec web sh -lc 'echo ${#TELEGRAM_BOT_TOKEN} $TELEGRAM_CHAT_ID'
   ```

   Пустой токен или пустой `chat_id` — значит приложение функцию не включает.
2. **После правки `.env` нужен пересоздающий запуск:** `docker compose up -d --force-recreate`.
   `docker compose restart web` переменные окружения НЕ перечитывает — приложение
   продолжит работать со старыми значениями (типичная причина «бот молчит»).
3. Проверка Bot API напрямую (подставьте значения из `.env`):

   ```bash
   set -a; . ./.env; set +a
   curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
   curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${TELEGRAM_CHAT_ID}"
   curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
     -d "chat_id=${TELEGRAM_CHAT_ID}" -d "text=тест"
   ```

   `getMe` показывает бота, `getChat` — видит ли бот канал, `sendMessage` —
   доходит ли сообщение. Ответы с `ok:false` указывают причину: `chat not found`
   (неверный `chat_id` или бот не добавлен), `not enough rights` (бот не админ).
4. Ошибки отправки пишутся в лог: `docker compose logs web | grep '\[telegram\]'`.
   Запись вида `[telegram] отправка не удалась: статус 401` означает неверный
   токен, `403` — бот не участник канала или без прав на публикацию.
5. Если в базе у заявки `telegram_sent = 0`, а в логах пусто — переменные не
   дошли до контейнера: вернитесь к пункту 1 и пересоздайте контейнер.

## Метаданные и SEO

`app/opengraph-image.tsx` отдаёт OG-превью 1200×630 (`image/png`) с локальным
шрифтом Literata из `web/public/fonts/` — без внешних запросов на рантайме.
`app/robots.ts` и `app/sitemap.ts` строятся от `SITE_URL`, canonical, Open Graph
и Twitter-мета заданы в `app/layout.tsx`, JSON-LD `LocalBusiness` встроен на
главной странице.

## Качество и проверки

- **Lighthouse mobile** (прод-сборка, симуляция slow 4G):
  performance **93–95**, accessibility **100**, best-practices **77**, SEO **100**;
  LCP 2.8–3.1 с (в симуляции), CLS 0, TBT 60–80 мс, вес страницы 4.8 МБ. Отчёты —
  `artifacts/lighthouse/mobile.report.json` и `mobile.report.html`, разбор метрик и
  отклонений — в [`artifacts/submission/CHECKLIST.md`](artifacts/submission/CHECKLIST.md).
- **Карта встроена всегда**: в контактах сразу рендерится `<iframe>` Яндекс.Карты
  (`loading="lazy"`, фиксированная высота) плюс ссылка «Открыть в Яндекс.Картах».
  Побочная цена — около 4.5 МБ тайлов и сторонние cookie Яндекса: это снимает
  `best-practices` в Lighthouse до 77 и растягивает LCP в симуляции до 2.8–3.1 с
  (в обычном браузере hero-фото отрисовывается за ~0.35 с).
- **Тесты**: `npm test` — 13 файлов, 90 тестов; `scripts/smoke-lead.mjs` проверяет,
  что 10 параллельных отправок дают одну строку в базе.
- **Проверки перед сдачей**: `npm run lint`, `typecheck`, `test`, `build` и
  `docker compose up -d --build` (контейнер должен стать `healthy`).
- **Процесс и ошибки ИИ** — раздел «Процесс» выше и
  [`artifacts/ai-log/`](artifacts/ai-log/README.md).
