# Performance Baseline и KPI

Документ фиксирует отправную точку и целевые метрики для поэтапной оптимизации.

## Базовые значения (до оптимизаций)

- Frontend build: `npm run build:web` проходит успешно.
- Основной JS бандл: около `214 KB` (`~67 KB gzip`).
- Стартовая загрузка страницы: около `11.56 MB` (доминируют изображения и hero video).
- Суммарная загрузка медиа при просмотре всех галерей: до `~106.8 MB`.
- Максимальный размер исходного изображения в проекте: до `~16 MB`.

## Целевые KPI

- Стартовая загрузка страницы: `~2-3 MB`.
- Видимые на старте изображения: `< 1 MB`.
- Hero media (video + poster): `< 1-1.5 MB`.
- Открытие одной галереи: `~3-6 MB`.
- Runtime лимит для cover/thumb: без файлов `> 1 MB`.
- Минимальный CLS для галереи и модалок (фиксированные `width`/`height`).

## Guardrails (CI)

Проверки выполняются в GitHub Actions после `build:web`:

- `npm --workspace apps/web run perf-check`
- `npm --workspace apps/web run media-check`

Текущие бюджеты описаны в `apps/web/perf-budgets.json`.

### Asset budgets

- Main JS (gzip): `<= 90 KB`
- Main CSS: `<= 32 KB`
- Total dist assets: `<= 200000 KB`
- Largest dist asset: `<= 17000 KB`

### Media budgets (baseline-level)

- Largest source image: `<= 16.5 MB`
- Hero video: `<= 3.5 MB`
- Total source gallery images: `<= 200 MB`

Примечание: лимиты для source media на baseline-этапе зафиксированы на текущем уровне и будут
ужесточаться по мере внедрения этапов оптимизации изображений/видео.
