# Чек-лист внедрения аналитики (Yandex Metrika + Telegram-first)

## 1) Автоматически проверяемое в репозитории

### 1.1 События и payload аналитики (Playwright)
- [ ] Выполнено: `npm --workspace apps/web run e2e:analytics`.
- [ ] Срабатывает `hero_cta_telegram_click` ровно 1 раз.
- [ ] Срабатывает `hero_cta_call_click` ровно 1 раз.
- [ ] Срабатывает `header_phone_click` ровно 1 раз.
- [ ] Срабатывает `contacts_telegram_click` ровно 1 раз.
- [ ] Срабатывает `lead_form_success` после mock-submit формы.
- [ ] Срабатывает `calculator_success` после mock-submit калькулятора.
- [ ] В payload каждого события присутствуют `page_path`, `cta_location`, `source_context`,
      `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer_domain`.
- [ ] В аналитические события не попадают PII (`name`, `phone`, `message`).

### 1.2 Склейка с заявками на уровне payload API (mock)
- [ ] В mock payload `/api/lead` передаются `utm_*`, `referrer_domain`, `landing_page`,
      `source_context`.
- [ ] В mock payload `/api/cost-estimate` передаются те же поля атрибуции.
- [ ] e2e-проверка не отправляет реальные заявки в Telegram (только mock responses).

### 1.3 Техническая самопроверка после правок
- [ ] Выполнено: `npm run lint:web`.
- [ ] Выполнено: `npm run build:web`.
- [ ] Выполнено: `npm --workspace apps/web run e2e:smoke`.
- [ ] Выполнено: `npm --workspace apps/web run e2e:analytics`.

## 2) Внешние ручные шаги rollout

### 2.1 Подготовка переменных окружения и деплой
- [ ] Получен `Yandex Metrika Counter ID` (числовой ID счетчика).
- [ ] На сервере во frontend env задано: `VITE_YM_COUNTER_ID=<ваш_id>`.
- [ ] Перезапущен/пересобран frontend после изменения env.
- [ ] На проде открыт сайт и проверено, что счетчик инициализируется без ошибок в консоли.

### 2.2 Цели в Яндекс.Метрике
- [ ] Создана цель `lead_form_success` (JavaScript-событие).
- [ ] Создана цель `calculator_success` (JavaScript-событие).
- [ ] Создана цель `header_phone_click` (JavaScript-событие).
- [ ] Создана цель `contacts_telegram_click` (JavaScript-событие).
- [ ] Создана цель `hero_cta_telegram_click` (JavaScript-событие).
- [ ] Проверено в «Отладке Метрики»/реальном времени, что цели достигаются.

### 2.3 UTM-разметка для Яндекс и 2ГИС
- [ ] Для Яндекс Поиска/Карт в карточке проставлены URL с UTM по словарю.
- [ ] Для 2ГИС в карточке проставлены URL с UTM по словарю.
- [ ] Используется согласованный словарь:
  - `utm_source`: `yandex_search`, `yandex_maps`, `yandex_business`, `2gis`
  - `utm_medium`: `organic`, `profile`, `card`, `cpc`
  - `utm_campaign`: `brand_profile`, `main_card`, `seasonal_offer`
  - `utm_content`: `website_button`, `hero_cta`, `contacts_cta`
- [ ] После публикации карточек выполнен тестовый переход и проверено, что UTM пришли на сайт.

### 2.4 Финальная приемка и weekly-отчет
- [ ] Нет остатков WhatsApp (`wa.me`, `whatsapp`) в интерфейсе и событиях.
- [ ] Нет дублей событий при одном действии пользователя.
- [ ] Сессии по источникам (`yandex_*`, `2gis`) доступны в отчетах.
- [ ] Считаются CTR CTA (Telegram/phone) по источникам.
- [ ] Видна конверсия в `lead_form_success` и `calculator_success`.
- [ ] Видна доля mobile и ее вклад в лиды.
