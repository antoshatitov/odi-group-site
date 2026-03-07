import { once } from 'node:events'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDir, '..')

const localPort = Number(process.env.E2E_PORT || 4173)
const localBaseUrl = `http://127.0.0.1:${localPort}`
const baseUrl = process.env.E2E_BASE_URL || localBaseUrl
const headless = process.env.PW_HEADLESS !== 'false'

const previewArgs = ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(localPort)]
const requiredGoals = [
  'hero_cta_telegram_click',
  'hero_cta_call_click',
  'header_phone_click',
  'contacts_telegram_click',
  'lead_form_success',
  'calculator_success',
]
const requiredGoalPayloadKeys = [
  'page_path',
  'cta_location',
  'source_context',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'referrer_domain',
]
const requiredRequestAttributionKeys = [
  'source_context',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'referrer_domain',
  'landing_page',
]
const forbiddenAnalyticsKeys = ['name', 'phone', 'message']

const createOutputCollector = () => {
  const chunks = []

  const append = (chunk) => {
    const text = String(chunk)
    chunks.push(text)
    if (chunks.length > 80) {
      chunks.shift()
    }

    if (process.env.DEBUG_E2E === 'true') {
      process.stdout.write(text)
    }
  }

  const read = () => chunks.join('')

  return { append, read }
}

const waitForServer = async ({ url, serverProcess, logs, timeoutMs = 30_000 }) => {
  const startedAt = Date.now()
  let lastError = null

  while (Date.now() - startedAt < timeoutMs) {
    if (serverProcess && serverProcess.exitCode !== null) {
      throw new Error(
        `Preview server exited with code ${serverProcess.exitCode}.\nRecent logs:\n${logs.read()}`,
      )
    }

    try {
      const response = await fetch(url, { method: 'GET' })
      if (response.ok || response.status === 404) {
        return
      }
    } catch (error) {
      lastError = error
    }

    await delay(400)
  }

  throw new Error(
    `Timed out waiting for ${url}. Last error: ${lastError?.message || 'none'}\nRecent logs:\n${logs.read()}`,
  )
}

const stopServer = async (serverProcess) => {
  if (!serverProcess || serverProcess.exitCode !== null) return

  const waitForExit = once(serverProcess, 'exit')
  serverProcess.kill('SIGTERM')

  const gracefulExit = await Promise.race([
    waitForExit.then(() => true),
    delay(5_000).then(() => false),
  ])
  if (gracefulExit) return

  if (serverProcess.exitCode === null) {
    serverProcess.kill('SIGKILL')
  }

  const forcedExit = await Promise.race([waitForExit.then(() => true), delay(5_000).then(() => false)])
  if (!forcedExit) {
    throw new Error('Failed to stop preview server process')
  }
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

const collectGoalEvents = async (page) => {
  return page.evaluate(() => {
    const calls = Array.isArray(window.__odiYmCalls) ? window.__odiYmCalls : []
    return calls
      .filter((entry) => Array.isArray(entry) && entry[1] === 'reachGoal')
      .map((entry) => {
        const payload = entry[3]
        return {
          goalName: String(entry[2]),
          payload: payload && typeof payload === 'object' ? payload : {},
        }
      })
  })
}

const waitForGoalCount = async (page, goalName, expectedCount = 1, timeoutMs = 8_000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const goalEvents = await collectGoalEvents(page)
    const currentCount = goalEvents.filter((event) => event.goalName === goalName).length
    if (currentCount >= expectedCount) {
      return
    }
    await delay(100)
  }
  throw new Error(`Goal "${goalName}" was not captured in time`)
}

const assertAttributionPayload = (payload, contextLabel) => {
  assert(isObject(payload), `${contextLabel}: payload is not an object`)
  for (const key of requiredGoalPayloadKeys) {
    assert(isNonEmptyString(payload[key]), `${contextLabel}: missing required key "${key}"`)
  }
}

const assertNoForbiddenKeys = (payload, contextLabel) => {
  for (const key of forbiddenAnalyticsKeys) {
    assert(!(key in payload), `${contextLabel}: forbidden key "${key}" found in analytics payload`)
  }
}

const assertRequestPayload = (payload, contextLabel) => {
  assert(isObject(payload), `${contextLabel}: request payload is not an object`)
  for (const key of requiredRequestAttributionKeys) {
    assert(isNonEmptyString(payload[key]), `${contextLabel}: missing request key "${key}"`)
  }
}

const buildLandingUrl = (url) => {
  const target = new URL(url)
  target.searchParams.set('utm_source', 'yandex_search')
  target.searchParams.set('utm_medium', 'organic')
  target.searchParams.set('utm_campaign', 'brand_profile')
  target.searchParams.set('utm_content', 'hero_cta')
  target.searchParams.set('utm_term', 'kaliningrad_house')
  return target.toString()
}

