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
- `ALLOWED_ORIGINS` — список разрешённых origin через запятую (обязательно в production)
- `TRUST_PROXY` — `true` для production за Nginx reverse proxy (для локального запуска без proxy — `false`)

**Frontend (`apps/web/.env`, опционально)**

- `VITE_API_BASE` — базовый URL API, например `http://localhost:8080`
- `VITE_YM_COUNTER_ID` — ID счётчика Яндекс.Метрики для событий/целей

### Аналитика

- Базовый weekly-шаблон отчёта: `analytics-weekly-report.md`
- Чек-лист rollout: `docs/analytics-rollout-checklist.md`
- Пошаговый runbook rollout: `docs/analytics-rollout-runbook.md`

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

Smoke-проверка UI (Playwright):

```bash
npm --workspace apps/web run playwright:install
npm --workspace apps/web run e2e:smoke
```

Проверка аналитики (Playwright + mock API, без реальной отправки заявок):

```bash
npm --workspace apps/web run e2e:analytics
# или из корня
npm run test:e2e:analytics:web
```

Что проверяется:

- размер ключевых build-ассетов (`dist/assets`),
- размер hero video,
- вес и суммарный объём исходных изображений галереи.

Генерация оптимизированных изображений выполняется в `apps/web/src/assets/builded-optimized` на основе
исходников из `apps/web/src/assets/builded`.

CI (GitHub Actions) падает, если нарушены бюджеты из `apps/web/perf-budgets.json`
или не проходит Playwright smoke-тест.

## Первичная настройка SSH-доступа (новый VPS)

Перед деплоем обязательно выключите парольный SSH-доступ и root login.

1) На Mac создайте отдельный ключ для этого VPS:

```bash
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/timeweb_odi_prod -C "anton@odi-vps"
```

2) Добавьте ключ в Keychain и настройте `~/.ssh/config`:

```bash
ssh-add --apple-use-keychain ~/.ssh/timeweb_odi_prod
```

```sshconfig
Host odi-vps
  HostName <server-ip>
  User anton
  IdentityFile ~/.ssh/timeweb_odi_prod
  AddKeysToAgent yes
  UseKeychain yes
```

3) Под root запустите hardening-скрипт на сервере:

```bash
scp ~/.ssh/timeweb_odi_prod.pub root@<server-ip>:/tmp/anton.pub
ssh root@<server-ip>
git clone <repo-url> ~/odi-group
cd ~/odi-group
NEW_USER=anton PUBKEY_FILE=/tmp/anton.pub bash deploy/harden-ssh-access.sh
```

4) Проверки после применения hardening:

```bash
ssh anton@<server-ip>
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no anton@<server-ip>
ssh root@<server-ip>
```

Ожидаемо:

- первый вход проходит по ключу;
- второй и третий вход завершаются `Permission denied (publickey)`.

## Деплой на Timeweb.cloud (VPS)

### Multi-site layout (рекомендуется)

- `odi`: `/var/www/sites/odi`, backend порт `8080`, service `odi-leads.service`, nginx site `odi`
- `site-2`: `/var/www/sites/site-2`, backend порт `8081`, service `site-2-leads.service`, nginx site `site-2`
- `site-3`: `/var/www/sites/site-3`, backend порт `8082`, service `site-3-leads.service`, nginx site `site-3`

Для каждого сайта используйте отдельный `server` block в Nginx и отдельный systemd unit.

### Ручной деплой (пример для `odi`)

1) Подготовьте папки:

```bash
sudo mkdir -p /var/www/sites/odi/web /var/www/sites/odi/server
```

2) Скопируйте файлы:

- `apps/web/dist` → `/var/www/sites/odi/web/dist`
- `apps/server` → `/var/www/sites/odi/server`

3) Создайте `.env` для сервера:

```bash
sudo cp ./.env.example /var/www/sites/odi/server/.env
sudo nano /var/www/sites/odi/server/.env
```

Проверьте, что для режима за Nginx установлено:

