import { useRef, useState } from 'react'

import type { FormEvent } from 'react'

import Button from './Button'
import Input from './Input'
import TextArea from './TextArea'

type LeadFormProps = {
  source: string
  projectId?: string
  projectName?: string
}

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const phonePattern = /^[0-9+()\s-]{7,20}$/
const REQUEST_TIMEOUT_MS = 12_000

const LeadForm = ({ source, projectId, projectName }: LeadFormProps) => {
  const isConsultation = source === 'consultation'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const nameRef = useRef<HTMLInputElement | null>(null)
  const phoneRef = useRef<HTMLInputElement | null>(null)
  const messageRef = useRef<HTMLTextAreaElement | null>(null)
  const consentRef = useRef<HTMLInputElement | null>(null)

  const reset = () => {
    setName('')
    setPhone('')
    setMessage('')
    setConsent(false)
    setHoneypot('')
    setFieldErrors({})
  }

  const focusFirstError = (nextErrors: Record<string, string>) => {
    if (nextErrors.name) {
      nameRef.current?.focus()
      return
    }
    if (nextErrors.phone) {
      phoneRef.current?.focus()
      return
    }
    if (nextErrors.message) {
      messageRef.current?.focus()
      return
    }
    if (nextErrors.consent) {
      consentRef.current?.focus()
    }
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (name.trim().length < 2) {
      nextErrors.name = 'Укажите имя и фамилию.'
    }
    if (!phonePattern.test(phone.trim())) {
      nextErrors.phone = 'Введите корректный номер телефона.'
    }
    if (isConsultation && message.trim().length === 0) {
      nextErrors.message = 'Опишите ваш вопрос в комментарии.'
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

    setStatus('loading')

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${API_BASE}/api/lead`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          name,
          phone,
          message,
          projectId,
          projectName,
          source,
          consent,
          website: honeypot,
        }),
      })

      if (!response.ok) {
        throw new Error('Ошибка отправки')
      }

      setStatus('success')
      reset()
    } catch (error) {
      setStatus('error')
      if (error instanceof DOMException && error.name === 'AbortError') {
        setError('Сервер отвечает слишком долго. Проверьте интернет и попробуйте ещё раз.')
      } else {
        setError('Не удалось отправить заявку. Попробуйте ещё раз или позвоните.')
      }
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <Input
        label="Имя"
        name="name"
        required
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          setFieldErrors((current) => ({ ...current, name: '' }))
        }}
        placeholder="Как к вам обращаться…"
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
          setFieldErrors((current) => ({ ...current, phone: '' }))
        }}
        placeholder="+7 (___) ___-__-__"
        pattern="[0-9+()\\s-]{7,20}"
        autoComplete="tel"
        error={fieldErrors.phone}
        ref={phoneRef}
      />
      <TextArea
        label="Комментарий"
        name="message"
        value={message}
        required={isConsultation}
        onChange={(event) => {
          setMessage(event.target.value)
          setFieldErrors((current) => ({ ...current, message: '' }))
        }}
        placeholder="Коротко опишите задачу или пожелания…"
        error={fieldErrors.message}
        ref={messageRef}
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
            aria-describedby={fieldErrors.consent ? 'lead-consent-error' : undefined}
            onChange={(event) => {
              setConsent(event.target.checked)
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
          <span className="field-error" id="lead-consent-error" role="alert">
            {fieldErrors.consent}
          </span>
        )}
      </div>
      {status === 'success' && (
        <div className="badge" role="status">
          Спасибо! Мы свяжемся с вами в ближайшее время.
        </div>
      )}
      {status === 'error' && error && (
        <div
          className="badge"
          role="alert"
          style={{ background: 'rgba(199, 126, 108, 0.2)', color: '#8b3d2f' }}
        >
          {error}
        </div>
      )}
      <Button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Отправляем…' : 'Отправить заявку'}
      </Button>
    </form>
  )
}

export default LeadForm
