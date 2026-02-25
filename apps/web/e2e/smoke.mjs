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

    for (const selector of ['#about', '#services', '#gallery', '#contacts']) {
      const section = await desktopPage.$(selector)
      if (!section) {
        throw new Error(`Missing required section: ${selector}`)
      }
    }

    await desktopPage.getByRole('button', { name: 'Расчет стоимости' }).first().click()
    const calculatorModal = desktopPage.getByRole('dialog', {
      name: 'Расчет стоимости строительства',
    })
    await calculatorModal.waitFor({ state: 'visible' })
    await desktopPage.keyboard.press('Escape')
    await calculatorModal.waitFor({ state: 'hidden' })

    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
    })

    await mobilePage.goto(url, { waitUntil: 'domcontentloaded' })
    await mobilePage.getByRole('button', { name: 'Меню' }).click()
    const mobileMenu = mobilePage.getByRole('dialog', { name: 'Мобильное меню' })
    await mobileMenu.waitFor({ state: 'visible' })
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
