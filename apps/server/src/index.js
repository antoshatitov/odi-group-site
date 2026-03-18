import { createApp } from './app.js'
import { loadServerConfig } from './config.js'

const shutdown = async (server, signal) => {
  if (!server) return

  server.log.info({ signal }, 'Graceful shutdown started')
  try {
    await server.close()
    server.log.info({ signal }, 'Server closed gracefully')
    process.exit(0)
  } catch (error) {
    server.log.error({ signal, error: error?.message }, 'Graceful shutdown failed')
    process.exit(1)
  }
}

const main = async () => {
  let server

  try {
    const config = loadServerConfig()
    server = await createApp(config)

    process.on('SIGINT', () => {
      void shutdown(server, 'SIGINT')
    })

    process.on('SIGTERM', () => {
      void shutdown(server, 'SIGTERM')
    })

    await server.listen({ port: config.port, host: '0.0.0.0' })
    server.log.info({ port: config.port, trustProxy: config.trustProxy }, 'Lead API listening')
  } catch (error) {
    if (error?.code === 'CONFIG_INVALID' && Array.isArray(error.missingEnv)) {
      console.error({
        message: error.message,
        missingEnv: error.missingEnv,
      })
    } else {
      console.error(error?.message || error)
    }
    process.exit(1)
  }
}

void main()
