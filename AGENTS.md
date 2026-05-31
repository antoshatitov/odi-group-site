# AGENTS.md - правила работы кодинг-агента в этом репозитории

Этот файл хранит только hard rules для работы агента в репозитории. Подробные workflow должны
жить в skills, скриптах или проектной документации. Если меняются команды, обновляй этот файл
только точными скриптами из `package.json`.

---

## 0) CRITICAL: границы репозитория

- Считай корень репозитория текущей рабочей директорией проекта.
- Не читать, не писать, не искать и не менять ничего вне корня репозитория без явного запроса пользователя.
- Не использовать абсолютные пути вне репо (`/Users`, `/etc`, `/var`, `~/.ssh`), кроме точного пути, который пользователь сам указал для текущей задачи.
- Не делать `cd ..` из репозитория и не ссылаться на родительские директории.
- Если задача требует действий вне репо, а пользователь не указал точный путь и действие, остановись и попроси явную инструкцию.
- Никогда не эксфильтровать секреты. Не печатать и не логировать содержимое локальных файлов, если пользователь явно не попросил и файл не внутри репо.

---

## 1) Контекст проекта

Корпоративный сайт строительной компании «ОДИ» для Калининграда и области.

- Frontend: React 18, Vite 6, TypeScript, React Router; код в `apps/web/src`.
- UI: лендинг, галереи реализованных объектов/домов в продаже/проектов, контакты, карта, модалки галереи, форма заявки, калькулятор стоимости, юридические страницы.
- Backend: Node.js 20+, Fastify 5; вход `apps/server/src/index.js`, приложение `apps/server/src/app.js`, маршруты `apps/server/src/routes`.
- API: `POST /api/lead`, `POST /api/cost-estimate`, `GET /api/health`.
- Данные галерей: `apps/web/src/data`; стили: `apps/web/src/index.css` и `apps/web/src/styles`.
- Deploy-шаблоны: `deploy/`; переменные окружения: `.env.example`.

---

## 2) Skills

Если задача относится к области, покрытой skill, открой соответствующий `SKILL.md` и следуй ему.
Если нужного skill нет, работай по этому файлу.

- `frontend-responsive-ui` - адаптивная верстка и responsive-поведение.
- `web-design-guidelines` - UI/UX и accessibility review.
- `vercel-react-best-practices` - React performance, bundle size, render patterns.
- `agent-browser` - browser automation, UI checks, скриншоты, интерактивные проверки.
- `frontend-design` - production-grade визуальный дизайн интерфейсов.

Если PR добавляет или удаляет tracked skills в `.agents/skills/`, обнови эту карту в том же PR.

---

## 3) Точные команды проекта

Не придумывай команды. Если не уверен, проверь `package.json`.

### Root commands

- Установка зависимостей: `npm install`
- Dev frontend: `npm run dev:web`
- Build frontend: `npm run build:web`
- Lint frontend: `npm run lint:web`
- Format frontend: `npm run format:web`
- Preview frontend: `npm run preview:web`
- Dev server: `npm run dev:server`
- Start server: `npm run start:server`
- Server tests: `npm run test:server`
- Repo safety: `npm run repo:safety`
- Agent browser check: `npm run agent-browser:check`
- Agent browser smoke: `npm run agent-browser:smoke`
- Install Playwright browser: `npm run playwright:install:web`
- UI smoke tests: `npm run test:e2e:web`
- Analytics e2e tests: `npm run test:e2e:analytics:web`

### Workspace commands

- Web dev: `npm --workspace apps/web run dev`
- Web build: `npm --workspace apps/web run build`
- Web lint: `npm --workspace apps/web run lint`
- Web format: `npm --workspace apps/web run format`
- Web preview: `npm --workspace apps/web run preview`
- Optimize media: `npm --workspace apps/web run media:optimize`
- Check media budgets: `npm --workspace apps/web run media-check`
- Check perf budgets: `npm --workspace apps/web run perf-check`
- Install Playwright browser for CI: `npm --workspace apps/web run playwright:install:ci`
- Web e2e smoke headed: `npm --workspace apps/web run e2e:smoke:headed`
- Web e2e analytics headed: `npm --workspace apps/web run e2e:analytics:headed`

### CI mirrors

CI запускает `npm run repo:safety`, `npm run test:server`, `npm run lint:web`,
`npm run build:web`, `npm --workspace apps/web run perf-check`,
`npm --workspace apps/web run media-check`,
`npm --workspace apps/web run playwright:install:ci`,
`npm --workspace apps/web run e2e:smoke` и
`npm --workspace apps/web run e2e:analytics`.

---

## 4) Выполнение задач и проверки

- Перед правками пойми цель, затронутую область и риск.
- Меняй минимально и строго по задаче. Не смешивай независимые темы и рефакторинги.
- Для нетривиальных задач, UI/API/security/deploy-изменений, PR или явного запроса пользователя сначала дай короткий план.
- В конце кратко укажи, что изменено и чем проверено.
- Если проверку нельзя выполнить, явно укажи причину и остаточный риск.

