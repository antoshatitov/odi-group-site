import { useRef, useState } from 'react'

import type { FormEvent } from 'react'

import Button from './Button'
import Input from './Input'
import { formatRubles } from '../utils/format'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const LOCAL_ATTEMPTS_KEY = 'odi_calc_attempts'
const LOCAL_LIMIT_WINDOW_MS = 2 * 60 * 1000
const LOCAL_LIMIT_MAX = 2
const SOFT_DELAY_MS = 300
const FAST_SUBMIT_MS = 4000
const REQUEST_TIMEOUT_MS = 12_000
const phonePattern = /^[0-9+()\s-]{7,20}$/

const readLocalAttempts = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_ATTEMPTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => typeof item === 'number')
  } catch {
    return []
  }
}

const writeLocalAttempts = (attempts: number[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify(attempts))
  } catch {
    // ignore storage errors
  }
}

const getRecentAttempts = (now: number) => {
  const attempts = readLocalAttempts().filter((timestamp) => now - timestamp < LOCAL_LIMIT_WINDOW_MS)
  writeLocalAttempts(attempts)
  return attempts
}

const recordAttempt = (now: number) => {
  const attempts = getRecentAttempts(now)
  attempts.push(now)
  writeLocalAttempts(attempts)
  return attempts.length
}

const packageOptions = [
  {
    value: 'black',
    label: 'Черный ключ',
    description:
      'Фундамент, коробка (черновые стены и перекрытия), кровля без утепления. Оптимально, если хотите продолжить работы поэтапно.',
  },
  {
    value: 'gray',
    label: 'Серый ключ',
    description:
      'Теплый контур и инженерия: утеплённая кровля, оштукатуренные стены, окна и входная дверь, отопление (тёплый пол или радиаторы), электрика, септик и скважина, фасад с декоративной штукатуркой.',
  },
  {
    value: 'white',
    label: 'Белый ключ',
    description:
      'Дом «заезжай и живи»: чистовая отделка во всех помещениях, потолки, установленная сантехника и всё необходимое для комфортного проживания.',
  },
]

