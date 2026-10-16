import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Plus, Pencil, Trash2, Repeat2, LogOut, RefreshCw, X, Wallet } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useBudget } from '../hooks/useBudget'
import { supabase } from '../lib/supabase'
import { money as formatMoney, currencies, monthLabel, summarizeMonths, toCents } from '../lib/budget'
import '../styles/budget.css'

const inputClass = 'w-full rounded-lg border border-slate-300/60 dark:border-white/20 bg-white/60 dark:bg-zinc-900/60 px-3 py-2.5 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const actionClass = 'rounded-lg px-3 py-2 text-sm text-blue-600 dark:text-blue-300 hover:bg-blue-500/10 disabled:opacity-40'

function Fold({ title, children, value }) {
  return (
    <details open className="budget-fold glass-panel group">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold focus-visible:outline-blue-500">
        <ChevronDown size={17} className="shrink-0 -rotate-90 text-slate-500 dark:text-zinc-400 group-open:rotate-0" />
        <span className="flex-1">{title}</span>
        {value && <span className="text-sm font-normal text-blue-600 dark:text-blue-300">{value}</span>}
      </summary>
      <div className="mt-4 pl-1 sm:pl-6">{children}</div>
    </details>
  )
}

function IconButton({ label, onClick, children, disabled }) {
  return <button type="button" disabled={disabled} title={label} aria-label={label} onClick={onClick} className="budget-icon rounded-lg p-2 text-slate-600 dark:text-zinc-400 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-300 disabled:opacity-30">{children}</button>
}

function Field({ label, children }) {
  return <label className="block space-y-2 text-sm text-slate-700 dark:text-zinc-300"><span>{label}</span>{children}</label>
}

function NumberField({ label, value, onChange, min = 0 }) {
  return <Field label={label}><input autoComplete="off" className={inputClass} type="number" step="0.01" min={min} max="999999999.99" required value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" /></Field>
}

export function DashboardPage() {
  const { user } = useAuth()
  return <BudgetNotebook key={user.id} user={user} />
}

