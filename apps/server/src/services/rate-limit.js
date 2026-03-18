export const createSlidingWindowLimiter = (limits, options = {}) => {
  const events = new Map()
  const maxWindow = Math.max(...limits.map((limit) => limit.windowMs))
  const maxKeys = options.maxKeys || 5000
  let lastCleanupAt = 0

  const pruneExpired = (now) => {
    if (now - lastCleanupAt < 10 * 1000) return
    lastCleanupAt = now

    for (const [key, history] of events.entries()) {
      const fresh = history.filter((timestamp) => now - timestamp < maxWindow)
      if (fresh.length === 0) {
        events.delete(key)
      } else {
        events.set(key, fresh)
      }
    }
  }

  const pruneOverflow = () => {
    if (events.size <= maxKeys) return
    const entries = [...events.entries()].sort((a, b) => {
      const aLatest = a[1][a[1].length - 1] || 0
      const bLatest = b[1][b[1].length - 1] || 0
      return aLatest - bLatest
    })

    for (const [key] of entries) {
      if (events.size <= maxKeys) break
      events.delete(key)
    }
  }

  const check = (key, now = Date.now()) => {
    if (!key) return { allowed: true }

    pruneExpired(now)
    const history = events.get(key) || []
    const fresh = history.filter((timestamp) => now - timestamp < maxWindow)
    fresh.push(now)
    events.set(key, fresh)
    pruneOverflow()

    for (const limit of limits) {
      const count = fresh.filter((timestamp) => now - timestamp < limit.windowMs).length
      if (count > limit.max) {
        return { allowed: false, limit }
      }
    }

    return { allowed: true }
  }

  return { check }
}

export const createDedupStore = (options = {}) => {
  const windowMs = options.windowMs || 30 * 60 * 1000
  const maxKeys = options.maxKeys || 3000
  const store = new Map()

  const prune = (now) => {
    for (const [key, timestamp] of store.entries()) {
      if (now - timestamp > windowMs) {
        store.delete(key)
      }
    }
  }

  const pruneOverflow = () => {
    if (store.size < maxKeys) return
    const oldestEntries = [...store.entries()].sort((a, b) => a[1] - b[1])
    const targetSize = Math.floor(maxKeys * 0.9)

    for (const [key] of oldestEntries) {
      if (store.size <= targetSize) break
      store.delete(key)
    }
  }

  const check = (hashKey, now = Date.now()) => {
    prune(now)

    const lastSeen = store.get(hashKey)
    if (lastSeen && now - lastSeen < windowMs) {
      return true
    }

    pruneOverflow()
    store.set(hashKey, now)
    return false
  }

  return {
    check,
    get size() {
      return store.size
    },
  }
}
