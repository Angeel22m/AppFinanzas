export const toCents = value => Math.round(Number(value) * 100)
export const currencies = [
  { code: 'HNL', symbol: 'L', name: 'Lempiras' },
  { code: 'USD', symbol: '$', name: 'Dólares' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzales' },
  { code: 'EUR', symbol: '€', name: 'Euros' },
  { code: 'MXN', symbol: 'MX$', name: 'Pesos mexicanos' },
  { code: 'CRC', symbol: '₡', name: 'Colones' },
  { code: 'NIO', symbol: 'C$', name: 'Córdobas' },
]
const numberFormat = new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function money(value, code = 'HNL', display = 'simbolo') {
  const currency = currencies.find(item => item.code === code) || currencies[0]
  const amount = Number(value)
  return `${amount < 0 ? '−' : ''}${display === 'codigo' ? currency.code : currency.symbol} ${numberFormat.format(Math.abs(amount))}`
}
export const monthLabel = date => new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

// No se guardan saldos derivados: se recalculan a partir de los meses y gastos.
export function summarizeMonths(config, months, sections, expenses) {
  let balance = toCents(config?.capital_inicial || 0)
  return [...months].sort((a, b) => a.mes.localeCompare(b.mes)).map(month => {
    const opening = balance
    const fixed = sections.filter(item => item.mes_id === month.id).reduce((sum, item) => sum + toCents(item.monto), 0)
    const extra = expenses.filter(item => item.mes_id === month.id).reduce((sum, item) => sum + toCents(item.monto), 0)
    const income = toCents(month.ingreso)
    balance += income - fixed - extra
    return { ...month, opening: opening / 100, fixed: fixed / 100, extra: extra / 100, net: (income - fixed - extra) / 100, balance: balance / 100 }
  })
}
