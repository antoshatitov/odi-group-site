import crypto from 'node:crypto'

export const normalizeText = (value, max) => {
  if (!value) return ''
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max)
}

export const normalizePhone = (value) => {
  if (!value) return ''
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+7${digits}`
  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`
  }
  if (digits.startsWith('7')) return `+${digits}`
  return `+${digits}`
}

export const formatRubles = (value) => {
  const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)
  return `${formatted.replace(/\u00A0/g, ' ')} ₽`
}

export const formatKaliningradTimestamp = (date) => {
  const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Kaliningrad',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Kaliningrad',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return `${timeFormatter.format(date)} ${dateFormatter.format(date)}`
}

export const hashValue = (value, salt = 'odi-calc') => {
  return crypto.createHash('sha256').update(`${value}|${salt}`).digest('hex').slice(0, 12)
}
