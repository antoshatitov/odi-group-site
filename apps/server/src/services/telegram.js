import { buildAttributionLines } from './attribution.js'
import { normalizeText } from './text.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const parseRetryAfterMs = (value) => {
  if (!value) return null
  const seconds = Number(value)
  if (!Number.isNaN(seconds) && Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000))
  }

  const dateTime = Date.parse(value)
  if (Number.isNaN(dateTime)) return null

  return Math.max(0, dateTime - Date.now())
}

export const buildTelegramMessage = ({
  title,
  name,
  phone,
  message,
  projectName,
  projectId,
  source,
  attribution,
}) => {
  const normalizedMessage = normalizeText(message, 500)
  const lines = [
    title || 'Новая заявка «ОДИ»',
    `Имя: ${normalizeText(name, 80)}`,
    `Телефон: ${normalizeText(phone, 20)}`,
  ]

  if (projectName || projectId) {
    lines.push(
      `Проект: ${normalizeText(projectName || 'Без названия', 120)} (${normalizeText(
        projectId || 'без id',
        40,
      )})`,
    )
  }

  if (normalizedMessage) {
    lines.push(`Комментарий: ${normalizedMessage}`)
  }

  if (source) {
    lines.push(`Источник: ${normalizeText(source, 80)}`)
  }

  lines.push(...buildAttributionLines(attribution))
  lines.push(`Время: ${new Date().toLocaleString('ru-RU')}`)

  return lines.join('\n')
}

export const sendTelegramMessageWithRetry = async ({
  botToken,
  chatId,
  text,
  logContext,
  timeoutMs,
  retryAttempts,
  retryBaseMs,
  logger,
  fetchImpl = globalThis.fetch,
}) => {
  if (!botToken || !chatId) {
    return { ok: false, skipped: true }
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available')
  }

  const maxAttempts = Math.max(1, (Number(retryAttempts) || 0) + 1)

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      })

      if (response.ok) {
        return { ok: true }
      }

      const isRetryable = response.status === 429 || response.status >= 500
      let responseText = ''
      try {
        responseText = await response.text()
      } catch {
        responseText = ''
      }

      if (!isRetryable || attempt >= maxAttempts) {
        logger?.error(
          {
            status: response.status,
            error: responseText.slice(0, 300),
            attempt,
            maxAttempts,
            logContext,
          },
          'Telegram API error',
        )
        return { ok: false, status: response.status }
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
      const fallbackDelayMs = (Number(retryBaseMs) || 0) * 2 ** (attempt - 1)
      await sleep(retryAfterMs ?? fallbackDelayMs)
      continue
    } catch (error) {
      const isAbort = error?.name === 'AbortError'
      if (attempt >= maxAttempts) {
        logger?.error(
          {
            error: error?.message,
            attempt,
            maxAttempts,
            timeout: isAbort,
            logContext,
          },
          'Telegram request failed',
        )
        return { ok: false }
      }

      await sleep((Number(retryBaseMs) || 0) * 2 ** (attempt - 1))
    } finally {
      clearTimeout(timeout)
    }
  }

  return { ok: false }
}