Risk-based verification:

- Docs-only: dev-сервер не нужен.
- Frontend без изменения поведения/layout: `npm run lint:web` и/или `npm run build:web` по ситуации.
- Frontend UI/layout/интерактив: `npm run dev:web` плюс browser/manual проверка затронутых сценариев.
- Backend/API: `npm run test:server` и, если нужно, локальная проверка эндпоинтов.
- Media/performance: `npm --workspace apps/web run media-check` и/или `npm --workspace apps/web run perf-check`.
- Bug fix: добавь regression test, когда это естественно и не требует несоразмерной инфраструктуры.
- Dependencies: не менять package manager/runtime; новую зависимость добавлять только если без нее нельзя.

---

## 5) Безопасность и проектные запреты

### Секреты и персональные данные

Запрещено:

- Коммитить реальные токены, ключи, `chat_id`, CAPTCHA-секреты.
- Создавать и коммитить `.env`, если пользователь явно не попросил.
- Логировать ПДн, содержимое заявок, телефоны, адреса, токены.
- Логировать телефон в явном виде; для технической корреляции используй только короткий `phoneHash` через `hashValue(..., LOG_HASH_SALT)`.

Разрешено обновлять `.env.example` только безопасными плейсхолдерами.

### API/server

Запрещено без явного запроса:

- Ослаблять или отключать `@fastify/helmet`, `@fastify/rate-limit`, honeypot, дедупликацию, timing-check, quarantine flow или CAPTCHA.
- Расширять CORS до “всем все можно”.
- Раскрывать наружу стеки, секреты и внутренние ошибки.

При правках API обязательно:

- Валидировать входные данные на границе.
- Сохранять контракт эндпоинтов, если изменение контракта не согласовано.
- Для калькулятора сохранять порядок антиспама: schema/consent/phone/honeypot/CAPTCHA/timing -> rate-limit/dedup/quarantine/send.
- Не записывать невалидные timing-запросы как нормальные дубликаты.

### Deploy, зависимости и frontend

- `deploy/` менять только для задач про deploy/infra.
- Не менять nginx/systemd, порты, users, пути и перезапуски “по пути”.
- Не обновлять массово зависимости и не менять `package-lock.json` без причины.
- Не ломать ключевые секции лендинга, SEO-контент и доступность: focus, ESC/overlay для модалок, клавиатурная навигация.
- Не добавлять тяжелые библиотеки ради мелких UI-эффектов.

---

## 6) UI/browser checks

Playwright/agent-browser разрешены для read-only UI checks и исследовательского тестирования.

- Не совершать покупки, скачивания исполняемых файлов и изменения аккаунтов.
- Не вводить креды, токены и персональные данные.
- Не отправлять формы, которые могут триггерить реальные заявки или Telegram, если задача не требует этого явно.
- Для форм предпочитай UI-валидацию, мок/локальный режим или тестовый endpoint/flag.

Scoped checklist:

- Лендинг: загрузка страницы, ключевые секции на месте.
- Галереи: карточки, изображения, открытие/закрытие, перелистывание, ESC/focus.
- Формы: валидация, loading/success/error без реальной отправки.
- Калькулятор: базовый сценарий ввода и расчета.
- Адаптив: релевантные mobile/tablet/desktop брейкпоинты.

---

## 7) PR, commit, push и merge

Commit, push, PR и merge выполняются только по явному запросу пользователя.

- Одна задача -> одна ветка -> один PR.
- Запрещено пушить напрямую в `main`.
- Перед commit/push/PR убедись, что текущая ветка не `main`; создай новую ветку, если нужно.
- Agent-generated branch names: `feat/...`, `fix/...`, `chore/...`, `refactor/...`, `docs/...`, `test/...`; kebab-case, коротко, без `:`.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`), subject до 72 символов.
- Никогда не добавлять AI attribution footers: `Co-Authored-By: Codex`, `Generated with Codex`, `Generated with...` и аналоги.

PR description must include:

- **Summary**
- **Why**
- **Changes**
- **How to test**
- **Verification**
- **Screenshots / Video** для UI-изменений
- **Risk & Rollback**

Merge rules:

- Не выполнять merge без отдельной явной команды пользователя.
- Перед merge проверить CI, целевую ветку и актуальный head PR.
- Не мержить PR с падающим или незавершенным CI без явного подтверждения пользователя.
- Не выполнять локальный merge в `main` и не пушить в `main`.

---

## 8) Workspace hygiene

- Безопасные git-команды по умолчанию: `git status`, `git diff`, `git log`.
- Незнакомые изменения в рабочем дереве считать пользовательскими или чужими; не откатывать.
- Если чужие изменения мешают задаче, спроси пользователя.
- Не удалять файлы и изменения без явного запроса.
- Не использовать destructive commands (`rm -rf`, `git reset --hard`, `git checkout --`) без явного запроса.
- `git amend` и `git worktree` использовать только по явному запросу.
- Правки должны быть маленькими, reviewable и по теме.
- Всегда работать внутри repo root.