const runAnalyticsChecks = async (url) => {
  const browser = await chromium.launch({ headless })

  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    })
    const requests = { lead: [], costEstimate: [] }

    await context.route('https://mc.yandex.ru/**', (route) => route.abort())
    await context.route('**/api/lead', async (route) => {
      const body = route.request().postDataJSON()
      requests.lead.push(isObject(body) ? body : {})
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })
    await context.route('**/api/cost-estimate', async (route) => {
      const body = route.request().postDataJSON()
      requests.costEstimate.push(isObject(body) ? body : {})
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, estimate: 9600000, formattedEstimate: '9 600 000 ₽' }),
      })
    })

    const page = await context.newPage()
    await page.addInitScript(() => {
      const goalCalls = []
      window.__odiYmCalls = goalCalls
      window.ym = (...args) => {
        goalCalls.push(args)
      }
      window.open = () => null

      document.addEventListener(
        'click',
        (event) => {
          const target = event.target instanceof Element ? event.target.closest('a[href]') : null
          if (!target) return

          const href = target.getAttribute('href') || ''
          if (href.startsWith('tel:') || href.includes('t.me/')) {
            event.preventDefault()
          }
        },
        true,
      )
    })

    await page.goto(buildLandingUrl(url), {
      waitUntil: 'domcontentloaded',
      referer: 'https://yandex.ru/search/?text=stroitelstvo-domov-kaliningrad',
    })
    await page.waitForSelector('#main-content')

    await page.locator('.hero a[href^="https://t.me/"]').first().click()
    await waitForGoalCount(page, 'hero_cta_telegram_click')

    await page.locator('.hero a[href^="tel:"]').first().click()
    await waitForGoalCount(page, 'hero_cta_call_click')

    await page.locator('a.header-phone').click()
    await waitForGoalCount(page, 'header_phone_click')

    await page.locator('#contacts').scrollIntoViewIfNeeded()
    await page.locator('#contacts a[href^="https://t.me/"]').first().click()
    await waitForGoalCount(page, 'contacts_telegram_click')

    const leadForm = page.locator('#consultation form').first()
    await leadForm.getByLabel('Имя').fill('Тестовый Пользователь')
    await leadForm.getByLabel('Телефон').fill('+7 924 442-28-00')
    await leadForm.getByLabel('Комментарий').fill('Тестовая заявка для e2e аналитики')
    await leadForm.getByRole('checkbox').check()
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/lead') && response.status() === 200),
      leadForm.getByRole('button', { name: 'Отправить заявку' }).click(),
    ])
    await waitForGoalCount(page, 'lead_form_success')

    await page.locator('.hero button:has-text("Расчет стоимости")').first().click()
    const calculatorDialog = page.getByRole('dialog', { name: 'Расчет стоимости строительства' })
    await calculatorDialog.waitFor({ state: 'visible' })

    const calculatorForm = calculatorDialog.locator('form').first()
    await calculatorForm.getByLabel('Количество этажей').selectOption('1')
    await calculatorForm.getByLabel('Площадь дома').fill('120')
    await calculatorForm.getByRole('radio', { name: 'Черный ключ' }).check()
    await calculatorForm.getByLabel('Имя и фамилия').fill('Тестовый Пользователь')
    await calculatorForm.getByLabel('Телефон').fill('+7 924 442-28-00')
    await calculatorForm.getByRole('checkbox').check()
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/cost-estimate') && response.status() === 200,
      ),
      calculatorForm.getByRole('button', { name: 'Расчет стоимости' }).click(),
    ])
    await waitForGoalCount(page, 'calculator_success')

    const goalEvents = await collectGoalEvents(page)
    assert(goalEvents.length > 0, 'No Yandex Metrika goals were captured. Set VITE_YM_COUNTER_ID before build.')

    for (const goalName of requiredGoals) {
      const events = goalEvents.filter((event) => event.goalName === goalName)
      assert(events.length === 1, `Goal "${goalName}" must fire exactly once, got ${events.length}`)
      assertAttributionPayload(events[0].payload, `Goal "${goalName}"`)
      assertNoForbiddenKeys(events[0].payload, `Goal "${goalName}"`)
    }

    assert(requests.lead.length === 1, `Expected 1 /api/lead call, got ${requests.lead.length}`)
    assertRequestPayload(requests.lead[0], '/api/lead')
    assert(
      requests.costEstimate.length === 1,
      `Expected 1 /api/cost-estimate call, got ${requests.costEstimate.length}`,
    )
    assertRequestPayload(requests.costEstimate[0], '/api/cost-estimate')

    await context.close()
  } finally {
    await browser.close()
  }
}

const main = async () => {
  let serverProcess = null
  let logs = createOutputCollector()

  try {
    if (!process.env.E2E_BASE_URL) {
      serverProcess = spawn('npm', previewArgs, {
        cwd: webRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      })

      serverProcess.stdout?.on('data', logs.append)
      serverProcess.stderr?.on('data', logs.append)
      await waitForServer({ url: localBaseUrl, serverProcess, logs })
    }

    await runAnalyticsChecks(baseUrl)
    console.log('Playwright analytics e2e: OK')
  } finally {
    await stopServer(serverProcess)
  }
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exitCode = 1
})
