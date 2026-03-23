# Runbook: Safe App-Only Deploy

Этот runbook описывает актуальный публичный способ деплоя ODI без хранения production-специфики
в репозитории.

## Что изменилось

- Deploy должен идти из чистого git ref, а не из рабочего дерева с локальными правками.
- Продовые значения и доменные проверки живут в private wrapper или private env на сервере.
- Generic script остаётся в репозитории и работает только через env-интерфейс.
- В deploy теперь можно включать дополнительные проверки второго сайта и связанных systemd-сервисов.

## Public Interface Deploy Script

Основной script: `deploy/deploy-app-only.sh`

Поддерживаемые переменные:

- `REPO_DIR` — путь к server-side clone репозитория.
- `DEPLOY_REF` — branch, tag или commit SHA для выкладки.
- `SITE_SLUG`, `SERVICE_NAME`, `NGINX_SITE_NAME`, `APP_ROOT`, `PORT` — target app settings.
- `DOMAIN`, `WWW_DOMAIN` — primary domain checks.
- `EXTRA_SYSTEMD_SERVICES` — comma-separated list дополнительных systemd services для pre/post checks.
- `EXTRA_CHECK_URLS` — comma-separated list дополнительных URL для pre/post checks.
- `USE_CLEAN_WORKTREE` — по умолчанию `true`, deploy выполняется из одноразового worktree.
- `ALLOW_DIRTY_REPO` — по умолчанию `false`, direct deploy из dirty repo запрещён.
- `VITE_YM_COUNTER_ID` — должен приходить из private env/wrapper во время frontend build.

## Private Wrapper On The Server

Продовые значения не должны попадать в git. Держите private wrapper на сервере рядом с private
ops-материалами. Шаблон:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

export REPO_DIR="/path/to/private/server/repo"
export DEPLOY_REF="${1:-origin/main}"
export SITE_SLUG="site-slug"
export SERVICE_NAME="primary-app.service"
export NGINX_SITE_NAME="site-slug"
export APP_ROOT="/path/to/private/app/root"
export PORT="8080"
export DOMAIN="primary.example.com"
export WWW_DOMAIN="www.primary.example.com"
export EXTRA_SYSTEMD_SERVICES="nginx.service,secondary-app.service"
export EXTRA_CHECK_URLS="https://secondary.example.com"
export VITE_YM_COUNTER_ID="12345678"

exec bash deploy/deploy-app-only.sh
```

Если нужен deploy конкретного коммита, передавайте его первым аргументом:

```bash
./deploy-odi-prod.sh <branch-or-sha>
```

## Recommended Workflow

### 1. Local preflight

Запускайте из корня репозитория:

```bash
npm run lint:web
npm run build:web
npm run test:server
npm run test:e2e:web
npm run test:e2e:analytics:web
npm run repo:safety
```

Перед деплоем убедитесь, что нужный ref уже доступен серверу:

```bash
git push origin <branch>
```

### 2. Server-side preflight

Перед deploy проверьте текущее состояние primary и secondary сайтов:

```bash
sudo systemctl is-active <primary_service> <secondary_service> nginx
curl -I https://odi-group.ru
curl -I https://easychemistry.ru
```

### 3. Deploy

На сервере запускайте только private wrapper:

```bash
./deploy-odi-prod.sh <branch-or-sha>
```

Что делает script:

1. Делает `git fetch --prune origin`.
2. Создаёт одноразовый clean worktree для `DEPLOY_REF`.
3. Выполняет `npm ci` при наличии lockfile, иначе `npm install`.
4. Собирает frontend через `npm run build:web`.
5. Обновляет app files через `rsync`.
6. Сохраняет server `.env`.
7. Выполняет production install для backend.
8. Рестартует primary backend service.
9. Выполняет pre/post checks для primary domain, optional secondary URLs и optional secondary services.

### 4. Post-deploy verification

После deploy повторите:

```bash
sudo systemctl is-active <primary_service> <secondary_service> nginx
curl http://127.0.0.1:<port>/api/health
curl -I https://odi-group.ru
curl -I https://easychemistry.ru
E2E_BASE_URL=https://odi-group.ru npm run test:e2e:web
E2E_BASE_URL=https://odi-group.ru npm run test:e2e:analytics:web
```

Дополнительно проверьте живой сайт в браузере:

- desktop: hero, каталог, фильтры, gallery, project modal, calculator modal, contacts;
- mobile: menu, scroll, contacts, calculator, consultation modal;
- analytics: `window.ym` существует, загружается `mc.yandex.ru/metrika/tag.js`, цели продолжают
  отправляться.

## Rollback

Rollback делается тем же private wrapper, только на предыдущий known-good ref:

```bash
./deploy-odi-prod.sh <previous-good-sha>
```

Если post-deploy checks не зелёные, не продолжайте ручные правки на сервере: сначала откатите ref,
потом разбирайте причину локально.
