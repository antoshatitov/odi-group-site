# Weekly Analytics Report (Yandex + 2GIS)

Отчёт обновляется раз в неделю и используется для CRO-решений по лендингу.

## Цели в Яндекс.Метрике

Создайте цели по JS-событиям:

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

## Сегменты источников

- `utm_source` содержит `yandex_`
- `utm_source = 2gis`
- `Устройство = mobile`

## Метрики, которые смотрим каждую неделю

1. Сессии по источникам (`yandex_*`, `2gis`).
2. CTR контактных CTA:
   `(hero_cta_telegram_click + hero_cta_call_click + header_phone_click + contacts_phone_click + contacts_telegram_click + footer_phone_click + mobile_menu_call_click + mobile_menu_telegram_click) / sessions`.
3. CTR консультации:
   `header_consultation_click / sessions`.
4. CTR открытия калькулятора:
   `hero_cta_calculator_click / sessions`.
5. Конверсия в заявку:
   `lead_form_success / sessions`.
6. Конверсия калькулятора:
   `calculator_success / sessions`.
7. Mobile вклад:
   доля mobile-сессий и mobile-конверсия в `lead_form_success`.

## Решения по отчёту

- Высокий трафик + низкий CTR CTA: правим оффер/CTA в hero и шапке.
- Нормальный CTR + низкий `lead_form_success`: упрощаем форму или текст перед формой.
- Высокий CTR Telegram из 2GIS + низкие заявки: усиливаем Telegram-сценарий контакта на первом экране.
