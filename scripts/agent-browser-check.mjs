import { agentBrowserSession, assertSucceeded, runAgentBrowser } from './agent-browser-utils.mjs'

const main = async () => {
  const helpResult = await runAgentBrowser(['--help'])
  assertSucceeded(helpResult, 'agent-browser --help')

  const requiredTokens = ['open', 'snapshot', 'close']
  for (const token of requiredTokens) {
    if (!helpResult.output.includes(token)) {
      throw new Error(`agent-browser help output is missing "${token}"`)
    }
  }

  const openResult = await runAgentBrowser(['--session', agentBrowserSession, 'open', 'about:blank'])
  if (openResult.exitCode !== 0) {
    if (openResult.output.includes('Chrome not found')) {
      throw new Error(
        'agent-browser browser runtime is missing. Run `npx agent-browser install` and retry.\n' +
          openResult.output,
      )
    }

    throw new Error(
      `agent-browser browser launch check failed with code ${openResult.exitCode}.\n` +
        `Recent logs:\n${openResult.output}`,
    )
  }

  const titleResult = await runAgentBrowser(['--session', agentBrowserSession, 'get', 'title'])
  assertSucceeded(titleResult, 'agent-browser get title')

  const closeResult = await runAgentBrowser(['--session', agentBrowserSession, 'close'])
  assertSucceeded(closeResult, 'agent-browser close')

  console.log('agent-browser check: OK')
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exitCode = 1
})
