# Runbook: Rollout аналитики (Yandex Metrika + Telegram-first)

Этот runbook нужен для полного rollout по чек-листу:
`docs/analytics-rollout-checklist.md`.

## 0) Что уже покрыто кодом

- Frontend отправляет события в Яндекс.Метрику через `trackGoal`.
- В события автоматически добавляются: `page_path`, `source_context`, `utm_*`,
  `referrer_domain`, `landing_page`, first touch поля.
- Frontend передает атрибуцию в `/api/lead` и `/api/cost-estimate`.
- Backend принимает атрибуцию и включает ее в Telegram-уведомления.

## 1) Подготовка окружения и деплой

1. Получите числовой `Yandex Metrika Counter ID`.
2. Задайте переменную во frontend env на сервере:

```bash
VITE_YM_COUNTER_ID=<ваш_id>
```

3. Пересоберите и перезапустите frontend.
4. Откройте сайт в production и убедитесь, что в консоли нет ошибок инициализации Метрики.

## 2) Автоматическая проверка в репозитории

Запускайте из корня репозитория:

```bash
npm run lint:web
npm run build:web
npm --workspace apps/web run e2e:smoke
npm --workspace apps/web run e2e:analytics
```

Что проверяет `e2e:analytics`:

- цели `hero_cta_telegram_click`, `hero_cta_call_click`, `hero_cta_calculator_click`,
  `header_phone_click`, `header_consultation_click`, `mobile_menu_call_click`,
  `mobile_menu_telegram_click`, `contacts_phone_click`, `contacts_telegram_click`,
  `footer_phone_click`, `lead_form_success`, `calculator_open`, `calculator_success`;
- обязательные поля payload: `page_path`, `cta_location`, `source_context`,
  `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer_domain`;
- отсутствие PII (`name`, `phone`, `message`) в аналитических payload;
- наличие атрибуции в payload запросов `/api/lead` и `/api/cost-estimate`;
- отсутствие реальной отправки лидов (используются mock ответы, не реальный backend/Telegram).

## 3) Настройка целей в Яндекс.Метрике

В счетчике создайте цели типа "JavaScript-событие":

- `hero_cta_telegram_click`
- `hero_cta_call_click`
- `hero_cta_calculator_click`
- `header_phone_click`
- `header_consultation_click`
- `mobile_menu_call_click`
- `mobile_menu_telegram_click`
- `contacts_phone_click`
- `contacts_telegram_click`
- `footer_phone_click`
- `lead_form_success`
- `calculator_open`
- `calculator_success`

Проверка:

1. Откройте сайт с включенным `VITE_YM_COUNTER_ID`.
2. Выполните действия (клики CTA, отправка формы, расчет калькулятора).
3. В "Отладке Метрики" или realtime убедитесь, что цели достигаются.

## 4) UTM-разметка карточек Яндекс и 2ГИС

Используйте согласованный словарь:

- `utm_source`: `yandex_search`, `yandex_maps`, `yandex_business`, `2gis`
- `utm_medium`: `organic`, `profile`, `card`, `cpc`
- `utm_campaign`: `brand_profile`, `main_card`, `seasonal_offer`
- `utm_content`: `website_button`, `hero_cta`, `contacts_cta`

Примеры ссылок:

```text
https://odi-group.ru/?utm_source=yandex_maps&utm_medium=card&utm_campaign=main_card&utm_content=website_button
https://odi-group.ru/?utm_source=2gis&utm_medium=card&utm_campaign=brand_profile&utm_content=website_button
```

После публикации:

1. Сделайте тестовые переходы из карточек на сайт.
2. Проверьте в Метрике наличие визитов с `utm_source=yandex_*` и `utm_source=2gis`.

## 5) Финальная приемка rollout

Проверьте:

- нет остатков WhatsApp (`wa.me`, `whatsapp`) в интерфейсе и событиях;
- нет дублей событий при одном действии пользователя;
- видны сессии по `yandex_*` и `2gis`;
- считаются CTR CTA (Telegram/phone) по источникам;
- видна конверсия `lead_form_success` и `calculator_success`;
- видна доля mobile и вклад mobile в лиды.

## 6) Weekly отчет

Ориентируйтесь на шаблон `analytics-weekly-report.md`.
Минимальный еженедельный набор:

1. Сессии по источникам (`yandex_*`, `2gis`).
2. CTR контактных CTA:
   `(hero_cta_telegram_click + hero_cta_call_click + header_phone_click + contacts_phone_click + contacts_telegram_click + footer_phone_click + mobile_menu_call_click + mobile_menu_telegram_click) / sessions`.
3. CTR консультации: `header_consultation_click / sessions`.
4. CTR открытия калькулятора: `hero_cta_calculator_click / sessions`.
5. CR в лид: `lead_form_success / sessions`.
6. CR калькулятора: `calculator_success / sessions`.
7. Mobile вклад: доля mobile-сессий и mobile-конверсия в `lead_form_success`.
