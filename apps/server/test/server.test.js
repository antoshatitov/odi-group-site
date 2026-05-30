import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createApp } from '../src/app.js'
import { createDedupStore } from '../src/services/rate-limit.js'
import { verifyCaptchaToken } from '../src/services/captcha.js'
import { sendTelegramMessageWithRetry } from '../src/services/telegram.js'

const createTestConfig = (overrides = {}) => ({
  startedAt: 1_700_000_000_000,
  trustProxy: false,
  nodeEnv: 'test',
  isProduction: false,
  allowedOrigins: [],
  telegramBotToken: 'bot-main',
  telegramChatId: 'chat-main',
  calcBotToken: 'bot-calc',
  calcChatId: 'chat-calc',
  quarantineChatId: 'chat-quarantine',
  logHashSalt: 'test-salt',
  captchaEnabled: false,
  captchaSecretKey: '',
  captchaVerifyUrl: 'https://captcha.example/verify',
  captchaExpectedHostname: 'example.com',
  telegramTimeoutMs: 20,
  telegramRetryAttempts: 1,
  telegramRetryBaseMs: 1,
  inMemoryLimiterMaxKeys: 100,
  inMemoryDedupMaxKeys: 100,
  port: 8080,
  ...overrides,
})

const installFetchMock = (impl) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = impl
  return () => {
    globalThis.fetch = originalFetch
  }
}

describe('server modules', () => {
  it('retries telegram sends on transient failures', async () => {
    let attempts = 0
    const restore = installFetchMock(async () => {
      attempts += 1
      if (attempts === 1) {
        return new Response('temporary', { status: 500 })
      }
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    try {
      const result = await sendTelegramMessageWithRetry({
        botToken: 'bot',
        chatId: 'chat',
        text: 'hello',
        logContext: 'test',
        timeoutMs: 20,
        retryAttempts: 1,
        retryBaseMs: 1,
      })

      assert.equal(result.ok, true)
      assert.equal(attempts, 2)
    } finally {
      restore()
    }
  })

  it('verifies captcha tokens with the expected payload', async () => {
    const calls = []
    const restore = installFetchMock(async (url, options) => {
      calls.push({
        url,
        body: options.body,
      })

      return new Response(JSON.stringify({ success: true, hostname: 'example.com' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    try {
      const result = await verifyCaptchaToken({
        enabled: true,
        secretKey: 'secret',
        verifyUrl: 'https://captcha.example/verify',
        expectedHostname: 'example.com',
        token: 'token-123',
        ip: '127.0.0.1',
        timeoutMs: 20,
      })

      assert.equal(result.ok, true)
      assert.equal(calls.length, 1)
      assert.equal(calls[0].url, 'https://captcha.example/verify')
      assert.match(String(calls[0].body), /secret=secret/)
      assert.match(String(calls[0].body), /response=token-123/)
      assert.match(String(calls[0].body), /remoteip=127\.0\.0\.1/)
    } finally {
      restore()
    }
  })

  it('keeps /api/health safe by default', async () => {
    const app = await createApp(createTestConfig())

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      })

      assert.equal(response.statusCode, 200)
      const payload = response.json()
      assert.equal(payload.ok, true)
      assert.equal(typeof payload.uptimeSec, 'number')
      assert.deepEqual(payload.calcMetrics, {
        total: 0,
        sent: 0,
        quarantine: 0,
        blocked: 0,
        dedup: 0,
      })
      assert.equal(Object.hasOwn(payload, 'memory'), false)
    } finally {
      await app.close()
    }
  })

  it('deduplicates repeated calc payloads inside the active window', () => {
    const store = createDedupStore({ windowMs: 1_000, maxKeys: 10 })
    const now = Date.now()

    assert.equal(store.check('calc:1', now), false)
    assert.equal(store.check('calc:1', now + 100), true)
    assert.equal(store.check('calc:1', now + 1_100), false)
  })

  it('sends consultation leads through the calculator Telegram channel', async () => {
    const requests = []
    const restore = installFetchMock(async (url, options) => {
      requests.push({
        url,
        body: JSON.parse(options.body),
      })

      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    const app = await createApp(createTestConfig())

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/lead',
        payload: {
          name: 'Тестовый Пользователь',
          phone: '+7 924 442-28-00',
          message: 'Нужна консультация',
          source: 'consultation',
          consent: true,
          source_context: 'test',
          landing_page: '/?test=1',
        },
      })

      assert.equal(response.statusCode, 200)
      assert.equal(response.json().ok, true)
      assert.equal(requests.length, 1)
      assert.match(requests[0].url, /api\.telegram\.org\/botbot-calc\/sendMessage/)
      assert.equal(requests[0].body.chat_id, 'chat-calc')
      assert.match(requests[0].body.text, /Запрос консультации/)
      assert.match(requests[0].body.text, /Нужна консультация/)
    } finally {
      await app.close()
      restore()
    }
  })

  it('processes calculator requests and reports metrics', async () => {
    const requests = []
    const restore = installFetchMock(async (url, options) => {
      requests.push({
        url,
        body: JSON.parse(options.body),
      })

      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    const app = await createApp(createTestConfig())
    const openedAt = Date.now() - 10_000
    const submittedAt = Date.now()
    const requestPayload = {
      floors: 1,
      area: 120,
      packageType: 'gray',
      name: 'Тестовый Пользователь',
      phone: '+7 924 442-28-00',
      consent: true,
      website: '',
      openedAt,
      submittedAt,
      action: 'cost_estimate',
      source_context: 'test',
      landing_page: '/?calc=1',
    }

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/cost-estimate',
        payload: requestPayload,
      })

      assert.equal(response.statusCode, 200)
      const responsePayload = response.json()
      assert.equal(responsePayload.ok, true)
      assert.equal(responsePayload.estimate, 9600000)
      assert.equal(responsePayload.formattedEstimate, '9 600 000 ₽')
      assert.equal(requests.length, 1)
      assert.equal(requests[0].body.chat_id, 'chat-calc')

      const health = await app.inject({
        method: 'GET',
        url: '/api/health',
      })
      assert.equal(health.statusCode, 200)
      assert.equal(health.json().calcMetrics.total, 1)
      assert.equal(health.json().calcMetrics.sent, 1)
      assert.equal(health.json().calcMetrics.dedup, 0)
    } finally {
      await app.close()
      restore()
    }
  })

  it('rejects calculator requests with invalid timing fields before sending', async () => {
    const requests = []
    const restore = installFetchMock(async (url, options) => {
      requests.push({
        url,
        body: JSON.parse(options.body),
      })

      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    const app = await createApp(createTestConfig())

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/cost-estimate',
        payload: {
          floors: 1,
          area: 120,
          packageType: 'gray',
          name: 'Тестовый Пользователь',
          phone: '+7 924 442-28-01',
          consent: true,
          website: '',
          openedAt: Date.now(),
          submittedAt: Date.now() - 10_000,
          action: 'cost_estimate',
        },
      })

      assert.equal(response.statusCode, 400)
      assert.deepEqual(response.json(), { error: 'Invalid timing fields' })
      assert.equal(requests.length, 0)

      const health = await app.inject({
        method: 'GET',
        url: '/api/health',
      })
      assert.equal(health.json().calcMetrics.blocked, 1)
      assert.equal(health.json().calcMetrics.dedup, 0)
    } finally {
      await app.close()
      restore()
    }
  })
})