- `TRUST_PROXY=true`
- `ALLOWED_ORIGINS=https://odi-group.ru,https://www.odi-group.ru`

4) Настройте systemd:

```bash
sudo cp deploy/odi-leads.service /etc/systemd/system/odi-leads.service
sudo systemctl daemon-reload
sudo systemctl enable --now odi-leads.service
```

5) Настройте Nginx:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/odi
sudo ln -sfn /etc/nginx/sites-available/odi /etc/nginx/sites-enabled/odi
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
SITE_SLUG=odi \
REPO_URL=git@github.com:ORG/REPO.git \
CERTBOT_EMAIL=admin@odi-group.ru \
TELEGRAM_BOT_TOKEN=xxx \
TELEGRAM_CHAT_ID=xxx \
bash deploy/bootstrap-vps.sh
```

Опциональные переменные:

- `SITE_SLUG` (по умолчанию `odi`)
- `SERVICE_NAME` (по умолчанию `${SITE_SLUG}-leads.service`)
- `NGINX_SITE_NAME` (по умолчанию `${SITE_SLUG}`)
- `DOMAIN` (по умолчанию `odi-group.ru`)
- `WWW_DOMAIN` (по умолчанию `www.odi-group.ru`)
- `BRANCH` (по умолчанию `main`)
- `APP_ROOT` (по умолчанию `/var/www/sites/${SITE_SLUG}`)
- `SRC_DIR` (по умолчанию `$HOME/odi-group`)
- `PORT` (по умолчанию `8080`; для следующих сайтов используйте `8081`, `8082`)
- `ALLOWED_ORIGINS` (по умолчанию на основе `DOMAIN`/`WWW_DOMAIN`)
- `TRUST_PROXY` (по умолчанию `true`)
- `ENABLE_UFW` (по умолчанию `true`)
- `DISABLE_NGINX_DEFAULT` (по умолчанию `false`)

## App-Only деплой (после merge в main)

Для регулярного деплоя изменений приложения без системных шагов (`apt`, `ufw`, `certbot`) используйте:

```bash
bash deploy/deploy-app-only.sh
```

Что делает `deploy/deploy-app-only.sh`:

- подтягивает `origin/main` (или ветку из `BRANCH`)
- собирает фронтенд (`npm run build:web`)
- синхронизирует `apps/web/dist` и `apps/server` в `${APP_ROOT}`
- устанавливает production зависимости backend
- перезапускает `${SERVICE_NAME}`
- выполняет health-check API и HTTP(S) проверки доменов

Опциональные переменные:

- `SITE_SLUG` (по умолчанию `odi`)
- `SERVICE_NAME` (по умолчанию `${SITE_SLUG}-leads.service`)
- `NGINX_SITE_NAME` (по умолчанию `${SITE_SLUG}`)
- `BRANCH` (по умолчанию `main`)
- `SRC_DIR` (по умолчанию `$HOME/odi-group`)
- `APP_ROOT` (по умолчанию `/var/www/sites/${SITE_SLUG}`)
- `PORT` (по умолчанию `8080`)
- `DOMAIN` (по умолчанию `odi-group.ru`)
- `WWW_DOMAIN` (по умолчанию `www.odi-group.ru`)
- `INSTALL_WORKSPACE_DEPS` (по умолчанию `true`)
- `APPLY_PERMISSIONS` (по умолчанию `true`)

Пример:

```bash
SITE_SLUG=odi \
BRANCH=main \
SRC_DIR=/home/anton/odi-group \
APP_ROOT=/var/www/sites/odi \
SERVICE_NAME=odi-leads.service \
NGINX_SITE_NAME=odi \
bash deploy/deploy-app-only.sh
```

## Данные проектов и галереи

- Проекты: `apps/web/src/data/projects.ts`
- Галерея: `apps/web/src/data/gallery.ts`

Изображения лежат в `apps/web/public/images`. Замените SVG-плейсхолдеры на реальные фото в webp/avif.