const CostCalculator = () => {
  const [floors, setFloors] = useState('')
  const [area, setArea] = useState('')
  const [packageType, setPackageType] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [estimate, setEstimate] = useState('')
  const [activeInfo, setActiveInfo] = useState<string | null>(null)
  const [openedAt] = useState(() => Date.now())
  const floorsRef = useRef<HTMLSelectElement | null>(null)
  const areaRef = useRef<HTMLInputElement | null>(null)
  const packageRef = useRef<HTMLInputElement | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const phoneRef = useRef<HTMLInputElement | null>(null)
  const consentRef = useRef<HTMLInputElement | null>(null)

  const resetResult = () => {
    if (estimate) setEstimate('')
    if (status !== 'idle') setStatus('idle')
    if (error) setError('')
  }

  const resetForm = () => {
    setFloors('')
    setArea('')
    setPackageType('')
    setName('')
    setPhone('')
    setConsent(false)
    setHoneypot('')
    setStatus('idle')
    setError('')
    setFieldErrors({})
    setEstimate('')
    setActiveInfo(null)
  }

  const focusFirstError = (nextErrors: Record<string, string>) => {
    if (nextErrors.floors) {
      floorsRef.current?.focus()
      return
    }
    if (nextErrors.area) {
      areaRef.current?.focus()
      return
    }
    if (nextErrors.packageType) {
      packageRef.current?.focus()
      return
    }
    if (nextErrors.name) {
      nameRef.current?.focus()
      return
    }
    if (nextErrors.phone) {
      phoneRef.current?.focus()
      return
    }
    if (nextErrors.consent) {
      consentRef.current?.focus()
    }
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!floors) {
      nextErrors.floors = 'Выберите этажность дома.'
    }

    const areaValue = Number(area)
    if (!Number.isFinite(areaValue) || areaValue <= 0) {
      nextErrors.area = 'Введите площадь дома в м².'
    }

    if (!packageType) {
      nextErrors.packageType = 'Выберите комплектацию строительства.'
    }

    if (name.trim().length < 2) {
      nextErrors.name = 'Введите имя и фамилию.'
    }

    if (!phonePattern.test(phone.trim())) {
      nextErrors.phone = 'Введите корректный номер телефона.'
    }

    if (!consent) {
      nextErrors.consent = 'Подтвердите согласие на обработку персональных данных.'
    }

    setFieldErrors(nextErrors)
    return nextErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStatus('idle')

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors)
      return
    }

    const areaValue = Number(area)
    const attemptTime = Date.now()
    const recentAttempts = getRecentAttempts(attemptTime)
    if (recentAttempts.length >= LOCAL_LIMIT_MAX) {
      setError('Слишком частые запросы. Попробуйте снова через пару минут.')
      setStatus('error')
      return
    }

    recordAttempt(attemptTime)
    setStatus('loading')

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      await new Promise((resolve) => setTimeout(resolve, SOFT_DELAY_MS))
      const submittedAt = Date.now()
      const clientSuspected = submittedAt - openedAt < FAST_SUBMIT_MS

      const requestPayload = {
        floors: Number(floors),
        area: areaValue,
        packageType,
        name: name.trim(),
        phone,
        consent,
        website: honeypot,
        openedAt,
        submittedAt,
        action: 'cost_estimate',
        ...(clientSuspected
          ? { clientSuspected: true, clientSuspectedReason: 'fast_submit' }
          : {}),
      }

      const response = await fetch(`${API_BASE}/api/cost-estimate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestPayload),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Ошибка отправки')
      }

      const formattedEstimate =
        payload?.formattedEstimate || (payload?.estimate ? formatRubles(payload.estimate) : '')

      if (formattedEstimate) {
        setEstimate(formattedEstimate)
      }

      setStatus('success')
    } catch (error) {
      setStatus('error')
      if (error instanceof DOMException && error.name === 'AbortError') {
        setError('Сервер отвечает слишком долго. Проверьте интернет и попробуйте ещё раз.')
      } else {
        setError('Не удалось выполнить расчет. Попробуйте позже или позвоните нам.')
      }
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted">
        Укажите основные параметры будущего дома — рассчитаем ориентировочную стоимость и свяжемся
        с вами в течение двух часов.
      </p>
      <form className="calculator-form" onSubmit={handleSubmit} noValidate>
        <div className="calculator-grid">
          <label className="field">
            <span>Количество этажей</span>
            <select
              className="select"
              value={floors}
              required
              name="floors"
              ref={floorsRef}
              aria-invalid={Boolean(fieldErrors.floors)}
              aria-describedby={fieldErrors.floors ? 'floors-error' : undefined}
              onChange={(event) => {
                setFloors(event.target.value)
                resetResult()
                setFieldErrors((current) => ({ ...current, floors: '' }))
              }}
            >
              <option value="" disabled>
                Выберите
              </option>
              <option value="1">1 этаж</option>
              <option value="2">2 этажа</option>
            </select>
            {fieldErrors.floors && (
              <span className="field-error" id="floors-error" role="alert">
                {fieldErrors.floors}
              </span>
            )}
          </label>
          <label className="field">
            <span>Площадь дома</span>
            <div className="input-suffix">
              <input
                className="input input-suffix-field"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={area}
                name="area"
                ref={areaRef}
                aria-invalid={Boolean(fieldErrors.area)}
                aria-describedby={fieldErrors.area ? 'area-error' : undefined}
                onChange={(event) => {
                  setArea(event.target.value)
                  resetResult()
                  setFieldErrors((current) => ({ ...current, area: '' }))
                }}
                placeholder="100"
                required
              />
              <span className="input-suffix-text">м²</span>
            </div>
            {fieldErrors.area && (
              <span className="field-error" id="area-error" role="alert">
                {fieldErrors.area}
              </span>
            )}
          </label>
        </div>

        <div className="field" style={{ gap: 'var(--space-3)' }}>
          <span>Комплектация</span>
          <div
            className="calculator-options"
            role="radiogroup"
            aria-invalid={Boolean(fieldErrors.packageType)}
            aria-describedby={fieldErrors.packageType ? 'package-type-error' : undefined}
          >
            {packageOptions.map((option, index) => {
              const isActive = packageType === option.value
              const isInfoOpen = activeInfo === option.value
              return (
                <div key={option.value} className={`calculator-option ${isActive ? 'is-active' : ''}`}>
                  <label className="calculator-option-main">
                    <input
                      type="radio"
                      name="packageType"
                      value={option.value}
                      checked={isActive}
                      required={index === 0}
                      ref={index === 0 ? packageRef : undefined}
                      onChange={(event) => {
                        setPackageType(event.target.value)
                        resetResult()
                        setFieldErrors((current) => ({ ...current, packageType: '' }))
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                  <button
                    type="button"
                    className="calculator-option-info"
                    aria-label={`Описание комплектации ${option.label}`}
                    aria-expanded={isInfoOpen}
                    onClick={() =>
                      setActiveInfo((current) => (current === option.value ? null : option.value))
                    }
                  >
                    i
                  </button>
                  {isInfoOpen && <div className="calculator-option-desc">{option.description}</div>}
                </div>
              )
            })}
          </div>
          {fieldErrors.packageType && (
            <span className="field-error" id="package-type-error" role="alert">
              {fieldErrors.packageType}
            </span>
          )}
        </div>

        <Input
          label="Имя и фамилия"
          name="name"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            resetResult()
            setFieldErrors((current) => ({ ...current, name: '' }))
          }}
          placeholder="Например, Иван Петров…"
          autoComplete="name"
          error={fieldErrors.name}
          ref={nameRef}
        />
        <Input
          label="Телефон"
          name="phone"
          type="tel"
          required
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value)
            resetResult()
            setFieldErrors((current) => ({ ...current, phone: '' }))
          }}
          placeholder="+7 (___) ___-__-__"
          pattern="[0-9+()\\s-]{7,20}"
          autoComplete="tel"
          error={fieldErrors.phone}
          ref={phoneRef}
        />

        <label className="field" style={{ display: 'none' }} aria-hidden="true">
          <span>Website</span>
          <input
            className="input"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>

        <div className="field">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              aria-invalid={Boolean(fieldErrors.consent)}
              aria-describedby={fieldErrors.consent ? 'consent-error' : undefined}
              onChange={(event) => {
                setConsent(event.target.checked)
                resetResult()
                setFieldErrors((current) => ({ ...current, consent: '' }))
              }}
              required
              ref={consentRef}
            />
            <span>
              Я соглашаюсь с{' '}
              <a href="/consent" className="chip" target="_blank" rel="noreferrer">
                условиями обработки персональных данных
              </a>
              .
            </span>
          </label>
          {fieldErrors.consent && (
            <span className="field-error" id="consent-error" role="alert">
              {fieldErrors.consent}
            </span>
          )}
        </div>

        {status === 'error' && error && (
          <div className="calculator-alert calculator-alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="calculator-actions">
          <Button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Считаем…' : 'Расчет стоимости'}
          </Button>
          <Button type="button" variant="outline" onClick={resetForm}>
            Сбросить
          </Button>
        </div>

        {status === 'success' && estimate && (
          <div className="calculator-result" role="status" aria-live="polite">
            <span className="eyebrow">Ориентировочная стоимость</span>
            <strong>{estimate}</strong>
            <span className="muted">
              Заявка отправлена. Мы свяжемся с вами в течении двух часов.
            </span>
          </div>
        )}
      </form>
    </div>
  )
}

export default CostCalculator
