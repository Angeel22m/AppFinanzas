import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Plus, Pencil, Trash2, Repeat2, LogOut, RefreshCw, X, Wallet } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useBudget } from '../hooks/useBudget'
import { supabase } from '../lib/supabase'
import { money, monthLabel, summarizeMonths, toCents } from '../lib/budget'

const inputClass = 'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400'
const actionClass = 'rounded-lg px-3 py-2 text-sm text-amber-400 hover:bg-zinc-900 disabled:opacity-40'
function Fold({ title, children, value }) {
  return <details open className="group border-b border-zinc-800 py-5"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold focus-visible:outline-amber-400"><ChevronDown size={17} className="shrink-0 -rotate-90 text-zinc-500 group-open:rotate-0" /><span className="flex-1">{title}</span>{value && <span className="text-sm font-normal text-amber-400">{value}</span>}</summary><div className="mt-4 pl-1 sm:pl-6">{children}</div></details>
}
function IconButton({ label, onClick, children, disabled }) {
  return <button type="button" disabled={disabled} title={label} aria-label={label} onClick={onClick} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400 disabled:opacity-30">{children}</button>
}
function Field({ label, children }) { return <label className="block space-y-2 text-sm text-zinc-300"><span>{label}</span>{children}</label> }
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
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [sessionError, setSessionError] = useState('')
  const history = summarizeMonths(config, months, expenses)
  const selected = history.find(month => month.id === (selectedId || currentId)) || history.at(-1)
  const editable = selected?.id === currentId
  const currentSections = sections.filter(section => section.mes_id === selected?.id)
  const currentExpenses = expenses.filter(expense => expense.mes_id === selected?.id)
  const assigned = currentSections.reduce((sum, section) => sum + toCents(section.asignado), 0) / 100
  const available = selected ? selected.opening + Number(selected.ingreso) : 0
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  const openConfig = () => setForm({ kind: 'config', income: config?.ingreso_mensual ?? '', capital: '' })
  const openExpense = (section, item, type = 'extra') => setForm({ kind: 'expense', sectionId: section.id, id: item?.id, name: item?.nombre || '', amount: item?.monto ?? '', type: item?.tipo || type })
  const closeForm = () => { if (!busy) setForm(null) }

  const submit = async event => {
    event.preventDefault()
    let operation
    if (form.kind === 'config') operation = () => supabase.rpc('configurar_finanzas', { p_ingreso: Number(form.income), p_capital: Number(form.capital || 0) })
    if (form.kind === 'section') {
      const values = { nombre: form.name.trim(), asignado: Number(form.amount) }
      operation = () => form.id
        ? supabase.from('secciones_presupuesto').update(values).eq('id', form.id).eq('user_id', user.id).select().single()
        : supabase.from('secciones_presupuesto').insert({ ...values, user_id: user.id, mes_id: currentId }).select().single()
    }
    if (form.kind === 'expense') {
      const values = { nombre: form.name.trim(), monto: Number(form.amount) }
      operation = () => form.id
        ? supabase.from('gastos_presupuesto').update(values).eq('id', form.id).eq('user_id', user.id).select().single()
        : supabase.from('gastos_presupuesto').insert({ ...values, user_id: user.id, mes_id: currentId, seccion_id: form.sectionId, tipo: form.type, monto_recurrente: form.type === 'fijo' ? Number(form.amount) : 0 }).select().single()
    }
    if (form.kind === 'recurrence') operation = () => supabase.from('gastos_presupuesto').update({ monto_recurrente: Number(form.amount) }).eq('id', form.id).eq('user_id', user.id).select().single()
    const saved = await mutate(operation, form.kind === 'recurrence' ? 'Importe habitual actualizado para los próximos meses.' : 'Cambios guardados en tu cuenta.')
    if (saved) setForm(null)
  }
  const remove = async () => {
    const table = deleteTarget.kind === 'section' ? 'secciones_presupuesto' : 'gastos_presupuesto'
    const saved = await mutate(() => supabase.from(table).delete().eq('id', deleteTarget.id).eq('user_id', user.id).select().single(), 'Registro eliminado.')
    if (saved) setDeleteTarget(null)
  }
  const logout = async () => { try { await signOut() } catch (err) { setSessionError(err.message) } }

  return <div className="min-h-screen bg-black text-zinc-100" style={{ colorScheme: 'dark' }}>
    <div className="mx-auto min-h-screen max-w-3xl border-x border-zinc-900 pb-20">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-900 px-5 py-4">
        <div className="flex items-center gap-2 text-amber-400"><Wallet size={21} /><span className="font-semibold">Mi presupuesto</span></div>
        <div className="flex items-center gap-1"><Link to="/profile" className={actionClass}>Mi perfil</Link><IconButton label="Actualizar datos" disabled={busy || loading} onClick={budget.reload}><RefreshCw size={18} /></IconButton><IconButton label="Cerrar sesión" onClick={logout}><LogOut size={18} /></IconButton></div>
      </header>
      <main className="px-5 py-7 sm:px-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tu dinero, a tu manera</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Todo empieza con tu total.</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">Divide tu ingreso mensual en secciones. Descontamos los fijos una vez al mes y los gastos adicionales que reportes. El sobrante pasa al mes siguiente.</p>
        {(error || sessionError) && <div role="alert" className="my-5 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"><p>{error || sessionError}</p><p className="mt-2 text-xs">Si acabas de actualizar la app, ejecuta el nuevo SUPABASE_SETUP.sql en tu proyecto Supabase y pulsa actualizar.</p></div>}
        {notice && <p role="status" className="mt-4 text-sm text-amber-400">{notice}</p>}
        {loading ? <p role="status" className="py-12 text-zinc-400">Cargando tu presupuesto…</p> : !config ? <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-xl font-semibold">Configura tu primer mes</h2><p className="mt-2 text-sm text-zinc-400">Empiezas sin conceptos ni montos precargados. Tú decides cómo distribuir tu dinero.</p><button disabled={busy} className="mt-5 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black disabled:opacity-40" onClick={openConfig}>Poner mi total mensual</button></div> : <>
          <div className="mt-7 flex flex-wrap items-end justify-between gap-4"><Field label="Mes del presupuesto"><select aria-label="Mes del presupuesto" className={inputClass} value={selected?.id || ''} onChange={e => setSelectedId(e.target.value)}>{[...history].reverse().map(month => <option key={month.id} value={month.id}>{monthLabel(month.mes)}</option>)}</select></Field>{editable && <button className={actionClass} disabled={busy} onClick={openConfig}>Configurar ingreso mensual</button>}</div>
          {!editable && <p className="mt-4 text-sm text-zinc-400">Historial de solo lectura. Los ajustes del mes actual no cambian estos importes.</p>}
          <section className="my-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6" aria-label="Saldo disponible"><p className="text-sm text-zinc-400">Disponible acumulado</p><p className={`mt-2 break-words text-4xl font-semibold tracking-tight sm:text-5xl ${selected?.balance < 0 ? 'text-red-400' : 'text-amber-400'}`}>{money(selected?.balance || 0)}</p><p className="mt-3 text-xs leading-relaxed text-zinc-500">Incluye el sobrante anterior y descuenta todos los gastos fijos de este mes, aunque todavía no hayas registrado gastos adicionales.</p></section>
          <Fold title="Mi total del mes" value={money(available)}><dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-zinc-400">Sobrante anterior{history[0]?.id === selected?.id ? ' / capital inicial' : ''}</dt><dd>{money(selected?.opening || 0)}</dd></div><div className="flex justify-between"><dt className="text-zinc-400">Ingreso mensual</dt><dd>{money(Number(selected?.ingreso || 0))}</dd></div><div className="flex justify-between"><dt className="text-zinc-400">Gastos fijos</dt><dd>− {money(selected?.fixed || 0)}</dd></div><div className="flex justify-between"><dt className="text-zinc-400">Gastos adicionales</dt><dd>− {money(selected?.extra || 0)}</dd></div><div className="flex justify-between border-t border-zinc-800 pt-3 font-semibold"><dt>Sobrante acumulado</dt><dd className="text-amber-400">{money(selected?.balance || 0)}</dd></div></dl></Fold>
          <div className="mt-7 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Mis secciones</h2>{editable && <button disabled={busy} className={`${actionClass} flex items-center gap-1`} onClick={() => setForm({ kind: 'section', name: '', amount: '' })}><Plus size={16} />Crear sección</button>}</div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">Asignar un presupuesto a una sección no lo gasta. Solo se descuentan sus fijos y gastos adicionales. Las asignaciones se renuevan cada mes.</p>
          <p className="mt-3 text-sm text-zinc-400">Total asignado: {money(assigned)} · Por asignar: {money((toCents(available) - toCents(assigned)) / 100)}</p>
          {assigned > available && <p className="mt-3 text-sm text-amber-400">Has asignado {money(assigned - available)} más de lo que tienes para este mes.</p>}
          {currentSections.length === 0 && <p className="my-7 rounded-xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-400">Crea tus secciones: por ejemplo, gastos fijos, comida o transporte. Tú eliges los nombres.</p>}
          {currentSections.map(section => {
            const items = currentExpenses.filter(item => item.seccion_id === section.id)
            const spent = items.reduce((sum, item) => sum + toCents(item.monto), 0) / 100
            const remaining = (toCents(section.asignado) - toCents(spent)) / 100
            return <Fold key={section.id} title={section.nombre} value={money(remaining)}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400"><p>Asignado: {money(Number(section.asignado))} · Gastado: {money(spent)}</p>{editable && <div><IconButton label={`Editar sección ${section.nombre}`} disabled={busy} onClick={() => setForm({ kind: 'section', id: section.id, name: section.nombre, amount: section.asignado })}><Pencil size={15} /></IconButton><IconButton label={`Eliminar sección ${section.nombre}`} disabled={busy} onClick={() => setDeleteTarget({ kind: 'section', id: section.id, name: section.nombre })}><Trash2 size={15} /></IconButton></div>}</div>
              {remaining < 0 && <p className="mt-2 text-xs text-red-400">Superaste la asignación de esta sección en {money(-remaining)}.</p>}
              {['fijo', 'extra'].map(type => <div key={type} className="mt-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{type === 'fijo' ? 'Gastos fijos mensuales' : 'Gastos adicionales'}</h3>{items.filter(item => item.tipo === type).length === 0 && <p className="py-2 text-xs text-zinc-600">Sin {type === 'fijo' ? 'gastos fijos' : 'gastos adicionales'}.</p>}{items.filter(item => item.tipo === type).map(item => <div key={item.id} className="flex items-center gap-2 border-b border-zinc-900 py-2"><div className="min-w-0 flex-1"><p className="break-words text-sm">{item.nombre}</p>{type === 'fijo' && <p className="mt-1 text-xs text-zinc-500">Habitual: {money(Number(item.monto_recurrente))}{Number(item.monto_recurrente) === 0 ? ' · no se repetirá' : ' / mes'}</p>}</div><span className="text-sm tabular-nums">{money(Number(item.monto))}</span>{editable && <div className="flex shrink-0"><IconButton label={`Editar ${item.nombre} solo este mes`} disabled={busy} onClick={() => openExpense(section, item)}><Pencil size={14} /></IconButton>{type === 'fijo' ? <IconButton label={`Cambiar importe habitual de ${item.nombre}`} disabled={busy} onClick={() => setForm({ kind: 'recurrence', id: item.id, name: item.nombre, amount: item.monto_recurrente })}><Repeat2 size={14} /></IconButton> : <IconButton label={`Eliminar ${item.nombre}`} disabled={busy} onClick={() => setDeleteTarget({ kind: 'expense', id: item.id, name: item.nombre })}><Trash2 size={14} /></IconButton>}</div>}</div>)}</div>)}
              {editable && <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} className={actionClass} onClick={() => openExpense(section, null, 'fijo')}>+ Gasto fijo</button><button disabled={busy} className={actionClass} onClick={() => openExpense(section, null, 'extra')}>+ Reportar gasto</button></div>}
            </Fold>
          })}
          <Fold title="Historial y acumulación"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Sobrante acumulado por mes</caption><thead className="text-zinc-500"><tr><th scope="col" className="py-3 pr-4">Mes</th><th scope="col" className="pr-4 text-right">Sobrante del mes</th><th scope="col" className="text-right">Acumulado</th></tr></thead><tbody>{history.map(month => <tr key={month.id} className="border-t border-zinc-900"><td className="py-3 pr-4">{monthLabel(month.mes)}</td><td className="pr-4 text-right">{money(month.net)}</td><td className="text-right text-amber-400">{money(month.balance)}</td></tr>)}</tbody></table></div></Fold>
          <p className="mt-5 text-xs leading-relaxed text-zinc-500">El cambio de mes sigue la hora de Guatemala. Al entrar se generan los meses pendientes una sola vez. Se repiten el ingreso y los importes habituales de los fijos; los gastos adicionales no se repiten.</p>
        </>}
      </main>
    </div>
    {form && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/80 p-4" onClick={closeForm}><section role="dialog" aria-modal="true" aria-labelledby="budget-form-title" className="my-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') closeForm() }}><div className="mb-5 flex items-center justify-between gap-2"><h2 id="budget-form-title" className="text-xl font-semibold">{form.kind === 'config' ? 'Mi ingreso mensual' : form.kind === 'section' ? (form.id ? 'Editar sección' : 'Crear sección') : form.kind === 'recurrence' ? 'Importe habitual' : form.id ? 'Editar gasto de este mes' : form.type === 'fijo' ? 'Nuevo gasto fijo' : 'Reportar gasto adicional'}</h2><IconButton label="Cerrar formulario" disabled={busy} onClick={closeForm}><X size={18} /></IconButton></div><form className="space-y-5" onSubmit={submit}>
      {form.kind === 'config' ? <><NumberField label="Ingreso total de cada mes" value={form.income} onChange={value => change('income', value)} />{!config && <NumberField label="Ahorro o capital anterior (opcional)" value={form.capital || 0} onChange={value => change('capital', value)} />}<p className="text-xs leading-relaxed text-zinc-400">{config ? 'Actualiza el ingreso de este mes y de los siguientes. Los meses anteriores conservan su ingreso.' : 'Este ingreso se suma una vez cada mes. El capital anterior solo se suma al inicio.'}</p></> : <>
        {form.kind !== 'recurrence' && <Field label="Nombre"><input autoFocus className={inputClass} required maxLength={100} pattern=".*\S.*" value={form.name} onChange={e => change('name', e.target.value)} /></Field>}
        <NumberField label={form.kind === 'section' ? 'Presupuesto asignado para este mes' : form.kind === 'recurrence' ? `Importe habitual de ${form.name}` : 'Gasto de este mes'} min={form.kind === 'expense' && (!form.id || form.type === 'extra') ? 0.01 : 0} value={form.amount} onChange={value => change('amount', value)} />
        {form.kind === 'expense' && form.type === 'fijo' && <p className="text-xs leading-relaxed text-zinc-400">{form.id ? 'Solo cambia lo gastado este mes. Puedes poner 0 si no hubo gasto. El importe habitual y los meses anteriores se conservan.' : 'Este importe se descontará una vez cada mes. Después puedes ajustar lo gastado en un mes sin cambiar su importe habitual.'}</p>}
        {form.kind === 'recurrence' && <p className="text-xs leading-relaxed text-zinc-400">Se usará a partir del próximo mes. No cambia el gasto de este mes. Pon 0 para que deje de repetirse.</p>}
      </>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={actionClass} onClick={closeForm}>Cancelar</button><button type="submit" disabled={busy} className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-black disabled:opacity-40">{busy ? 'Guardando…' : 'Guardar'}</button></div>
    </form></section></div>}
    {deleteTarget && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6"><h2 id="delete-title" className="text-lg font-semibold">Eliminar {deleteTarget.name}</h2><p className="mt-3 text-sm text-zinc-400">{deleteTarget.kind === 'section' ? 'Se eliminarán esta sección y sus gastos del mes actual. Sus gastos fijos dejarán de repetirse. Los meses anteriores no cambian.' : 'Se eliminará este gasto adicional del mes actual y el dinero volverá al sobrante.'}</p>{error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button disabled={busy} className={actionClass} onClick={() => setDeleteTarget(null)}>Cancelar</button><button disabled={busy} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" onClick={remove}>{busy ? 'Eliminando…' : 'Eliminar'}</button></div></section></div>}
  </div>
}
