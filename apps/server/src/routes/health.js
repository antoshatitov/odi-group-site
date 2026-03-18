import { snapshotCalcMetrics } from '../services/metrics.js'

export const registerHealthRoute = (server, { startedAt, metrics }) => {
  server.get('/api/health', async () => ({
    ok: true,
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    calcMetrics: snapshotCalcMetrics(metrics),
  }))
}
