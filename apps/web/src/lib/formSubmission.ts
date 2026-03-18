import { getAttribution } from '../utils/analytics'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
export const PHONE_INPUT_PATTERN = /^[0-9+()\s-]{7,20}$/
const DEFAULT_REQUEST_TIMEOUT_MS = 12_000

export type FormSubmissionErrorKind = 'timeout' | 'request'

export class FormSubmissionError extends Error {
  readonly kind: FormSubmissionErrorKind

  constructor(kind: FormSubmissionErrorKind, message: string) {
    super(message)
    this.name = 'FormSubmissionError'
    this.kind = kind
  }
}

type SubmissionMessages = {
  timeout: string
  request: string
}

const buildApiUrl = (path: string) => `${API_BASE}${path}`

const createRequestTimeout = (timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  return { controller, timeoutId }
}

const extractErrorMessage = (value: unknown) => {
  if (!value || typeof value !== 'object') return ''

  const candidate = value as { error?: unknown; message?: unknown }
  if (typeof candidate.error === 'string') return candidate.error
  if (typeof candidate.message === 'string') return candidate.message

  return ''
}

export const isValidPhoneNumber = (value: string) => PHONE_INPUT_PATTERN.test(value.trim())

export const getSubmissionErrorKind = (error: unknown): FormSubmissionErrorKind | null => {
  if (error instanceof FormSubmissionError) {
    return error.kind
  }

  return null
}

export const getSubmissionErrorMessage = (error: unknown, messages: SubmissionMessages) => {
  const kind = getSubmissionErrorKind(error)
  if (kind === 'timeout') return messages.timeout
  return messages.request
}

export const submitFormJson = async <TResponse, TPayload extends Record<string, unknown>>({
  path,
  payload,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}: {
  path: string
  payload: TPayload
  timeoutMs?: number
}): Promise<TResponse> => {
  const { controller, timeoutId } = createRequestTimeout(timeoutMs)

  try {
    const response = await fetch(buildApiUrl(path), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...payload,
        ...getAttribution(),
      }),
    })

    const responseBody: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      throw new FormSubmissionError('request', extractErrorMessage(responseBody) || 'Request failed')
    }

    return responseBody as TResponse
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new FormSubmissionError('timeout', 'Request timed out')
    }

    throw new FormSubmissionError(
      'request',
      error instanceof Error && error.message ? error.message : 'Request failed',
    )
  } finally {
    window.clearTimeout(timeoutId)
  }
}
