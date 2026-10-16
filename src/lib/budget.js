export const toCents = value => Math.round(Number(value) * 100)
export const money = value => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' }).format(value)
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
