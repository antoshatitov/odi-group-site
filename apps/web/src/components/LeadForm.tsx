import { useRef, useState } from 'react'

import type { FormEvent } from 'react'

import Button from './Button'
import Input from './Input'
import TextArea from './TextArea'
import {
  PHONE_INPUT_PATTERN,
  getSubmissionErrorMessage,
  isValidPhoneNumber,
  submitFormJson,
} from '../lib/formSubmission'

type LeadFormProps = {
  source: string
  projectId?: string
  projectName?: string
  messageMode?: 'optional' | 'required' | 'hidden'
  submitLabel?: string
  successMessage?: string
  className?: string
  autoPrefixRussianPhone?: boolean
}

const applyRussianPhonePrefix = (value: string) => {
  const trimmedStart = value.trimStart()
  if (trimmedStart.startsWith('+7')) return value

  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('9')) return `+7${digits}`
  if (digits.startsWith('7')) return `+${digits}`

  return value
}

const LeadForm = ({
  source,
  projectId,
  projectName,
  messageMode = source === 'consultation' ? 'required' : 'optional',
  submitLabel = 'Отправить заявку',
  successMessage = 'Спасибо! Мы свяжемся с вами в ближайшее время.',
  className = '',
  autoPrefixRussianPhone = false,
}: LeadFormProps) => {
  const isMessageRequired = messageMode === 'required'
  const shouldRenderMessage = messageMode !== 'hidden'
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
    if (!isValidPhoneNumber(phone)) {
      nextErrors.phone = 'Введите корректный номер телефона.'
    }
    if (isMessageRequired && message.trim().length === 0) {
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

    try {
      await submitFormJson<{ ok: true }, Record<string, unknown>>({
        path: '/api/lead',
        payload: {
          name,
          phone,
          message: shouldRenderMessage ? message : '',
          projectId,
          projectName,
          source,
          source_context: source,
          consent,
          website: honeypot,
        },
      })

      setStatus('success')
      reset()
    } catch (error) {
      setStatus('error')
      setError(
        getSubmissionErrorMessage(error, {
          timeout: 'Сервер отвечает слишком долго. Проверьте интернет и попробуйте ещё раз.',
          request: 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните.',
        }),
      )
    }
  }

  return (
    <form
      className={`stack ${className}`.trim()}
      onSubmit={handleSubmit}
      noValidate
    >
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
          const nextPhone = autoPrefixRussianPhone
            ? applyRussianPhonePrefix(event.target.value)
            : event.target.value
          setPhone(nextPhone)
          setFieldErrors((current) => ({ ...current, phone: '' }))
        }}
        placeholder="+7 (___) ___-__-__"
        pattern={PHONE_INPUT_PATTERN.source}
        autoComplete="tel"
        error={fieldErrors.phone}
        ref={phoneRef}
      />
      {shouldRenderMessage ? (
        <TextArea
          label="Комментарий"
          name="message"
          value={message}
          required={isMessageRequired}
          onChange={(event) => {
            setMessage(event.target.value)
            setFieldErrors((current) => ({ ...current, message: '' }))
          }}
          placeholder="Коротко опишите задачу или пожелания…"
          error={fieldErrors.message}
          ref={messageRef}
        />
      ) : null}
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
            <a href="/consent" className="consent-link" target="_blank" rel="noreferrer">
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
          {successMessage}
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
        {status === 'loading' ? 'Отправляем…' : submitLabel}
      </Button>
    </form>
  )
}

export default LeadForm
