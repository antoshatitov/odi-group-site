import process from 'node:process'

import {
  agentBrowserSession,
  assertSucceeded,
  repoRoot,
  runAgentBrowser,
  runCommand,
  spawnTracked,
  stopProcess,
  waitForServer,
} from './agent-browser-utils.mjs'

const localPort = Number(process.env.AGENT_BROWSER_PORT || 4173)
const localBaseUrl = `http://127.0.0.1:${localPort}`

const assertIncludes = (output, token, context) => {
  if (!output.includes(token)) {
    throw new Error(`${context}: missing "${token}"`)
  }
}

const parseCount = (output, context) => {
  const match = output.trim().match(/(\d+)\s*$/)
  if (!match) {
    throw new Error(`${context}: could not parse count from output\n${output}`)
  }

  return Number(match[1])
}

const runBrowser = async (args, context) => {
  const result = await runAgentBrowser(['--session', agentBrowserSession, ...args])
  assertSucceeded(result, context)
  return result.output.trim()
}

const startPreview = async () => {
  const buildResult = await runCommand('npm', ['run', 'build:web'], { cwd: repoRoot })
  assertSucceeded(buildResult, 'npm run build:web')

  const { child: serverProcess, logs } = spawnTracked(
    'npm',
    [
      '--workspace',
      'apps/web',
      'run',
      'preview',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(localPort),
    ],
    { cwd: repoRoot },
  )

  await waitForServer({ url: localBaseUrl, serverProcess, logs })
  return { serverProcess, logs }
}

const main = async () => {
  let serverProcess = null

  try {
    const preview = await startPreview()
    serverProcess = preview.serverProcess

    await runBrowser(['open', localBaseUrl], 'agent-browser open')
    await runBrowser(['wait', '--load', 'networkidle'], 'agent-browser wait')

    const title = await runBrowser(['get', 'title'], 'agent-browser get title')
    assertIncludes(title, 'ОДИ', 'Page title')

    const desktopSnapshot = await runBrowser(['snapshot', '-i', '-c'], 'agent-browser snapshot')
    for (const token of ['О компании', 'Услуги', 'Контакты']) {
      assertIncludes(desktopSnapshot, token, 'Desktop snapshot')
    }

    await runBrowser(['set', 'viewport', '390', '844'], 'agent-browser set viewport')
    await runBrowser(
      ['find', 'role', 'button', 'click', '--name', 'Меню'],
      'agent-browser open menu',
    )

    const menuCount = parseCount(
      await runBrowser(
        ['get', 'count', '[role="dialog"][aria-label="Мобильное меню"]'],
        'agent-browser get count',
      ),
      'Mobile menu count',
    )
    if (menuCount !== 1) {
      throw new Error(`Mobile menu should be open, got count ${menuCount}`)
    }

    await runBrowser(['press', 'Escape'], 'agent-browser escape')

    const closedCount = parseCount(
      await runBrowser(
        ['get', 'count', '[role="dialog"][aria-label="Мобильное меню"]'],
        'agent-browser get count after escape',
      ),
      'Mobile menu count after escape',
    )
    if (closedCount !== 0) {
      throw new Error(`Mobile menu should be closed, got count ${closedCount}`)
    }

    console.log('agent-browser smoke: OK')
  } finally {
    try {
      await runBrowser(['close'], 'agent-browser close cleanup')
    } catch {
      // Best effort cleanup.
    }

    await stopProcess(serverProcess)
  }
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exitCode = 1
})
