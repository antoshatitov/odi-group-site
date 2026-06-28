const readEnv = (value) => {
  if (!value) return ''
  return value.trim()
}

export const isLocalDevOrigin = (origin) => {
  try {
    const parsed = new URL(origin)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '[::1]'
    )
  } catch {
    return false
  }
}

export const createCorsOriginChecker = ({ allowedOrigins = [], isProduction = false } = {}) => {
  return (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    if (!isProduction && allowedOrigins.length === 0 && isLocalDevOrigin(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Not allowed by CORS'), false)
  }
}

export const loadServerConfig = (env = process.env) => {
  const trustProxy = env.TRUST_PROXY === 'true'
  const nodeEnv = readEnv(env.NODE_ENV) || 'development'
  const isProduction = nodeEnv === 'production'
  const allowedOrigins = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (isProduction && allowedOrigins.length === 0) {
    const error = new Error('ALLOWED_ORIGINS must be configured in production')
    error.code = 'CONFIG_INVALID'
    throw error
  }

  return {
    startedAt: Date.now(),
    trustProxy,
    nodeEnv,
    isProduction,
    allowedOrigins,
    telegramBotToken: readEnv(env.TELEGRAM_BOT_TOKEN),
    telegramChatId: readEnv(env.TELEGRAM_CHAT_ID),
    calcBotToken: readEnv(env.TELEGRAM_CALC_BOT_TOKEN) || readEnv(env.TELEGRAM_BOT_TOKEN),
    calcChatId: readEnv(env.TELEGRAM_CALC_CHAT_ID) || readEnv(env.TELEGRAM_CHAT_ID),
    quarantineChatId:
      readEnv(env.TELEGRAM_QUARANTINE_CHAT_ID) ||
      readEnv(env.TELEGRAM_CALC_CHAT_ID) ||
      readEnv(env.TELEGRAM_CHAT_ID),
    logHashSalt: env.LOG_HASH_SALT || 'odi-calc',
    captchaEnabled: env.CAPTCHA_ENABLED === 'true',
    captchaSecretKey: readEnv(env.CAPTCHA_SECRET_KEY),
    captchaVerifyUrl:
      readEnv(env.CAPTCHA_VERIFY_URL) || 'https://www.google.com/recaptcha/api/siteverify',
    captchaExpectedHostname: readEnv(env.CAPTCHA_EXPECTED_HOSTNAME),
    telegramTimeoutMs: Number(env.TELEGRAM_TIMEOUT_MS || 5000),
    telegramRetryAttempts: Number(env.TELEGRAM_RETRY_ATTEMPTS || 2),
    telegramRetryBaseMs: Number(env.TELEGRAM_RETRY_BASE_MS || 400),
    smtpHost: readEnv(env.SMTP_HOST),
    smtpPort: Number(env.SMTP_PORT || 465),
    smtpSecure: env.SMTP_SECURE !== 'false',
    smtpUser: readEnv(env.SMTP_USER),
    smtpPass: readEnv(env.SMTP_PASS),
    mailFrom: readEnv(env.MAIL_FROM),
    estimateRecipients: (env.ESTIMATE_RECIPIENTS || 'titov.blg@yandex.ru')
      .split(',')
      .map((recipient) => recipient.trim())
      .filter(Boolean),
    inMemoryLimiterMaxKeys: Number(env.IN_MEMORY_LIMITER_MAX_KEYS || 5000),
    inMemoryDedupMaxKeys: Number(env.IN_MEMORY_DEDUP_MAX_KEYS || 3000),
    port: Number(env.PORT || 8080),
  }
}
