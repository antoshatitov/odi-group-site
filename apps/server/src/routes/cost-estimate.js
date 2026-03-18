import { costSchema } from '../schemas.js'
import { verifyCaptchaToken } from '../services/captcha.js'
import { createCalcMetrics } from '../services/metrics.js'
import { createDedupStore, createSlidingWindowLimiter } from '../services/rate-limit.js'
import {
  formatKaliningradTimestamp,
  formatRubles,
  hashValue,
  normalizePhone,
  normalizeText,
} from '../services/text.js'
import { sendTelegramMessageWithRetry } from '../services/telegram.js'

const CALC_PACKAGE_LABELS = {
  black: 'Черный ключ',
  gray: 'Серый ключ',
  white: 'Белый ключ',
}

const CALC_PACKAGE_RATES = {
  black: 60000,
  gray: 80000,
  white: 100000,
}

const CALC_DEDUP_WINDOW_MS = 30 * 60 * 1000
const CALC_FAST_SUBMIT_MS = 4000
const CALC_MAX_OPEN_WINDOW_MS = 2 * 60 * 60 * 1000
const CALC_ALLOWED_FUTURE_SKEW_MS = 2 * 60 * 1000

export const createCostEstimateRuntime = (config) => ({
  metrics: createCalcMetrics(),
  ipLimiter: createSlidingWindowLimiter(
    [
      { windowMs: 60 * 1000, max: 3 },
      { windowMs: 60 * 60 * 1000, max: 10 },
      { windowMs: 24 * 60 * 60 * 1000, max: 30 },
    ],
    { maxKeys: config.inMemoryLimiterMaxKeys },
  ),
  phoneLimiter: createSlidingWindowLimiter(
    [
      { windowMs: 10 * 60 * 1000, max: 1 },
      { windowMs: 24 * 60 * 60 * 1000, max: 2 },
    ],
    { maxKeys: config.inMemoryLimiterMaxKeys },
  ),
  globalLimiter: createSlidingWindowLimiter([{ windowMs: 10 * 60 * 1000, max: 20 }], {
    maxKeys: config.inMemoryLimiterMaxKeys,
  }),
  dedupStore: createDedupStore({
    windowMs: CALC_DEDUP_WINDOW_MS,
    maxKeys: config.inMemoryDedupMaxKeys,
  }),
})

const buildCalcMessage = ({
  timestamp,
  floors,
  area,
  packageLabel,
  name,
  phone,
  estimate,
  attribution,
}) => {
  const lines = [
    'Заявка: Расчет стоимости',
    `Время: ${timestamp}`,
    `Этажность: ${floors}`,
    `Площадь: ${area} м²`,
    `Комплектация: ${packageLabel}`,
    `Имя: ${normalizeText(name, 80)}`,
    `Телефон: ${normalizeText(phone, 20)}`,
    `Ориентировочная стоимость: ${estimate}`,
  ]

  const sourceContext = normalizeText(attribution.source_context, 120)
  const utmSource = normalizeText(attribution.utm_source, 120)
  const utmMedium = normalizeText(attribution.utm_medium, 120)
  const utmCampaign = normalizeText(attribution.utm_campaign, 160)
  const utmContent = normalizeText(attribution.utm_content, 160)
  const utmTerm = normalizeText(attribution.utm_term, 160)
  const referrerDomain = normalizeText(attribution.referrer_domain, 255)
  const landingPage = normalizeText(attribution.landing_page, 255)
  const firstUtmSource = normalizeText(attribution.first_utm_source, 120)
  const firstUtmMedium = normalizeText(attribution.first_utm_medium, 120)
  const firstUtmCampaign = normalizeText(attribution.first_utm_campaign, 160)
  const firstUtmContent = normalizeText(attribution.first_utm_content, 160)
  const firstUtmTerm = normalizeText(attribution.first_utm_term, 160)
  const firstReferrerDomain = normalizeText(attribution.first_referrer_domain, 255)
  const firstLandingPage = normalizeText(attribution.first_landing_page, 255)

  if (sourceContext) {
    lines.push(`Контекст: ${sourceContext}`)
  }

  if (utmSource || utmMedium || utmCampaign || utmContent || utmTerm) {
    lines.push(
      `UTM: source=${utmSource || '-'}, medium=${utmMedium || '-'}, campaign=${
        utmCampaign || '-'
      }, content=${utmContent || '-'}, term=${utmTerm || '-'}`,
    )
  }

  if (referrerDomain) {
    lines.push(`Реферер: ${referrerDomain}`)
  }

  if (landingPage) {
    lines.push(`Landing: ${landingPage}`)
  }

  if (
    firstUtmSource ||
    firstUtmMedium ||
    firstUtmCampaign ||
    firstUtmContent ||
    firstUtmTerm ||
    firstReferrerDomain ||
    firstLandingPage
  ) {
    lines.push(
      `First touch: source=${firstUtmSource || '-'}, medium=${firstUtmMedium || '-'}, campaign=${
        firstUtmCampaign || '-'
      }, content=${firstUtmContent || '-'}, term=${firstUtmTerm || '-'}, ref=${
        firstReferrerDomain || '-'
      }, landing=${firstLandingPage || '-'}`,
    )
  }

  return lines.join('\n')
}

