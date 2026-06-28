import nodemailer from 'nodemailer'

import { normalizeText } from './text.js'

const escapeHtml = (value) =>
  normalizeText(value, 1000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildRows = (rows) =>
  rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#5f6865;">${escapeHtml(
          label,
        )}</td><td style="padding:6px 0;font-weight:600;color:#181a19;">${escapeHtml(
          value,
        )}</td></tr>`,
    )
    .join('')

export const createMailTransport = (config) => {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.mailFrom) {
    return null
  }

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  })
}

export const buildEstimateEmail = ({
  timestamp,
  floors,
  area,
  packageLabel,
  name,
  phone,
  estimate,
  quarantineReasons = [],
  attribution = {},
}) => {
  const subjectPrefix = quarantineReasons.length > 0 ? '[Проверить] ' : ''
  const title = `${subjectPrefix}Расчет стоимости строительства`
  const rows = [
    ['Время', timestamp],
    ['Этажность', floors],
    ['Площадь', `${area} м²`],
    ['Комплектация', packageLabel],
    ['Имя', name],
    ['Телефон', phone],
    ['Ориентировочная стоимость', estimate],
    ['Причина проверки', quarantineReasons.join(', ')],
    ['Контекст', attribution.source_context],
    ['UTM source', attribution.utm_source],
    ['UTM medium', attribution.utm_medium],
    ['UTM campaign', attribution.utm_campaign],
    ['UTM content', attribution.utm_content],
    ['UTM term', attribution.utm_term],
    ['Реферер', attribution.referrer_domain],
    ['Landing', attribution.landing_page],
    ['First touch source', attribution.first_utm_source],
    ['First touch medium', attribution.first_utm_medium],
    ['First touch campaign', attribution.first_utm_campaign],
    ['First touch content', attribution.first_utm_content],
    ['First touch term', attribution.first_utm_term],
    ['First touch referrer', attribution.first_referrer_domain],
    ['First touch landing', attribution.first_landing_page],
  ]

  const text = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#181a19;">
      <h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(title)}</h1>
      <table style="border-collapse:collapse;">${buildRows(rows)}</table>
    </div>
  `

  return {
    subject: title,
    text,
    html,
  }
}

export const sendEstimateEmail = async ({
  config,
  email,
  transport = createMailTransport(config),
}) => {
  if (!transport || !config.mailFrom || config.estimateRecipients.length === 0) {
    return { ok: false, skipped: true }
  }

  await transport.sendMail({
    from: config.mailFrom,
    to: config.estimateRecipients,
    subject: email.subject,
    text: email.text,
    html: email.html,
  })

  return { ok: true }
}
