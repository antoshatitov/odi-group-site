const defaultProductionMetrikaId = '109688284'
const rawMetrikaId =
  import.meta.env.VITE_YANDEX_METRIKA_ID ||
  (import.meta.env.PROD ? defaultProductionMetrikaId : '')
const metrikaCounterId = rawMetrikaId ? Number(rawMetrikaId) : 0

const isMetrikaEnabled = Number.isFinite(metrikaCounterId) && metrikaCounterId > 0

type MetrikaMethod = 'hit' | 'init' | 'reachGoal'

type MetrikaInitOptions = {
  accurateTrackBounce: boolean
  clickmap: boolean
  ecommerce: string
  referrer: string
  ssr: boolean
  trackLinks: boolean
  url: string
  webvisor: boolean
}

type MetrikaFunction = (
  counterId: number,
  method: MetrikaMethod,
  target?: string | MetrikaInitOptions,
  params?: Record<string, string>,
) => void

declare global {
  interface Window {
    ym?: MetrikaFunction & { a?: unknown[]; l?: number }
  }
}

export const analyticsGoals = {
  phoneClick: 'phone_click',
  messengerTelegramClick: 'messenger_telegram_click',
  messengerWhatsappClick: 'messenger_whatsapp_click',
  messengerMaxClick: 'messenger_max_click',
  messengerVkClick: 'messenger_vk_click',
  leadFormSubmitSuccess: 'lead_form_submit_success',
  callbackFormSubmitSuccess: 'callback_form_submit_success',
  costEstimateSubmitSuccess: 'cost_estimate_submit_success',
} as const

export type AnalyticsGoal = (typeof analyticsGoals)[keyof typeof analyticsGoals]

let lastTrackedUrl = ''

export const initAnalytics = () => {
  if (!isMetrikaEnabled || typeof window === 'undefined' || window.ym) return

  const ym = function ymStub(...args) {
    ;(ym.a = ym.a || []).push(args)
  } as MetrikaFunction & { a?: unknown[]; l?: number }
  ym.l = Date.now()
  window.ym = ym

  const script = document.createElement('script')
  script.async = true
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${metrikaCounterId}`
  document.head.append(script)

  ym(metrikaCounterId, 'init', {
    accurateTrackBounce: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    ssr: true,
    trackLinks: true,
    url: window.location.href,
    webvisor: true,
  })
  lastTrackedUrl = window.location.href
}

export const trackPageView = (url: string) => {
  if (!isMetrikaEnabled || typeof window === 'undefined' || !window.ym || lastTrackedUrl === url) {
    return
  }

  lastTrackedUrl = url
  window.ym(metrikaCounterId, 'hit', url)
}

export const trackGoal = (goal: AnalyticsGoal, params?: Record<string, string>) => {
  if (!isMetrikaEnabled || typeof window === 'undefined' || !window.ym) return
  window.ym(metrikaCounterId, 'reachGoal', goal, params)
}
