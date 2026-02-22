# ОДИ — корпоративный сайт строительной компании

Монорепозиторий для сайта компании «ОДИ» (строительство индивидуальных домов в Калининграде и Калининградской области).

## Структура

- `apps/web` — React 18 + Vite 6 + TypeScript фронтенд
- `apps/server` — Node.js 20 + Fastify API `/api/lead`
- `deploy` — Nginx и systemd конфигурации для VPS

## Быстрый старт (локально)

1) Установите зависимости:

```bash
npm install
```

2) Запустите фронтенд:

```bash
npm run dev:web
```

3) Запустите сервер заявок:

```bash
cp .env.example apps/server/.env
npm run dev:server
```

Фронтенд будет доступен на `http://localhost:5173`.

## Переменные окружения

`.env.example` содержит базовые переменные. Скопируйте их в `apps/server/.env` и при необходимости в `apps/web/.env`.

**Backend (`apps/server/.env`)**

- `TELEGRAM_BOT_TOKEN` — токен бота
- `TELEGRAM_CHAT_ID` — ID чата
- `PORT` — порт API (по умолчанию 8080)
- `ALLOWED_ORIGINS` — список разрешённых origin через запятую

**Frontend (`apps/web/.env`, опционально)**

- `VITE_API_BASE` — базовый URL API, например `http://localhost:8080`

## Сборка фронтенда

```bash
npm run build:web
```

Готовая статика появится в `apps/web/dist`.

## Performance и media workflow

Базовые метрики и KPI зафиксированы в `docs/performance-baseline.md`.

Локальные проверки бюджетов:

```bash
npm --workspace apps/web run media:optimize
npm --workspace apps/web run perf-check
npm --workspace apps/web run media-check
```

Что проверяется:

- размер ключевых build-ассетов (`dist/assets`),
- размер hero video,
- вес и суммарный объём исходных изображений галереи.

Генерация оптимизированных изображений выполняется в `apps/web/src/assets/builded-optimized` на основе
исходников из `apps/web/src/assets/builded`.

CI (GitHub Actions) падает, если бюджеты из `apps/web/perf-budgets.json` нарушены.

## Деплой на Timeweb.cloud (VPS)

1) Подготовьте папки:

```bash
sudo mkdir -p /var/www/odi/web /var/www/odi/server
```

2) Скопируйте файлы:

- `apps/web/dist` → `/var/www/odi/web/dist`
- `apps/server` → `/var/www/odi/server`

3) Создайте `.env` для сервера:

```bash
sudo cp ./.env.example /var/www/odi/server/.env
sudo nano /var/www/odi/server/.env
```

4) Настройте systemd:

```bash
sudo cp deploy/odi-leads.service /etc/systemd/system/odi-leads.service
sudo systemctl daemon-reload
sudo systemctl enable --now odi-leads.service
```

5) Настройте Nginx:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/odi
sudo ln -s /etc/nginx/sites-available/odi /etc/nginx/sites-enabled/odi
sudo nginx -t
sudo systemctl reload nginx
```

6) Подключите SSL:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d odi-group.ru -d www.odi-group.ru
```

## Автоматический деплой на чистый Ubuntu 22.04

Для полного bootstrap/deploy используйте скрипт `deploy/bootstrap-vps.sh`.

Обязательные переменные окружения перед запуском:

- `REPO_URL` — URL репозитория (SSH или HTTPS)
- `CERTBOT_EMAIL` — email для Let's Encrypt
- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота
- `TELEGRAM_CHAT_ID` — ID Telegram-чата

Пример запуска:

```bash
chmod +x deploy/bootstrap-vps.sh
REPO_URL=git@github.com:ORG/REPO.git \
CERTBOT_EMAIL=admin@odi-group.ru \
TELEGRAM_BOT_TOKEN=xxx \
TELEGRAM_CHAT_ID=xxx \
bash deploy/bootstrap-vps.sh
```

Опциональные переменные:

- `DOMAIN` (по умолчанию `odi-group.ru`)
- `WWW_DOMAIN` (по умолчанию `www.odi-group.ru`)
- `BRANCH` (по умолчанию `main`)
- `APP_ROOT` (по умолчанию `/var/www/odi`)
- `SRC_DIR` (по умолчанию `$HOME/odi-group`)
- `ALLOWED_ORIGINS` (по умолчанию `https://odi-group.ru,https://www.odi-group.ru`)
- `ENABLE_UFW` (по умолчанию `true`)

## App-Only деплой (после merge в main)

Для регулярного деплоя изменений приложения без системных шагов (`apt`, `ufw`, `certbot`) используйте:

```bash
bash deploy/deploy-app-only.sh
```

Что делает `deploy/deploy-app-only.sh`:

- подтягивает `origin/main` (или ветку из `BRANCH`)
- собирает фронтенд (`npm run build:web`)
- синхронизирует `apps/web/dist` и `apps/server` в `/var/www/odi`
- устанавливает production зависимости backend
- перезапускает `odi-leads.service`
- выполняет health-check API и HTTP(S) проверки доменов

Опциональные переменные:

- `BRANCH` (по умолчанию `main`)
- `SRC_DIR` (по умолчанию `$HOME/odi-group`)
- `APP_ROOT` (по умолчанию `/var/www/odi`)
- `SERVICE_NAME` (по умолчанию `odi-leads.service`)
- `PORT` (по умолчанию `8080`)
- `DOMAIN` (по умолчанию `odi-group.ru`)
- `WWW_DOMAIN` (по умолчанию `www.odi-group.ru`)
- `INSTALL_WORKSPACE_DEPS` (по умолчанию `true`)
- `APPLY_PERMISSIONS` (по умолчанию `true`)

Пример:

```bash
BRANCH=main \
SRC_DIR=/root/odi-group \
APP_ROOT=/var/www/odi \
bash deploy/deploy-app-only.sh
```

## Данные проектов и галереи

- Проекты: `apps/web/src/data/projects.ts`
- Галерея: `apps/web/src/data/gallery.ts`

Изображения лежат в `apps/web/public/images`. Замените SVG-плейсхолдеры на реальные фото в webp/avif.
