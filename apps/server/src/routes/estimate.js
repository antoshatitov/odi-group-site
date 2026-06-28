import { estimatePayloadSchema } from '@odi/contracts'

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
import { buildEstimateEmail, sendEstimateEmail } from '../services/email.js'

const PACKAGE_LABELS = {
  black: 'Черный ключ',
  gray: 'Серый ключ',
  white: 'Белый ключ',
}

const PACKAGE_RATES = {
  black: 60000,
  gray: 80000,
  white: 100000,
}

const DEDUP_WINDOW_MS = 30 * 60 * 1000
const FAST_SUBMIT_MS = 4000
const MAX_OPEN_WINDOW_MS = 2 * 60 * 60 * 1000
const ALLOWED_FUTURE_SKEW_MS = 2 * 60 * 1000

const createPhoneLogHash = (phone, salt) => {
  const normalized = normalizeText(phone, 40)
  return normalized ? hashValue(normalized, salt) : null
}

export const createEstimateRuntime = (config) => ({
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
    windowMs: DEDUP_WINDOW_MS,
    maxKeys: config.inMemoryDedupMaxKeys,
  }),
})

const validateTimestamps = ({ openedAt, submittedAt, now }) => {
  const openedAtNum = Number(openedAt)
  const submittedAtNum = Number(submittedAt)

  if (!Number.isFinite(openedAtNum) || !Number.isFinite(submittedAtNum)) {
    return { valid: false, reason: 'invalid_timestamp_type' }
  }

  if (openedAtNum <= 0 || submittedAtNum <= 0) {
    return { valid: false, reason: 'invalid_timestamp_value' }
  }

  if (openedAtNum > now + ALLOWED_FUTURE_SKEW_MS) {
    return { valid: false, reason: 'opened_at_in_future' }
  }

  if (submittedAtNum > now + ALLOWED_FUTURE_SKEW_MS) {
    return { valid: false, reason: 'submitted_at_in_future' }
  }

  const submitDelta = submittedAtNum - openedAtNum
  if (submitDelta < 0) {
    return { valid: false, reason: 'submitted_before_opened' }
  }

  return { valid: true, submitDelta }
}

