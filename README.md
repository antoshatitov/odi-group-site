# ОДИ — корпоративный сайт строительной компании

Монорепозиторий для сайта компании «ОДИ»: React/Vite фронтенд и Fastify API для заявок и
калькулятора стоимости.

## Структура

- `apps/web` — React 18 + Vite 6 + TypeScript фронтенд
- `apps/server` — Node.js 20 + Fastify API (`/api/lead`, `/api/cost-estimate`, `/api/health`)
- `deploy` — generic deploy templates and helper scripts
- `docs` — публичные продуктовые и performance-документы

## Быстрый старт

1. Установите зависимости:

```bash
npm install
```

2. Подготовьте локальный серверный `.env` на основе шаблона:

```bash
cp .env.example apps/server/.env
```

3. Запустите backend:

```bash
npm run dev:server
```

4. Запустите frontend:

```bash
npm run dev:web
```

Фронтенд будет доступен на `http://localhost:5173`.

Проект ориентирован на Node.js 20+, а локальная версия зафиксирована в `.nvmrc`.

## GitHub CLI workflow

Работаем через HTTPS remote, чтобы `gh` мог использовать GitHub credentials без SSH-ключей.

1. Проверьте remote:

```bash
git remote -v
```

2. Если `origin` ещё в SSH-формате, переведите его на HTTPS:

```bash
git remote set-url origin https://github.com/<owner>/<repo>.git
```

3. Авторизуйтесь в GitHub CLI:

```bash
gh auth login --hostname github.com --web --git-protocol https
```

4. Подключите `gh` к Git credential helper:

```bash
gh auth setup-git
```

5. Быстрая проверка:

```bash
gh auth status
gh repo view antoshatitov/odi-group
git remote -v
```

Если `gh auth status` показывает активную сессию, а remote остаётся HTTPS, GitHub CLI workflow
готов к работе.

## Переменные окружения

`.env.example` содержит только безопасные плейсхолдеры и значения по умолчанию.

Основные backend-переменные:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_CALC_BOT_TOKEN`
- `TELEGRAM_CALC_CHAT_ID`
- `TELEGRAM_QUARANTINE_CHAT_ID`
- `LOG_HASH_SALT`
- `CAPTCHA_ENABLED`
- `CAPTCHA_SECRET_KEY`
- `CAPTCHA_VERIFY_URL`
- `CAPTCHA_EXPECTED_HOSTNAME`
- `TELEGRAM_TIMEOUT_MS`
- `TELEGRAM_RETRY_ATTEMPTS`
- `TELEGRAM_RETRY_BASE_MS`
- `IN_MEMORY_LIMITER_MAX_KEYS`
- `IN_MEMORY_DEDUP_MAX_KEYS`
- `PORT`
- `ALLOWED_ORIGINS`
- `TRUST_PROXY`

Основные frontend-переменные:

- `VITE_API_BASE`
- `VITE_YM_COUNTER_ID`

## Команды

- `npm run dev:web` — локальный frontend
- `npm run build:web` — production build frontend
- `npm run lint:web` — ESLint для frontend
- `npm run format:web` — Prettier для frontend
- `npm run preview:web` — preview production build
- `npm run agent-browser:check` — проверка локального `agent-browser` CLI и browser runtime
- `npm run agent-browser:smoke` — read-only smoke для локального frontend через `agent-browser`
- `npm run dev:server` — backend в watch-режиме
- `npm run start:server` — backend без watch
- `npm run test:server` — серверные тесты
- `npm run repo:safety` — проверка публичной безопасности репозитория
- `npm run test:e2e:web` — Playwright smoke
- `npm run test:e2e:analytics:web` — Playwright analytics smoke

## Performance и media workflow

Базовые метрики и бюджетные ограничения описаны в
[`docs/performance-baseline.md`](docs/performance-baseline.md).

Локальные проверки:

```bash
npm --workspace apps/web run media:optimize
npm --workspace apps/web run perf-check
npm --workspace apps/web run media-check
```

Smoke-проверка UI:

```bash
npm --workspace apps/web run playwright:install
npm run test:e2e:web
```

Проверка аналитики:

```bash
npm run test:e2e:analytics:web
```

## agent-browser setup, check, smoke

`agent-browser` используется только для read-only browser checks. Версия CLI pinned в
`devDependencies`, а первый browser runtime ставится отдельно.

1. Установите npm-зависимости:

```bash
npm install
```

2. Скачайте Chrome runtime для `agent-browser`:

```bash
npx agent-browser install
```

3. Проверьте CLI и browser runtime:

```bash
npm run agent-browser:check
```

4. Прогоните локальный smoke для frontend:

```bash
npm run agent-browser:smoke
```

`agent-browser:smoke` сам собирает `apps/web`, поднимает `vite preview`, открывает локальную
страницу, снимает `snapshot -i`, проверяет заголовок и базовую mobile navigation без отправки
форм и без реальных side effects.

## Public Repo Safety

- Публичный репозиторий содержит только generic deploy templates и безопасные примеры.
- Реальные production-specific runbooks, SSH/VPS-инструкции и операторские детали должны жить в
  private operations documentation.
- Перед PR обязательно прогоняйте `npm run repo:safety`.
- Для GitHub-репозитория должны оставаться включёнными secret scanning и push protection.

## Deploy Templates

В каталоге `deploy/` лежат generic starting points:

- `deploy/nginx.conf.example`
- `deploy/lead-api.service.example`
- `deploy/bootstrap-vps.sh`
- `deploy/deploy-app-only.sh`
- `docs/deploy-runbook.md`

Эти файлы требуют локальной адаптации под конкретное окружение и не должны рассматриваться как
готовая production-конфигурация.
