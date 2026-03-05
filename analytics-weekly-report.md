# Weekly Analytics Report (Yandex + 2GIS)

Отчёт обновляется раз в неделю и используется для CRO-решений по лендингу.

## Цели в Яндекс.Метрике

Создайте цели по JS-событиям:

- `lead_form_success`
- `calculator_success`
- `header_phone_click`
- `contacts_telegram_click`
- `hero_cta_telegram_click`

## Сегменты источников

- `utm_source` содержит `yandex_`
- `utm_source = 2gis`
- `Устройство = mobile`

## Метрики, которые смотрим каждую неделю

1. Сессии по источникам (`yandex_*`, `2gis`).
2. CTR кликов в Telegram/телефон:
   `hero_cta_telegram_click + contacts_telegram_click + header_phone_click` / `sessions`.
3. Конверсия в заявку:
   `lead_form_success / sessions`.
4. Конверсия калькулятора:
   `calculator_success / sessions`.
5. Mobile вклад:
   доля mobile-сессий и mobile-конверсия в `lead_form_success`.

## Решения по отчёту

- Высокий трафик + низкий CTR CTA: правим оффер/CTA в hero и шапке.
- Нормальный CTR + низкий `lead_form_success`: упрощаем форму или текст перед формой.
- Высокий CTR Telegram из 2GIS + низкие заявки: усиливаем Telegram-сценарий контакта на первом экране.