export const registerEstimateRoute = (
  server,
  config,
  runtime = createEstimateRuntime(config),
) => {
  server.post('/api/estimate', async (request, reply) => {
    const parsed = estimatePayloadSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid payload' })
      return
    }

    const body = parsed.data
    runtime.metrics.total += 1
    const now = Date.now()
    const ip = request.ip
    const userAgent = request.headers['user-agent']
    const rawPhoneHash = createPhoneLogHash(body.phone, config.logHashSalt)

    const normalizedPhone = normalizePhone(body.phone)
    const phoneHash = createPhoneLogHash(normalizedPhone, config.logHashSalt) || rawPhoneHash
    if (!normalizedPhone) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'estimate_blocked',
        reason: 'invalid_phone',
        ip,
        phoneHash: rawPhoneHash,
        userAgent,
      })
      reply.code(400).send({ error: 'Invalid phone' })
      return
    }

    const areaRounded = Math.round(Number(body.area))
    const floorsValue = Number(body.floors)
    const packageLabel = PACKAGE_LABELS[body.packageType]
    const estimateValue = areaRounded * PACKAGE_RATES[body.packageType]
    const formattedEstimate = formatRubles(estimateValue)
    const responsePayload = { ok: true, estimate: estimateValue, formattedEstimate }

    if (body.website) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'estimate_dropped',
        reason: 'honeypot',
        ip,
        phoneHash,
        userAgent,
      })
      reply.code(200).send(responsePayload)
      return
    }

    if (config.captchaEnabled && !body.captchaToken) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'estimate_blocked',
        reason: 'captcha_required',
        ip,
        phoneHash,
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
        token: body.captchaToken,
        ip,
        timeoutMs: config.telegramTimeoutMs,
      })

      if (!captchaResult.ok) {
        runtime.metrics.blocked += 1
        server.log.info({
          event: 'estimate_blocked',
          reason: captchaResult.misconfigured ? 'captcha_misconfigured' : 'captcha_failed',
          ip,
          phoneHash,
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

    const timestampValidation = validateTimestamps({
      openedAt: body.openedAt,
      submittedAt: body.submittedAt,
      now,
    })
    if (!timestampValidation.valid) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'estimate_blocked',
        reason: timestampValidation.reason,
        ip,
        phoneHash,
        userAgent,
      })
      reply.code(400).send({ error: 'Invalid timing fields' })
      return
    }

    const ipCheck = runtime.ipLimiter.check(ip, now)
    if (!ipCheck.allowed) {
      runtime.metrics.blocked += 1
      server.log.info({
        event: 'estimate_blocked',
        reason: 'ip_rate_limit',
        ip,
        phoneHash,
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
        event: 'estimate_blocked',
        reason: 'phone_rate_limit',
        ip,
        phoneHash,
        userAgent,
        details: { windowMs: phoneCheck.limit.windowMs, max: phoneCheck.limit.max },
      })
      reply.code(429).send({ error: 'Too many requests' })
      return
    }

    const dedupKey = hashValue(
      `${normalizedPhone}|${body.packageType}|${areaRounded}|${floorsValue}|${
        body.action || 'cost_estimate'
      }`,
      config.logHashSalt,
    )
    if (runtime.dedupStore.check(dedupKey, now)) {
      runtime.metrics.dedup += 1
      server.log.info({ event: 'estimate_dedup', reason: 'duplicate', ip, phoneHash, userAgent })
      reply.code(200).send(responsePayload)
      return
    }

    const quarantineReasons = []
    const addQuarantineReason = (reason) => {
      if (reason && !quarantineReasons.includes(reason)) {
        quarantineReasons.push(reason)
      }
    }

    if (timestampValidation.submitDelta < FAST_SUBMIT_MS) {
      addQuarantineReason('fast_submit')
    }

    if (timestampValidation.submitDelta > MAX_OPEN_WINDOW_MS) {
      addQuarantineReason('stale_form')
    }

    if (body.clientSuspected) {
      addQuarantineReason(body.clientSuspectedReason || 'client_suspected')
    }

    if (quarantineReasons.length === 0) {
      const globalCheck = runtime.globalLimiter.check('global', now)
      if (!globalCheck.allowed) {
        quarantineReasons.push('global_send_limit')
      }
    }

    const email = buildEstimateEmail({
      timestamp: formatKaliningradTimestamp(new Date(now)),
      floors: floorsValue,
      area: areaRounded,
      packageLabel,
      name: body.name,
      phone: normalizedPhone,
      estimate: formattedEstimate,
      quarantineReasons,
      attribution: body,
    })

    try {
      const sendResult = await sendEstimateEmail({
        config,
        email,
        transport: config.mailTransport,
      })

      if (!sendResult.ok) {
        server.log.info({
          event: 'estimate_skipped',
          reason: 'missing_mail_config',
          ip,
          phoneHash,
          userAgent,
        })
        reply.code(502).send({ error: 'Failed to deliver message' })
        return
      }
    } catch (error) {
      server.log.error(
        {
          event: 'estimate_email_failed',
          error: error?.message,
          ip,
          phoneHash,
          userAgent,
        },
        'Estimate email delivery failed',
      )
      reply.code(502).send({ error: 'Failed to deliver message' })
      return
    }

    if (quarantineReasons.length > 0) {
      runtime.metrics.quarantine += 1
      server.log.info({
        event: 'estimate_quarantine',
        reason: quarantineReasons.join(','),
        ip,
        phoneHash,
        userAgent,
      })
    } else {
      runtime.metrics.sent += 1
      server.log.info({ event: 'estimate_sent', reason: 'ok', ip, phoneHash, userAgent })
    }

    reply.code(200).send(responsePayload)
  })

  return runtime
}
