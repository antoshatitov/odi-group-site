type GoalParamValue = string | number | boolean | null | undefined

type GoalParams = Record<string, GoalParamValue>

type TouchAttribution = {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
  referrer_domain: string
  landing_page: string
}

export type AttributionSnapshot = TouchAttribution & {
  first_utm_source: string
  first_utm_medium: string
  first_utm_campaign: string
  first_utm_content: string
  first_utm_term: string
  first_referrer_domain: string
  first_landing_page: string
}

type YandexMetrika = (counterId: number, method: string, ...args: unknown[]) => void
type YandexMetrikaQueue = YandexMetrika & { a?: unknown[]; l?: number }

const METRIKA_SCRIPT_ID = 'yandex-metrika-tag'
const FIRST_TOUCH_KEY = 'odi_attribution_first_touch_v1'
const LAST_TOUCH_KEY = 'odi_attribution_last_touch_v1'
const DEFAULT_UTM_VALUE = '(not_set)'
const ATTR_VALUE_MAX_LEN = 220

const defaultTouch: TouchAttribution = {
  utm_source: 'direct',
  utm_medium: 'none',
  utm_campaign: DEFAULT_UTM_VALUE,
  utm_content: DEFAULT_UTM_VALUE,
  utm_term: DEFAULT_UTM_VALUE,
  referrer_domain: 'direct',
  landing_page: '/',
}

let initialized = false
let lastTrackedPath = ''

declare global {
  interface Window {
    ym?: YandexMetrika
  }
}

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const normalizeValue = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback
  const normalized = value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\-./:@?&=+%()]+/g, '_')
    .slice(0, ATTR_VALUE_MAX_LEN)
  return normalized || fallback
}

const normalizeUtm = (value: string | null | undefined) => {
  if (!value) return ''
  return normalizeValue(value.toLowerCase(), '')
}

