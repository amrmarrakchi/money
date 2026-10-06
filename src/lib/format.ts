import { currency } from './store'

const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export function money(amount: number, sign = false) {
  const text = `${number.format(Math.abs(amount))} ${currency.value}`
  if (amount < 0) return `−${text}`
  return sign && amount > 0 ? `+${text}` : text
}

export function moneyShort(amount: number) {
  return compact.format(amount)
}

// Dates are kept as YYYY-MM-DD, read as local dates
export function toDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function today() {
  return isoDate(new Date())
}

export function monthKey(iso: string) {
  return iso.slice(0, 7)
}

export function shortDate(iso: string) {
  return toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function monthLabel(key: string, long = true) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', long ? { month: 'long', year: 'numeric' } : { month: 'short' })
}

export function addMonths(key: string, n: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
