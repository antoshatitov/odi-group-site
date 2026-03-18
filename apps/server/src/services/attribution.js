import { normalizeText } from './text.js'

export const buildAttributionLines = (attribution = {}) => {
  const lines = []
  const sourceContext = normalizeText(attribution.source_context, 120)
  const utmSource = normalizeText(attribution.utm_source, 120)
  const utmMedium = normalizeText(attribution.utm_medium, 120)
  const utmCampaign = normalizeText(attribution.utm_campaign, 160)
  const utmContent = normalizeText(attribution.utm_content, 160)
  const utmTerm = normalizeText(attribution.utm_term, 160)
  const referrerDomain = normalizeText(attribution.referrer_domain, 255)
  const landingPage = normalizeText(attribution.landing_page, 255)
  const firstUtmSource = normalizeText(attribution.first_utm_source, 120)
  const firstUtmMedium = normalizeText(attribution.first_utm_medium, 120)
  const firstUtmCampaign = normalizeText(attribution.first_utm_campaign, 160)
  const firstUtmContent = normalizeText(attribution.first_utm_content, 160)
  const firstUtmTerm = normalizeText(attribution.first_utm_term, 160)
  const firstReferrerDomain = normalizeText(attribution.first_referrer_domain, 255)
  const firstLandingPage = normalizeText(attribution.first_landing_page, 255)

  if (sourceContext) {
    lines.push(`Контекст: ${sourceContext}`)
  }

  if (utmSource || utmMedium || utmCampaign || utmContent || utmTerm) {
    lines.push(
      `UTM: source=${utmSource || '-'}, medium=${utmMedium || '-'}, campaign=${
        utmCampaign || '-'
      }, content=${utmContent || '-'}, term=${utmTerm || '-'}`,
    )
  }

  if (referrerDomain) {
    lines.push(`Реферер: ${referrerDomain}`)
  }

  if (landingPage) {
    lines.push(`Landing: ${landingPage}`)
  }

  if (
    firstUtmSource ||
    firstUtmMedium ||
    firstUtmCampaign ||
    firstUtmContent ||
    firstUtmTerm ||
    firstReferrerDomain ||
    firstLandingPage
  ) {
    lines.push(
      `First touch: source=${firstUtmSource || '-'}, medium=${firstUtmMedium || '-'}, campaign=${
        firstUtmCampaign || '-'
      }, content=${firstUtmContent || '-'}, term=${firstUtmTerm || '-'}, ref=${
        firstReferrerDomain || '-'
      }, landing=${firstLandingPage || '-'}`,
    )
  }

  return lines
}