const getCounterId = () => {
  const raw = import.meta.env.VITE_YM_COUNTER_ID
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

const getStorage = (type: 'local' | 'session') => {
  if (!isBrowser()) return null
  try {
    return type === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

const isTouchAttribution = (value: unknown): value is TouchAttribution => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<TouchAttribution>
  return (
    typeof candidate.utm_source === 'string' &&
    typeof candidate.utm_medium === 'string' &&
    typeof candidate.utm_campaign === 'string' &&
    typeof candidate.utm_content === 'string' &&
    typeof candidate.utm_term === 'string' &&
    typeof candidate.referrer_domain === 'string' &&
    typeof candidate.landing_page === 'string'
  )
}

const readTouch = (key: string, type: 'local' | 'session') => {
  const storage = getStorage(type)
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isTouchAttribution(parsed) ? parsed : null
  } catch {
    return null
  }
}

const writeTouch = (key: string, value: TouchAttribution, type: 'local' | 'session') => {
  const storage = getStorage(type)
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

const getReferrerDomain = () => {
  if (!isBrowser()) return 'direct'
  const referrer = document.referrer
  if (!referrer) return 'direct'
  try {
    const parsed = new URL(referrer)
    if (parsed.hostname === window.location.hostname) {
      return 'internal'
    }
    return normalizeValue(parsed.hostname.toLowerCase(), 'unknown')
  } catch {
    return 'unknown'
  }
}

const inferUtmSource = (referrerDomain: string) => {
  if (referrerDomain === 'direct') return 'direct'
  if (referrerDomain === 'internal') return 'internal'
  if (referrerDomain.includes('2gis')) return '2gis'
  if (referrerDomain.includes('yandex')) return 'yandex_search'
  if (referrerDomain === 'unknown') return 'unknown'
  return 'referral'
}

const inferUtmMedium = (utmSource: string) => {
  if (utmSource === 'direct' || utmSource === 'internal') return 'none'
  if (utmSource === '2gis' || utmSource.startsWith('yandex_')) return 'organic'
  if (utmSource === 'unknown') return 'none'
  return 'referral'
}

const getLandingPage = () => {
  if (!isBrowser()) return '/'
  const page = `${window.location.pathname}${window.location.search}`
  return normalizeValue(page || '/', '/')
}

const parseUtmFromLocation = () => {
  if (!isBrowser()) {
    return { hasExplicitUtm: false, utm: {} as Partial<TouchAttribution> }
  }

  const params = new URLSearchParams(window.location.search)
  const utm_source = normalizeUtm(params.get('utm_source'))
  const utm_medium = normalizeUtm(params.get('utm_medium'))
  const utm_campaign = normalizeUtm(params.get('utm_campaign'))
  const utm_content = normalizeUtm(params.get('utm_content'))
  const utm_term = normalizeUtm(params.get('utm_term'))

  return {
    hasExplicitUtm: Boolean(utm_source || utm_medium || utm_campaign || utm_content || utm_term),
    utm: { utm_source, utm_medium, utm_campaign, utm_content, utm_term },
  }
}

const buildTouchFromLocation = (): { touch: TouchAttribution; hasExplicitUtm: boolean } => {
  const referrer_domain = getReferrerDomain()
  const landing_page = getLandingPage()
  const { hasExplicitUtm, utm } = parseUtmFromLocation()

  const inferredSource = inferUtmSource(referrer_domain)
  const utm_source = utm.utm_source || inferredSource
  const utm_medium = utm.utm_medium || inferUtmMedium(utm_source)

  return {
    hasExplicitUtm,
    touch: {
      utm_source,
      utm_medium,
      utm_campaign: utm.utm_campaign || DEFAULT_UTM_VALUE,
      utm_content: utm.utm_content || DEFAULT_UTM_VALUE,
      utm_term: utm.utm_term || DEFAULT_UTM_VALUE,
      referrer_domain,
      landing_page,
    },
  }
}

const toSnapshot = (lastTouch: TouchAttribution, firstTouch: TouchAttribution): AttributionSnapshot => {
  return {
    ...lastTouch,
    first_utm_source: firstTouch.utm_source,
    first_utm_medium: firstTouch.utm_medium,
    first_utm_campaign: firstTouch.utm_campaign,
    first_utm_content: firstTouch.utm_content,
    first_utm_term: firstTouch.utm_term,
    first_referrer_domain: firstTouch.referrer_domain,
    first_landing_page: firstTouch.landing_page,
  }
}

const syncAttribution = (): AttributionSnapshot => {
  const fallbackSnapshot = toSnapshot(defaultTouch, defaultTouch)
  if (!isBrowser()) return fallbackSnapshot

  const { touch: currentTouch, hasExplicitUtm } = buildTouchFromLocation()

  const firstTouch = readTouch(FIRST_TOUCH_KEY, 'local') ?? currentTouch
  const persistedLastTouch = readTouch(LAST_TOUCH_KEY, 'session')

  if (!readTouch(FIRST_TOUCH_KEY, 'local')) {
    writeTouch(FIRST_TOUCH_KEY, firstTouch, 'local')
  }

  const nextLastTouch = !persistedLastTouch || hasExplicitUtm ? currentTouch : persistedLastTouch
  writeTouch(LAST_TOUCH_KEY, nextLastTouch, 'session')

  return toSnapshot(nextLastTouch, firstTouch)
}

const ensureYm = () => {
  if (!isBrowser()) return null
  const existing = window.ym as YandexMetrikaQueue | undefined
  if (existing) return existing

  const queue: YandexMetrikaQueue = ((...args: unknown[]) => {
    queue.a = queue.a ?? []
    queue.a.push(args)
  }) as YandexMetrikaQueue

  queue.l = Date.now()
  window.ym = queue
  return queue
}

const injectMetrikaScript = () => {
  if (!isBrowser()) return
  if (document.getElementById(METRIKA_SCRIPT_ID)) return

  const script = document.createElement('script')
  script.id = METRIKA_SCRIPT_ID
  script.async = true
  script.src = 'https://mc.yandex.ru/metrika/tag.js'
  const firstScript = document.getElementsByTagName('script')[0]

  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
    return
  }

  document.head.appendChild(script)
}

const sanitizeGoalParams = (params: GoalParams): Record<string, string | number | boolean> => {
  const sanitized: Record<string, string | number | boolean> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string') {
      sanitized[key] = normalizeValue(value, '')
      continue
    }
    if (typeof value === 'number') {
      if (Number.isFinite(value)) sanitized[key] = value
      continue
    }
    sanitized[key] = value
  }

  return sanitized
}

const getCurrentPagePath = () => {
  if (!isBrowser()) return '/'
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export const getAttribution = () => syncAttribution()

export const initAnalytics = () => {
  syncAttribution()
  const counterId = getCounterId()
  if (!counterId || initialized || !isBrowser()) return

  ensureYm()
  injectMetrikaScript()

  window.ym?.(counterId, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    trackHash: true,
  })

  initialized = true
}

export const trackPageView = (path: string, title?: string) => {
  const counterId = getCounterId()
  if (!counterId || !isBrowser() || typeof window.ym !== 'function') return

  const normalizedPath = normalizeValue(path || getCurrentPagePath(), '/')
  if (lastTrackedPath === normalizedPath) return
  lastTrackedPath = normalizedPath

  window.ym(counterId, 'hit', normalizedPath, {
    title: title || document.title,
    referer: document.referrer || undefined,
    params: getAttribution(),
  })
}

export const trackGoal = (eventName: string, params: GoalParams = {}) => {
  const counterId = getCounterId()
  if (!counterId || !isBrowser() || typeof window.ym !== 'function') return

  const goalName = normalizeValue(eventName, 'event')
  const payload = sanitizeGoalParams({
    page_path: getCurrentPagePath(),
    ...getAttribution(),
    ...params,
  })

  window.ym(counterId, 'reachGoal', goalName, payload)
}
