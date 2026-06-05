import assert from 'node:assert/strict'
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

  const gracefulExit = await Promise.race([waitForExit.then(() => true), delay(5_000).then(() => false)])
  if (gracefulExit) return

  if (serverProcess.exitCode === null) {
    serverProcess.kill('SIGKILL')
  }

  const forcedExit = await Promise.race([waitForExit.then(() => true), delay(5_000).then(() => false)])
  if (!forcedExit) {
    throw new Error('Failed to stop preview server process')
  }
}

const runSmokeChecks = async (url) => {
  const browser = await chromium.launch({ headless })

  try {
    const desktopPage = await browser.newPage({
      viewport: { width: 1366, height: 900 },
    })

    await desktopPage.goto(url, { waitUntil: 'domcontentloaded' })
    await desktopPage.waitForSelector('#main-content')

    for (const selector of ['#gallery', '#projects', '#about', '#services', '#contacts']) {
      const section = await desktopPage.$(selector)
      if (!section) {
        throw new Error(`Missing required section: ${selector}`)
      }
    }

    const saleNavLinkCount = await desktopPage.getByRole('link', { name: 'Продажа' }).count()
    const saleSection = await desktopPage.$('#sale')
    if (saleNavLinkCount > 0 && !saleSection) {
      throw new Error('Missing required section: #sale')
    }
    if (saleNavLinkCount === 0 && saleSection) {
      throw new Error('Sale section must stay hidden when sale navigation is hidden')
    }

    assert.equal(
      await desktopPage.getByRole('button', { name: 'Расчет стоимости' }).count(),
      0,
      'Calculator CTA must stay hidden while calculator access is paused',
    )

    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
    })

    await mobilePage.goto(url, { waitUntil: 'domcontentloaded' })
    await mobilePage.getByRole('button', { name: 'Меню' }).click()
    const mobileMenu = mobilePage.getByRole('dialog', { name: 'Мобильное меню' })
    await mobileMenu.waitFor({ state: 'visible' })

    const mobileMenuState = await mobilePage.evaluate(() => {
      const panel = document.querySelector('.mobile-nav-panel')
      const header = document.querySelector('.mobile-nav-header')
      const firstLink = document.querySelector('.mobile-nav-links a')

      if (
        !(panel instanceof HTMLElement) ||
        !(header instanceof HTMLElement) ||
        !(firstLink instanceof HTMLElement)
      ) {
        return null
      }

      const headerRect = header.getBoundingClientRect()
      const firstLinkRect = firstLink.getBoundingClientRect()

      return {
        firstLinkText: firstLink.textContent?.trim() ?? '',
        firstLinkVisible:
          firstLinkRect.top >= 0 &&
          firstLinkRect.bottom <= window.innerHeight &&
          firstLinkRect.height > 0,
        headerVisible:
          headerRect.top >= 0 &&
          headerRect.bottom <= window.innerHeight &&
          headerRect.height > 0,
        panelScrollTop: panel.scrollTop,
      }
    })

    assert(mobileMenuState, 'Mobile menu structure is incomplete')
    assert.equal(mobileMenuState.panelScrollTop, 0, 'Mobile menu must open at scrollTop 0')
    assert.equal(
      mobileMenuState.firstLinkText,
      'Построено',
      'First mobile nav link must match the primary gallery section',
    )
    assert(mobileMenuState.headerVisible, 'Mobile menu header must be visible on open')
    assert(mobileMenuState.firstLinkVisible, 'First mobile nav link must be visible on open')

    await mobilePage.keyboard.press('Escape')
    await mobileMenu.waitFor({ state: 'hidden' })
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

    await runSmokeChecks(baseUrl)
    console.log('Playwright smoke: OK')
  } finally {
    await stopServer(serverProcess)
  }
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exitCode = 1
})
