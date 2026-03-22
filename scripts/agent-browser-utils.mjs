import { once } from 'node:events'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

export const repoRoot = path.resolve(scriptDir, '..')
export const webRoot = path.join(repoRoot, 'apps/web')
export const agentBrowserSession = process.env.AGENT_BROWSER_SESSION || 'odi-group-smoke'

export const getAgentBrowserEnv = (env = {}) => ({
  AGENT_BROWSER_IDLE_TIMEOUT_MS: process.env.AGENT_BROWSER_IDLE_TIMEOUT_MS || '10000',
  ...env,
})

export const createOutputCollector = () => {
  const chunks = []

  const append = (chunk) => {
    const text = String(chunk)
    chunks.push(text)
    if (chunks.length > 120) {
      chunks.shift()
    }

    if (process.env.DEBUG_AGENT_BROWSER === 'true') {
      process.stdout.write(text)
    }
  }

  return {
    append,
    read: () => chunks.join(''),
  }
}

export const spawnTracked = (command, args, options = {}) => {
  const logs = createOutputCollector()
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', logs.append)
  child.stderr?.on('data', logs.append)

  return { child, logs }
}

export const waitForProcessExit = async (child) => {
  const [exitCode, signal] = await once(child, 'exit')
  return { exitCode, signal }
}

export const waitForServer = async ({ url, serverProcess, logs, timeoutMs = 30_000 }) => {
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
    `Timed out waiting for ${url}. Last error: ${lastError?.message || 'none'}` +
      `\nRecent logs:\n${logs.read()}`,
  )
}

export const stopProcess = async (child) => {
  if (!child || child.exitCode !== null) return

  const waitForExit = once(child, 'exit')
  child.kill('SIGTERM')

  const gracefulExit = await Promise.race([
    waitForExit.then(() => true),
    delay(5_000).then(() => false),
  ])
  if (gracefulExit) return

  if (child.exitCode === null) {
    child.kill('SIGKILL')
  }

  const forcedExit = await Promise.race([
    waitForExit.then(() => true),
    delay(5_000).then(() => false),
  ])
  if (!forcedExit) {
    throw new Error('Failed to stop process')
  }
}

export const runCommand = async (command, args, options = {}) => {
  const { child, logs } = spawnTracked(command, args, options)

  const outcome = await Promise.race([
    waitForProcessExit(child).then(({ exitCode }) => ({ exitCode, error: null })),
    once(child, 'error').then(([error]) => ({ exitCode: 1, error })),
  ])

  return {
    exitCode: outcome.exitCode,
    output: outcome.error ? `${logs.read()}${outcome.error.message}\n` : logs.read(),
  }
}

export const assertSucceeded = (result, label) => {
  if (result.exitCode !== 0) {
    throw new Error(`${label} failed with code ${result.exitCode}.\nRecent logs:\n${result.output}`)
  }
}

export const runAgentBrowser = async (args, options = {}) => {
  return runCommand('agent-browser', args, {
    cwd: repoRoot,
    env: getAgentBrowserEnv(options.env),
  })
}