const validateCalcTimestamps = ({ openedAt, submittedAt, now }) => {
  const openedAtNum = Number(openedAt)
  const submittedAtNum = Number(submittedAt)

  if (!Number.isFinite(openedAtNum) || !Number.isFinite(submittedAtNum)) {
    return { valid: false, reason: 'invalid_timestamp_type' }
  }

  if (openedAtNum <= 0 || submittedAtNum <= 0) {
    return { valid: false, reason: 'invalid_timestamp_value' }
  }

  if (openedAtNum > now + CALC_ALLOWED_FUTURE_SKEW_MS) {
    return { valid: false, reason: 'opened_at_in_future' }
  }

  if (submittedAtNum > now + CALC_ALLOWED_FUTURE_SKEW_MS) {
    return { valid: false, reason: 'submitted_at_in_future' }
  }

  const submitDelta = submittedAtNum - openedAtNum
  if (submitDelta < 0) {
    return { valid: false, reason: 'submitted_before_opened' }
  }

  return { valid: true, submitDelta }
}

export const registerCostEstimateRoute = (server, config, runtime = createCostEstimateRuntime(config)) => {
  server.post('/api/cost-estimate', { schema: costSchema }, async (request, reply) => {
    const {
      floors,
      area,
      packageType,
      name,
      phone,
      consent,
      website,
      openedAt,
      submittedAt,
      action,
      clientSuspected,
      clientSuspectedReason,
      captchaToken,
      source_context,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer_domain,
      landing_page,
      first_utm_source,
      first_utm_medium,
      first_utm_campaign,
      first_utm_content,
      first_utm_term,
      first_referrer_domain,
      first_landing_page,
    } = request.body

    runtime.metrics.total += 1
    const now = Date.now()
    const ip = request.ip
    const userAgent = request.headers['user-agent']

    if (!consent) {
      runtime.metrics.blocked += 1
      server.log.info({ event: 'calc_blocked', reason: 'missing_consent', ip, phone, userAgent })
      reply.code(400).send({ error: 'Consent is required' })
      return
    }

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      runtime.metrics.blocked += 1
      server.log.info({ event: 'calc_blocked', reason: 'invalid_phone', ip, phone, userAgent })
      reply.code(400).send({ error: 'Invalid phone' })
      return
    }

    const areaRounded = Math.round(Number(area))
    const floorsValue = Number(floors)
    const packageLabel = CALC_PACKAGE_LABELS[packageType]
    const estimateValue = areaRounded * CALC_PACKAGE_RATES[packageType]
    const formattedEstimate = formatRubles(estimateValue)
    const responsePayload = { ok: true, estimate: estimateValue, formattedEstimate }

    if (website) {
      runtime.metrics.blocked += 1
      server.log.info({ event: 'calc_dropped', reason: 'honeypot', ip, phone: normalizedPhone, userAgent })
      reply.code(200).send(responsePayload)
      return
    }

    if (config.captchaEnabled && !captchaToken) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'calc_blocked',
        reason: 'captcha_required',
        ip,
        phone: normalizedPhone,
        userAgent,
      })
      reply.code(400).send({ error: 'Captcha required' })
      return
    }

    if (config.captchaEnabled) {
      const captchaResult = await verifyCaptchaToken({
        enabled: config.captchaEnabled,
        secretKey: config.captchaSecretKey,
        verifyUrl: config.captchaVerifyUrl,
        expectedHostname: config.captchaExpectedHostname,
        token: captchaToken,
        ip,
        timeoutMs: config.telegramTimeoutMs,
      })

      if (!captchaResult.ok) {
        runtime.metrics.blocked += 1
        server.log.info({
          event: 'calc_blocked',
          reason: captchaResult.misconfigured ? 'captcha_misconfigured' : 'captcha_failed',
          ip,
          phone: normalizedPhone,
          userAgent,
        })

        if (captchaResult.transient || captchaResult.misconfigured) {
          reply.code(503).send({ error: 'Captcha verification unavailable' })
          return
        }

        reply.code(400).send({ error: 'Captcha verification failed' })
        return
      }
    }

    const ipCheck = runtime.ipLimiter.check(ip, now)
    if (!ipCheck.allowed) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'calc_blocked',
        reason: 'ip_rate_limit',
        ip,
        phone: normalizedPhone,
        userAgent,
        details: { windowMs: ipCheck.limit.windowMs, max: ipCheck.limit.max },
      })
      reply.code(429).send({ error: 'Too many requests' })
      return
    }

    const phoneCheck = runtime.phoneLimiter.check(normalizedPhone, now)
    if (!phoneCheck.allowed) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'calc_blocked',
        reason: 'phone_rate_limit',
        ip,
        phone: normalizedPhone,
        userAgent,
        details: { windowMs: phoneCheck.limit.windowMs, max: phoneCheck.limit.max },
      })
      reply.code(429).send({ error: 'Too many requests' })
      return
    }

    const dedupKey = hashValue(
      `${normalizedPhone}|${packageType}|${areaRounded}|${floorsValue}|${action || 'cost_estimate'}`,
      config.logHashSalt,
    )
    if (runtime.dedupStore.check(dedupKey, now)) {
      runtime.metrics.dedup += 1
      server.log.info({ event: 'calc_dedup', reason: 'duplicate', ip, phone: normalizedPhone, userAgent })
      reply.code(200).send(responsePayload)
      return
    }

    const timestampValidation = validateCalcTimestamps({ openedAt, submittedAt, now })
    if (!timestampValidation.valid) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'calc_blocked',
        reason: timestampValidation.reason,
        ip,
        phone: normalizedPhone,
        userAgent,
      })
      reply.code(400).send({ error: 'Invalid timing fields' })
      return
    }

    const submitDelta = timestampValidation.submitDelta
    const quarantineReasons = []
    const addQuarantineReason = (reason) => {
      if (reason && !quarantineReasons.includes(reason)) {
        quarantineReasons.push(reason)
      }
    }

    if (submitDelta < CALC_FAST_SUBMIT_MS) {
      addQuarantineReason('fast_submit')
    }

    if (submitDelta > CALC_MAX_OPEN_WINDOW_MS) {
      addQuarantineReason('stale_form')
    }

    if (clientSuspected) {
      addQuarantineReason(clientSuspectedReason || 'client_suspected')
    }

    if (quarantineReasons.length === 0) {
      const globalCheck = runtime.globalLimiter.check('global', now)
      if (!globalCheck.allowed) {
        quarantineReasons.push('global_send_limit')
      }
    }

    const timestamp = formatKaliningradTimestamp(new Date(now))
    const message = buildCalcMessage({
      timestamp,
      floors: floorsValue,
      area: areaRounded,
      packageLabel,
      name,
      phone: normalizedPhone,
      estimate: formattedEstimate,
      attribution: {
        source_context,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        referrer_domain,
        landing_page,
        first_utm_source,
        first_utm_medium,
        first_utm_campaign,
        first_utm_content,
        first_utm_term,
        first_referrer_domain,
        first_landing_page,
      },
    })

    if (quarantineReasons.length > 0) {
      runtime.metrics.quarantine += 1
      const quarantineMessage = `${message}\nПричина: ${quarantineReasons.join(', ')}`
      const result = await sendTelegramMessageWithRetry({
        botToken: config.calcBotToken,
        chatId: config.quarantineChatId,
        text: quarantineMessage,
        logContext: 'calculator',
        timeoutMs: config.telegramTimeoutMs,
        retryAttempts: config.telegramRetryAttempts,
        retryBaseMs: config.telegramRetryBaseMs,
        logger: server.log,
      })
      server.log.info({
        event: 'calc_quarantine',
        reason: quarantineReasons.join(','),
        ip,
        phone: normalizedPhone,
        userAgent,
        details: {
          sent: result.ok,
          skipped: result.skipped || false,
          clientSuspected: Boolean(clientSuspected),
          clientSuspectedReason: clientSuspectedReason || null,
        },
      })
      reply.code(200).send(responsePayload)
      return
    }

    if (!config.calcBotToken || !config.calcChatId) {
      server.log.info({
        event: 'calc_skipped',
        reason: 'missing_telegram_config',
        ip,
        phone: normalizedPhone,
        userAgent,
      })
      reply.code(200).send(responsePayload)
      return
    }

    const sendResult = await sendTelegramMessageWithRetry({
      botToken: config.calcBotToken,
      chatId: config.calcChatId,
      text: message,
      logContext: 'calculator',
      timeoutMs: config.telegramTimeoutMs,
      retryAttempts: config.telegramRetryAttempts,
      retryBaseMs: config.telegramRetryBaseMs,
      logger: server.log,
    })

    if (!sendResult.ok) {
      reply.code(502).send({ error: 'Failed to deliver message' })
      return
    }

    runtime.metrics.sent += 1
    server.log.info({ event: 'calc_sent', reason: 'ok', ip, phone: normalizedPhone, userAgent })
    reply.code(200).send(responsePayload)
  })

  return runtime
}