function BudgetNotebook({ user }) {
  const { signOut } = useAuth()
  const budget = useBudget(user.id)
  const { config, months, sections, expenses, currentId, loading, busy, error, notice, mutate } = budget
  const money = value => formatMoney(value, config?.moneda || 'HNL', config?.formato_moneda || 'simbolo')
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [sessionError, setSessionError] = useState('')
  const history = summarizeMonths(config, months, sections, expenses)
  const selected = history.find(month => month.id === (selectedId || currentId)) || history.at(-1)
  const editable = selected?.id === currentId
  const currentSections = sections.filter(section => section.mes_id === selected?.id)
  const currentExpenses = expenses.filter(expense => expense.mes_id === selected?.id)
  const available = selected ? (toCents(selected.opening) + toCents(selected.ingreso)) / 100 : 0
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  const openConfig = () => setForm({ kind: 'config', income: config?.ingreso_mensual ?? '', capital: '', currency: config?.moneda || 'HNL', display: config?.formato_moneda || 'simbolo' })
  const closeForm = () => { if (!busy) setForm(null) }

  const submit = async event => {
    event.preventDefault()
    let operation
    if (form.kind === 'config') {
      operation = () => supabase.rpc('configurar_presupuesto', { p_ingreso: Number(form.income), p_capital: Number(form.capital || 0), p_moneda: form.currency, p_formato: form.display })
    } else if (form.kind === 'recurrence') {
      operation = () => supabase.from('secciones_presupuesto')
        .update({ monto_recurrente: Number(form.amount) }).eq('id', form.id).eq('user_id', user.id).select().single()
    } else {
      const table = form.kind === 'section' ? 'secciones_presupuesto' : 'gastos_presupuesto'
      const values = { nombre: form.name.trim(), monto: Number(form.amount) }
      if (form.kind === 'section' && !form.id) values.monto_recurrente = Number(form.amount)
      operation = () => form.id
        ? supabase.from(table).update(values).eq('id', form.id).eq('user_id', user.id).select().single()
        : supabase.from(table).insert({ ...values, user_id: user.id, mes_id: currentId }).select().single()
    }
    const saved = await mutate(operation, form.kind === 'recurrence'
      ? 'Importe habitual actualizado para los próximos meses.' : 'Cambios guardados en tu cuenta.')
    if (saved) setForm(null)
  }

  const remove = async () => {
    const table = deleteTarget.kind === 'section' ? 'secciones_presupuesto' : 'gastos_presupuesto'
    const saved = await mutate(() => supabase.from(table).delete()
      .eq('id', deleteTarget.id).eq('user_id', user.id).select().single(), 'Registro eliminado.')
    if (saved) setDeleteTarget(null)
  }
  const logout = async () => { try { await signOut() } catch (err) { setSessionError(err.message) } }
  const formTitle = form?.kind === 'config' ? 'Ingreso y moneda'
    : form?.kind === 'recurrence' ? 'Importe habitual'
    : form?.kind === 'section' ? (form.id ? 'Editar fijo de este mes' : 'Crear sección de gasto fijo')
    : form?.id ? 'Editar gasto adicional' : 'Reportar gasto adicional'

  return (
    <div className="budget-shell min-h-screen text-slate-900 dark:text-zinc-100">
      <div className="budget-frame mx-auto min-h-screen max-w-3xl pb-20">
        <header className="budget-header glass-panel flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3"><span className="budget-brand"><Wallet size={21} /></span><span className="font-semibold tracking-tight">Mi presupuesto</span></div>
          <div className="flex items-center gap-1">
            <Link to="/profile" className={actionClass}>Mi perfil</Link>
            <IconButton label="Actualizar datos" disabled={busy || loading} onClick={budget.reload}><RefreshCw size={18} /></IconButton>
            <IconButton label="Cerrar sesión" onClick={logout}><LogOut size={18} /></IconButton>
          </div>
        </header>
        <main className="budget-main px-1 py-6 sm:px-3">
          {(error || sessionError) && <div role="alert" className="my-5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/80 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">{error || sessionError}</div>}
          {notice && <p role="status" className="mt-4 text-sm text-blue-600 dark:text-blue-300">{notice}</p>}
          {loading ? <p role="status" className="py-12 text-slate-600 dark:text-zinc-400">Cargando tu presupuesto…</p> : !config ? (
            <div className="glass-panel rounded-2xl p-8">
              <h2 className="text-xl font-semibold">Configura tu primer mes</h2>
              <button disabled={busy} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-40" onClick={openConfig}>Poner mi total mensual</button>
            </div>
          ) : <>
            <div className="budget-toolbar flex flex-wrap items-end justify-between gap-4">
              <Field label="Mes del presupuesto">
                <select aria-label="Mes del presupuesto" className={inputClass} value={selected?.id || ''} onChange={e => setSelectedId(e.target.value)}>
                  {[...history].reverse().map(month => <option key={month.id} value={month.id}>{monthLabel(month.mes)}</option>)}
                </select>
              </Field>
              {editable && <button className={`${actionClass} budget-edit-income`} disabled={busy} onClick={openConfig}><Pencil size={14} />Configurar</button>}
            </div>
            {!editable && <p className="mt-4 text-xs text-slate-500 dark:text-zinc-400">Solo lectura</p>}
            <section className="budget-balance glass-panel my-6 p-7 sm:p-9" aria-label="Saldo disponible">
              <p className="text-sm text-slate-600 dark:text-zinc-400">Disponible acumulado</p>
              <p className={`budget-amount mt-3 break-words text-4xl font-semibold tracking-tight sm:text-5xl ${selected?.balance < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{money(selected?.balance || 0)}</p>
            </section>
            <Fold title="Mi total del mes" value={money(available)}>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-600 dark:text-zinc-400">Sobrante anterior{history[0]?.id === selected?.id ? ' / capital inicial' : ''}</dt><dd>{money(selected?.opening || 0)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600 dark:text-zinc-400">Ingreso mensual</dt><dd>{money(Number(selected?.ingreso || 0))}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600 dark:text-zinc-400">Gastos fijos</dt><dd>− {money(selected?.fixed || 0)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600 dark:text-zinc-400">Gastos adicionales</dt><dd>− {money(selected?.extra || 0)}</dd></div>
                <div className="flex justify-between border-t border-slate-200/70 dark:border-white/10 pt-3 font-semibold"><dt>Sobrante acumulado</dt><dd className="text-blue-600 dark:text-blue-300">{money(selected?.balance || 0)}</dd></div>
              </dl>
            </Fold>
            <Fold title="Gastos fijos" value={money(selected?.fixed || 0)}>
              {currentSections.length === 0 && <p className="py-4 text-sm text-slate-500 dark:text-zinc-400">Sin gastos fijos.</p>}
              {currentSections.map(section => (
                <div key={section.id} className="budget-row flex items-center gap-2 border-b border-slate-200/70 dark:border-white/10 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{section.nombre}</p>
                    {Number(section.monto) !== Number(section.monto_recurrente) && <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Habitual: {money(Number(section.monto_recurrente))} / mes</p>}
                  </div>
                  <span className="text-sm tabular-nums text-blue-600 dark:text-blue-300">{money(Number(section.monto))}</span>
                  {editable && <div className="flex shrink-0">
                    <IconButton label={`Editar ${section.nombre} solo este mes`} disabled={busy} onClick={() => setForm({ kind: 'section', id: section.id, name: section.nombre, amount: section.monto })}><Pencil size={14} /></IconButton>
                    <IconButton label={`Cambiar importe habitual de ${section.nombre}`} disabled={busy} onClick={() => setForm({ kind: 'recurrence', id: section.id, name: section.nombre, amount: section.monto_recurrente })}><Repeat2 size={14} /></IconButton>
                    <IconButton label={`Eliminar ${section.nombre}`} disabled={busy} onClick={() => setDeleteTarget({ kind: 'section', id: section.id, name: section.nombre })}><Trash2 size={14} /></IconButton>
                  </div>}
                </div>
              ))}
              {editable && <button disabled={busy} className={`${actionClass} mt-3 flex items-center gap-1`} onClick={() => setForm({ kind: 'section', name: '', amount: '' })}><Plus size={16} />Crear sección</button>}
            </Fold>
            <Fold title="Gastos adicionales" value={money(selected?.extra || 0)}>
              {currentExpenses.length === 0 && <p className="py-3 text-sm text-slate-500 dark:text-zinc-400">Sin gastos adicionales.</p>}
              {currentExpenses.map(item => (
                <div key={item.id} className="budget-row flex items-center gap-2 border-b border-slate-200/70 dark:border-white/10 py-3">
                  <p className="min-w-0 flex-1 break-words text-sm">{item.nombre}</p>
                  <span className="text-sm tabular-nums">{money(Number(item.monto))}</span>
                  {editable && <div className="flex shrink-0">
                    <IconButton label={`Editar ${item.nombre}`} disabled={busy} onClick={() => setForm({ kind: 'expense', id: item.id, name: item.nombre, amount: item.monto })}><Pencil size={14} /></IconButton>
                    <IconButton label={`Eliminar ${item.nombre}`} disabled={busy} onClick={() => setDeleteTarget({ kind: 'expense', id: item.id, name: item.nombre })}><Trash2 size={14} /></IconButton>
                  </div>}
                </div>
              ))}
              {editable && <button disabled={busy} className={`${actionClass} mt-3 flex items-center gap-1`} onClick={() => setForm({ kind: 'expense', name: '', amount: '' })}><Plus size={16} />Reportar gasto adicional</button>}
            </Fold>
            <Fold title="Historial">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Sobrante acumulado por mes</caption>
                  <thead className="text-slate-500 dark:text-zinc-400"><tr><th scope="col" className="py-3 pr-4">Mes</th><th scope="col" className="pr-4 text-right">Sobrante del mes</th><th scope="col" className="text-right">Acumulado</th></tr></thead>
                  <tbody>{history.map(month => <tr key={month.id} className="border-t border-slate-200/70 dark:border-white/10"><td className="py-3 pr-4">{monthLabel(month.mes)}</td><td className="pr-4 text-right">{money(month.net)}</td><td className="text-right text-blue-600 dark:text-blue-300">{money(month.balance)}</td></tr>)}</tbody>
                </table>
              </div>
            </Fold>
          </>}
        </main>
      </div>
      {form && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/80 p-4" onClick={closeForm}>
        <section role="dialog" aria-modal="true" aria-labelledby="budget-form-title" className="budget-modal glass-panel my-auto max-h-[90dvh] w-full max-w-md overflow-y-auto p-6" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') closeForm() }}>
          <div className="mb-5 flex items-center justify-between gap-2"><h2 id="budget-form-title" className="text-xl font-semibold">{formTitle}</h2><IconButton label="Cerrar formulario" disabled={busy} onClick={closeForm}><X size={18} /></IconButton></div>
          <form className="space-y-5" onSubmit={submit}>
            {form.kind === 'config' ? <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Moneda">
                  <select className={inputClass} value={form.currency} onChange={e => change('currency', e.target.value)}>
                    {currencies.map(item => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}
                  </select>
                </Field>
                <Field label="Mostrar como">
                  <select className={inputClass} value={form.display} onChange={e => change('display', e.target.value)}>
                    <option value="simbolo">Símbolo</option><option value="codigo">Código</option>
                  </select>
                </Field>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{formatMoney(Number(form.income || 0), form.currency, form.display)} · Sin conversión.</p>
              <NumberField label="Ingreso total de cada mes" value={form.income} onChange={value => change('income', value)} />
              {!config && <NumberField label="Ahorro o capital anterior (opcional)" value={form.capital || 0} onChange={value => change('capital', value)} />}
              <p className="text-xs text-slate-500 dark:text-zinc-400">{config ? 'Desde este mes.' : 'Se suma cada mes.'}</p>
            </> : <>
              {form.kind !== 'recurrence' && <Field label="Nombre"><input autoFocus className={inputClass} required maxLength={100} pattern=".*\S.*" value={form.name} onChange={e => change('name', e.target.value)} /></Field>}
              <NumberField label={form.kind === 'recurrence' ? `Importe habitual de ${form.name}` : form.kind === 'section' ? 'Monto del gasto fijo este mes' : 'Monto del gasto adicional'} min={form.kind === 'expense' || (form.kind === 'section' && !form.id) ? 0.01 : 0} value={form.amount} onChange={value => change('amount', value)} />
              {form.kind === 'section' && <p className="text-xs text-slate-500 dark:text-zinc-400">{form.id ? 'Solo este mes.' : 'Se descuenta cada mes.'}</p>}
              {form.kind === 'recurrence' && <p className="text-xs text-slate-500 dark:text-zinc-400">Desde el próximo mes. Pon 0 para dejar de repetir.</p>}
            </>}
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={actionClass} onClick={closeForm}>Cancelar</button><button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-40">{busy ? 'Guardando…' : 'Guardar'}</button></div>
          </form>
        </section>
      </div>}
      {deleteTarget && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
        <section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="budget-modal glass-panel w-full max-w-md p-6">
          <h2 id="delete-title" className="text-lg font-semibold">Eliminar {deleteTarget.name}</h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-zinc-400">{deleteTarget.kind === 'section' ? 'Se quitará de este mes y dejará de repetirse.' : 'Se quitará de este mes.'}</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-6 flex justify-end gap-2"><button disabled={busy} className={actionClass} onClick={() => setDeleteTarget(null)}>Cancelar</button><button disabled={busy} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-40" onClick={remove}>{busy ? 'Eliminando…' : 'Eliminar'}</button></div>
        </section>
      </div>}
    </div>
  )
}
