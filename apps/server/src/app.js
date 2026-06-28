import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

import { createCorsOriginChecker } from './config.js'
import { createEstimateRuntime, registerEstimateRoute } from './routes/estimate.js'
import { registerHealthRoute } from './routes/health.js'
import { registerLeadRoute } from './routes/lead.js'

export const createApp = async (config) => {
  const server = Fastify({
    trustProxy: config.trustProxy,
    logger: {
      level: 'info',
      redact: ['req.headers.authorization'],
    },
  })

  await server.register(helmet, {
    contentSecurityPolicy: false,
  })

  await server.register(cors, {
    origin: createCorsOriginChecker(config),
    credentials: false,
  })

  await server.register(rateLimit, {
    max: 15,
    timeWindow: '1 minute',
    ban: 2,
    allowList: [],
    keyGenerator: (req) => req.ip,
  })

  const estimateRuntime = createEstimateRuntime(config)

  registerLeadRoute(server, config)
  registerEstimateRoute(server, config, estimateRuntime)
  registerHealthRoute(server, {
    startedAt: config.startedAt,
    metrics: estimateRuntime.metrics,
  })

  server.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      reply.code(400).send({ error: 'Invalid payload' })
      return
    }

    if (error.message === 'Not allowed by CORS') {
      reply.code(403).send({ error: 'CORS blocked' })
      return
    }

    server.log.error({ error: error.message }, 'Unhandled error')
    reply.code(500).send({ error: 'Server error' })
  })

  return server
}
