import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeMonths } from '../src/lib/budget.js'

const months = [
  { id: 'oct', mes: '2026-10-01', ingreso: 10000 },
  { id: 'nov', mes: '2026-11-01', ingreso: 10000 },
]
test('el sobrante se acumula sin duplicar las asignaciones de secciones', () => {
  const result = summarizeMonths({ capital_inicial: 0 }, months, [
    { mes_id: 'oct', tipo: 'fijo', monto: 4000 },
    { mes_id: 'nov', tipo: 'fijo', monto: 4000 },
  ])
  assert.equal(result[0].balance, 6000)
  assert.equal(result[1].opening, 6000)
  assert.equal(result[1].balance, 12000)
})
test('ajustar el gasto real solo cambia ese mes y el sobrante que arrastra', () => {
  const result = summarizeMonths({ capital_inicial: 0 }, months, [
    { mes_id: 'oct', tipo: 'fijo', monto: 3500, monto_recurrente: 4000 },
    { mes_id: 'nov', tipo: 'fijo', monto: 4000, monto_recurrente: 4000 },
    { mes_id: 'nov', tipo: 'extra', monto: 100 },
  ])
  assert.equal(result[0].balance, 6500)
  assert.equal(result[1].fixed, 4000)
  assert.equal(result[1].balance, 12400)
})
test('mantiene centavos, capital inicial y déficits, en orden cronológico', () => {
  const result = summarizeMonths({ capital_inicial: 0.1 }, [...months].reverse().map(m => ({ ...m, ingreso: 0.1 })), [
    { mes_id: 'oct', tipo: 'fijo', monto: 0.3 },
  ])
  assert.equal(result[0].balance, -0.1)
  assert.equal(result[1].opening, -0.1)
  assert.equal(result[1].balance, 0)
})
