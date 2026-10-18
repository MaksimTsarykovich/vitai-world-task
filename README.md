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
| Данные | SQLite (`better-sqlite3`) в Docker volume |
| Валидация | Zod — одна схема для клиента и сервера |
| Тесты | Vitest |
| Запуск | Docker multi-stage (`output: 'standalone'`) + Docker Compose |
| Прод | бесплатный VPS + Caddy (TLS) — деплой на этапе M4 |

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

Спецификация согласована и лежит первым коммитом репозитория. Работы идут в
ветке `dev` по этапам из [`docs/SPEC.md`](docs/SPEC.md), §8:

- **M1. Каркас** — приложение собирается и поднимается в Docker, SQLite живёт в
  томе, healthcheck отвечает; дизайн — отдельная задача, ждём референсы;
- **M2. Лендинг** — блоки ТЗ, адаптив, доступность;
- **M3. Форма и API** — `/api/lead`, дедупликация 10 минут, атрибуция, тесты —
  готово: см. [`docs/M3-LEAD-API.md`](docs/M3-LEAD-API.md);
- **M4. Плюсы и сдача** — Telegram, OG, деплой, Lighthouse, лог ИИ.

Задачи ведутся в GitHub Issues.

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
DATABASE_PATH=./data/kvarta.db npm run dev
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

База лежит в томе `kvarta-data` как `/data/kvarta.db` и переживает
`docker compose restart web` и `docker compose down`; удаляется только вместе с
`docker compose down -v`.

## Переменные окружения

| Переменная | Обязательна | Назначение |
|---|---|---|
| `DATABASE_PATH` | да (есть значение по умолчанию) | файл SQLite: локально `./data/kvarta.db`, в Docker `/data/kvarta.db` |
| `SITE_URL` | на деплое | публичный адрес: canonical, OG, sitemap |
| `PORT` | нет | порт приложения, по умолчанию 3000 |
| `LEAD_RATE_LIMIT` | нет | лимит `POST /api/lead` с одного IP в минуту, по умолчанию 20 |
| `TRUST_PROXY` | нет | `1` — брать IP из `X-Forwarded-For` за Caddy, по умолчанию `0` |

Секреты в репозиторий не попадают: `.env` в `.gitignore`, в `.env.example`
только имена и безопасные значения.
