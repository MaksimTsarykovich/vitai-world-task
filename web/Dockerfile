# syntax=docker/dockerfile:1

# --- зависимости (тут же toolchain для сборки нативного better-sqlite3) ---
FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --- сборка приложения ---
FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Публичный адрес нужен уже на сборке: статические canonical, OG, robots и
# sitemap вшиваются в HTML/XML. Compose передаёт его из .env (см. compose.yaml).
ARG SITE_URL=http://localhost:3000
ENV SITE_URL=${SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- рантайм: только standalone-вывод, non-root, том для SQLite ---
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/kvarta.db

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# скрипты менеджера доступны через `docker compose exec web node scripts/...`
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
