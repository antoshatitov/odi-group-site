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

const buildArgs = ['run', 'build']
const previewArgs = ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(localPort)]
const requiredGoals = [
  'hero_cta_telegram_click',
  'hero_cta_call_click',
  'header_phone_click',
  'header_callback_click',
  'mobile_menu_call_click',
  'mobile_menu_telegram_click',
  'mobile_menu_whatsapp_click',
  'mobile_menu_max_click',
  'mobile_menu_vk_click',
  'contacts_phone_click',
  'contacts_telegram_click',
  'footer_phone_click',
  'lead_form_success',
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

const runBuild = async () => {
  const logs = createOutputCollector()
  const buildProcess = spawn('npm', buildArgs, {
    cwd: webRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      VITE_YM_COUNTER_ID: process.env.VITE_YM_COUNTER_ID || '1',
    },
  })

  buildProcess.stdout?.on('data', logs.append)
  buildProcess.stderr?.on('data', logs.append)

  const [exitCode] = await once(buildProcess, 'exit')
  if (exitCode !== 0) {
    throw new Error(`Build failed with code ${exitCode}.\nRecent logs:\n${logs.read()}`)
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
          if (
            href.startsWith('tel:') ||
            href.includes('t.me/') ||
            href.includes('wa.me/') ||
            href.includes('max.ru/') ||
            href.includes('vk.com/')
          ) {
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

    await page.locator('.hero button', { hasText: 'Написать' }).first().click()
    await page.locator('.hero a[href^="https://t.me/"]').first().click()
    await waitForGoalCount(page, 'hero_cta_telegram_click')

    await page.locator('.hero a[href^="tel:"]').first().click()
    await waitForGoalCount(page, 'hero_cta_call_click')

    await page.locator('a.header-phone').click()
    await waitForGoalCount(page, 'header_phone_click')

    await page.getByRole('button', { name: 'Заказать звонок' }).click()
    await waitForGoalCount(page, 'header_callback_click')

    const callbackDialog = page.getByRole('dialog', { name: 'Заказать звонок' })
    await callbackDialog.getByLabel('Имя').fill('Тестовый Пользователь')
    await callbackDialog.getByLabel('Телефон').fill('+7 924 442-28-00')
    await callbackDialog.getByRole('checkbox').check()
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/lead') && response.status() === 200),
      callbackDialog.getByRole('button', { name: 'Заказать звонок' }).click(),
    ])
    await waitForGoalCount(page, 'lead_form_success')
    await callbackDialog.getByRole('button', { name: 'Закрыть модальное окно' }).click()
    await callbackDialog.waitFor({ state: 'hidden' })

    await page.locator('#contacts').scrollIntoViewIfNeeded()
    await page.locator('#contacts a[href^="tel:"]').first().click()
    await waitForGoalCount(page, 'contacts_phone_click')

    await page.locator('#contacts a[href^="https://t.me/"]').first().click()
    await waitForGoalCount(page, 'contacts_telegram_click')

    const heroCalculatorButtonCount = await page
      .locator('.hero button:has-text("Расчет стоимости")')
      .count()
    assert(
      heroCalculatorButtonCount === 0,
      `Hero calculator CTA must stay hidden while calculator access is paused, got ${heroCalculatorButtonCount}`,
    )

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Меню' }).waitFor()

    await page.getByRole('button', { name: 'Меню' }).click()
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'visible' })
    await page.locator('.mobile-nav-actions a[href^="tel:"]').click()
    await waitForGoalCount(page, 'mobile_menu_call_click')
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Меню' }).click()
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'visible' })
    await page.locator('.mobile-nav-actions a[href^="https://t.me/"]').click()
    await waitForGoalCount(page, 'mobile_menu_telegram_click')
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Меню' }).click()
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'visible' })
    await page.locator('.mobile-nav-actions a[href*="wa.me/"]').click()
    await waitForGoalCount(page, 'mobile_menu_whatsapp_click')
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Меню' }).click()
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'visible' })
    await page.locator('.mobile-nav-actions a[href*="max.ru/"]').click()
    await waitForGoalCount(page, 'mobile_menu_max_click')
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Меню' }).click()
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'visible' })
    await page.locator('.mobile-nav-actions a[href*="vk.com/"]').click()
    await waitForGoalCount(page, 'mobile_menu_vk_click')
    await page.getByRole('dialog', { name: 'Мобильное меню' }).waitFor({ state: 'hidden' })

    await page.locator('.site-footer').scrollIntoViewIfNeeded()
    await page.locator('.site-footer a[href^="tel:"]').click()
    await waitForGoalCount(page, 'footer_phone_click')

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
    assert(requests.lead[0].source === 'callback', `Expected callback lead source, got ${requests.lead[0].source}`)
    assert(
      requests.costEstimate.length === 0,
      `Expected no /api/cost-estimate calls while calculator access is hidden, got ${requests.costEstimate.length}`,
    )

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
      await runBuild()
      serverProcess = spawn('npm', previewArgs, {
        cwd: webRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          VITE_YM_COUNTER_ID: process.env.VITE_YM_COUNTER_ID || '1',
        },
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
