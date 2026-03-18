export const createCalcMetrics = () => ({
  total: 0,
  sent: 0,
  quarantine: 0,
  blocked: 0,
  dedup: 0,
})

export const snapshotCalcMetrics = (metrics) => ({
  ...metrics,
})
