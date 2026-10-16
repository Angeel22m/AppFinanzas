import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

async function readAll(table, userId) {
  const rows = []
  const columns = table === 'secciones_presupuesto' ? 'id,user_id,mes_id,nombre,monto,monto_recurrente' : '*'
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase.from(table).select(columns).eq('user_id', userId).order('id').range(start, start + 499)
    if (error) {
      if (table === 'secciones_presupuesto' && ['42703', 'PGRST204'].includes(error.code)) {
        throw new Error('Tu base todavía usa las secciones anteriores. Aplica la actualización de secciones para conservar tus datos y usar el nuevo cálculo.')
      }
      throw error
    }
    rows.push(...data)
    if (data.length < 500) return rows
  }
}

export function useBudget(userId) {
  const [state, setState] = useState({ config: null, months: [], sections: [], expenses: [], currentId: null })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    const { data: currentId, error: openError } = await supabase.rpc('abrir_mes_financiero')
    if (openError) throw openError
    const results = await Promise.all([
      supabase.from('configuracion_financiera').select('*').eq('user_id', userId).maybeSingle(),
      readAll('meses_financieros', userId), readAll('secciones_presupuesto', userId), readAll('gastos_presupuesto', userId),
    ])
    if (results[0].error) throw results[0].error
    setState({ config: results[0].data, months: results[1], sections: results[2], expenses: results[3], currentId })
  }, [userId])

  useEffect(() => {
    let active = true
    load().catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [load])

  // Al volver a la pestaña se abre el nuevo mes si cambió el calendario.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') load().catch(err => setError(err.message)) }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (busy || document.visibilityState !== 'visible') return
      const current = state.months.find(month => month.id === state.currentId)
      if (!current) return
      const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
      const calendarMonth = `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`
      if (current.mes.slice(0, 7) !== calendarMonth) load().catch(err => setError(err.message))
    }, 60000)
    return () => window.clearInterval(timer)
  }, [load, state.months, state.currentId, busy])

  const mutate = async (operation, success) => {
    if (busy) return false
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await operation()
      if (result.error) throw result.error
      try { await load() }
      catch (err) { setError(`Se guardó el cambio, pero no se pudo actualizar la vista: ${err.message}`); return true }
      setNotice(success || 'Cambios guardados.')
      return true
    } catch (err) { setError(err.message); return false }
    finally { setBusy(false) }
  }
  return { ...state, loading, busy, error, notice, mutate, reload: () => mutate(async () => ({ error: null }), 'Datos actualizados.') }
}
