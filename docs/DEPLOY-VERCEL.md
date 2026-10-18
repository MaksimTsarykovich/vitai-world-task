# Деплой: две сборки из одного кода

Проект собирается и запускается двумя способами. Код один и тот же, различие —
только в том, где лежит база. Это осознанное решение: ТЗ разрешает любой хостинг
(«Vercel, Netlify, Cloudflare Pages или аналог») и любое хранилище («файл, SQLite
или что-то ещё»), но у заказчика есть и свой VPS, поэтому Docker-вариант тоже
поддерживается.

| | VPS / локально | Vercel |
|---|---|---|
| Запуск | `docker compose up -d --build` | сборка и функции Vercel |
| База | SQLite-файл в томе `/data/kvarta.db` | Turso (libSQL по сети) |
| `DATABASE_URL` | `file:/data/kvarta.db` | `libsql://…turso.io` |
| `DATABASE_AUTH_TOKEN` | не нужен | токен Turso |
| Диск | постоянный том | нет (только `/tmp`) |
| HTTPS | Caddy/свой прокси | автоматически |
| Файл базы | обычный SQLite 3, читается `sqlite3` | в облаке Turso |

Драйвер в обоих случаях один — `@libsql/client`: он умеет и `file:`, и `libsql://`.
Поэтому нет ни двух веток, ни ветвления в коде.

## VPS: Docker + SQLite (как раньше)

```bash
cp .env.example .env          # SITE_URL, при желании Telegram
docker compose up -d --build
curl -s localhost:3000/api/health   # {"status":"ok","db":"ok","schema":2}
```

Заявки лежат в томе `kvarta-data`, переживают перезапуск и обновление образа.
Выгрузка и бэкап — внутри контейнера:

```bash
docker compose exec web node scripts/export-leads.mjs --format csv
docker compose exec web node scripts/backup-db.mjs --out /data/backup
```

## Vercel: Turso

### 1. База в Turso

1. Зарегистрироваться на <https://turso.tech> (вход через GitHub).
2. Create Database → имя `kvarta`, регион ближе к аудитории (Frankfurt /
   `aws-eu-central-1`).
3. Скопировать `libsql://…` и создать токен: `turso db tokens create kvarta`.
4. Положить в локальный `.env` (файл в `.gitignore`, в репозиторий не попадает):

```bash
DATABASE_URL=libsql://kvarta-<аккаунт>.turso.io
DATABASE_AUTH_TOKEN=<токен>
```

5. Применить схему и убедиться, что она на месте:

```bash
cd web && npm run db:migrate
```

### 2. Проект в Vercel

1. Import Git Repository → выбрать этот репозиторий.
2. **Root Directory: `web`** (Next.js лежит в подкаталоге).
3. Framework Preset: Next.js, Node 20.x или новее.
4. Build Command уже задан в `web/vercel.json` (`npm run db:migrate && npm run build`):
   схема применяется к Turso при каждом деплое. Если база на момент сборки
   недоступна, поменяйте Build Command в панели на `npm run build` — миграция
   тогда выполнится лениво при первом запросе.
5. Environment Variables (Production и Preview):

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | `libsql://…turso.io` |
| `DATABASE_AUTH_TOKEN` | токен Turso |
| `SITE_URL` | `https://<проект>.vercel.app` (или свой домен) |
| `TELEGRAM_BOT_TOKEN` | токен бота, если нужен дубль заявок |
| `TELEGRAM_CHAT_ID` | `-100…` канала |
| `TRUST_PROXY` | `1` — Vercel сам ставит `X-Forwarded-For`, иначе лимитер видит всех как один адрес |

На VPS за Caddy `TRUST_PROXY=1` тоже нужен, но лимитер там работает на весь
процесс целиком; на Vercel — на каждый инстанс отдельно (см. ниже).

6. Deploy.

`SITE_URL` обязателен **до** сборки: canonical, Open Graph и `sitemap.xml`
вшиваются в статические страницы. Если задать его после первого деплоя или потом
сменить домен — нужен повторный Deploy (Redeploy), иначе в метаданных останется
старый адрес.

### 3. Проверка после деплоя

```bash
curl -s https://<домен>/api/health          # schema: 2
```

- Отправить заявку с сайта → 201, номер появляется через `turso db shell kvarta`
  (`SELECT id, phone, telegram_sent FROM leads ORDER BY id DESC LIMIT 3;`).
- Повторно тот же номер в течение 10 минут → ответ `duplicate`, второй строки нет.
- В логах Vercel (Functions → Logs) должна быть строка
  `[startup] Telegram-дубль: включён` либо причина, почему выключен.

## Чем Vercel отличается в эксплуатации

- **Нет постоянного диска.** Своя SQLite-база файлом там невозможна — отсюда Turso.
- **Холодные старты.** Первый запрос после простоя чуть медленнее: поднимается
  функция и открывается соединение с Turso.
- **Лимит запросов с IP** (`LEAD_RATE_LIMIT`) считается в памяти инстанса, а
  инстансов может быть несколько — на Vercel это защита «на инстанс», а не общая.
  Обязательное по ТЗ ограничение (одна заявка с номера за 10 минут) работает
  корректно, потому что живёт в базе.
- **Telegram-дубль** отправляется после ответа через `after()` (waitUntil) — на
  Vercel это поддерживается.
- **Плата.** Для тестового задания тарифа Hobby достаточно; коммерческое
  использование на Hobby не разрешено правилами Vercel.

## Откат

Вернуться на VPS-вариант — это одна переменная и пересборка:

```bash
DATABASE_URL=file:/data/kvarta.db docker compose up -d --build
```

Данные, накопленные в Turso, переносятся выгрузкой:

```bash
cd web && DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… node scripts/export-leads.mjs --format csv
```

и импортом в локальную базу (или вручную через `sqlite3`).
