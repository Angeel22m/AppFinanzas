import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeMonths } from '../src/lib/budget.js'

const months = [
  { id: 'oct', mes: '2026-10-01', ingreso: 10000 },
  { id: 'nov', mes: '2026-11-01', ingreso: 10000 },
]

test('cada sección descuenta su monto directamente, sin fijos internos', () => {
  const result = summarizeMonths({ capital_inicial: 0 }, [{ ...months[0], ingreso: 22000 }], [
    { mes_id: 'oct', nombre: 'Comida', monto: 4000, monto_recurrente: 4000 },
    { mes_id: 'oct', nombre: 'Pasaje', monto: 2025, monto_recurrente: 2025 },
  ], [])
  assert.equal(result[0].fixed, 6025)
  assert.equal(result[0].balance, 15975)
})

test('los extras son independientes de las secciones y se descuentan una vez', () => {
  const result = summarizeMonths({ capital_inicial: 0 }, months, [], [
    { mes_id: 'oct', nombre: 'Salida', monto: 100 },
  ])
  assert.equal(result[0].extra, 100)
  assert.equal(result[0].balance, 9900)
  assert.equal(result[1].extra, 0)
  assert.equal(result[1].balance, 19900)
})

test('el sobrante se acumula y editar el mes actual no cambia el habitual', () => {
  const result = summarizeMonths({ capital_inicial: 0 }, months, [
    { mes_id: 'oct', monto: 3500, monto_recurrente: 4000 },
    { mes_id: 'nov', monto: 4000, monto_recurrente: 4000 },
  ], [{ mes_id: 'nov', monto: 100 }])
  assert.equal(result[0].balance, 6500)
  assert.equal(result[1].opening, 6500)
  assert.equal(result[1].fixed, 4000)
  assert.equal(result[1].balance, 12400)
})

test('mantiene centavos, capital inicial y déficits, en orden cronológico', () => {
  const result = summarizeMonths({ capital_inicial: 0.1 }, [...months].reverse().map(m => ({ ...m, ingreso: 0.1 })), [
    { mes_id: 'oct', monto: 0.3 },
  ], [])
  assert.equal(result[0].balance, -0.1)
  assert.equal(result[1].opening, -0.1)
  assert.equal(result[1].balance, 0)
})
