import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { summarizeMonths } from '../src/lib/budget.js'

// PostgreSQL aislado en memoria: nunca se conecta a Supabase.
const db = new PGlite()
const userA = '11111111-1111-4111-8111-111111111111'
const userB = '22222222-2222-4222-8222-222222222222'
const scalar = async (sql, values = []) => (await db.query(sql, values)).rows[0]
try {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    INSERT INTO auth.users VALUES ('${userA}'), ('${userB}');`)
  const script = await readFile(new URL('../SUPABASE_SETUP.sql', import.meta.url), 'utf8')
  await db.exec(script)
  await db.exec(script) // El reset se puede volver a ejecutar.
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${userA}';`)
  const { id: firstId } = await scalar('SELECT public.configurar_finanzas(10000,1000) AS id')
  const section = await scalar('INSERT INTO public.secciones_presupuesto(mes_id,nombre,asignado) VALUES($1,$2,4000) RETURNING id', [firstId, 'Comida'])
  const fixed = await scalar("INSERT INTO public.gastos_presupuesto(mes_id,seccion_id,nombre,monto,monto_recurrente,tipo) VALUES($1,$2,'Comida',4000,4000,'fijo') RETURNING id", [firstId, section.id])
  await db.query('UPDATE public.gastos_presupuesto SET monto = 3500 WHERE id = $1', [fixed.id])
  assert.equal(Number((await scalar('SELECT monto_recurrente FROM public.gastos_presupuesto WHERE id=$1', [fixed.id])).monto_recurrente), 4000)
  await db.query("INSERT INTO public.gastos_presupuesto(mes_id,seccion_id,nombre,monto,tipo) VALUES($1,$2,'Salida',100,'extra')", [firstId, section.id])
  // Adelantamos dos meses lógicos sin modificar el reloj del sistema.
  await db.exec('RESET ROLE')
  await db.query("UPDATE public.meses_financieros SET mes = (mes - interval '2 months')::date WHERE id=$1", [firstId])
  await db.exec('SET ROLE authenticated')
  const { id: currentId } = await scalar('SELECT public.abrir_mes_financiero() AS id')
  assert.equal((await scalar('SELECT public.abrir_mes_financiero() AS id')).id, currentId)
  const allMonths = (await db.query('SELECT id, user_id, mes::text, ingreso FROM public.meses_financieros ORDER BY mes')).rows
  const allExpenses = (await db.query('SELECT * FROM public.gastos_presupuesto')).rows
  assert.equal(allMonths.length, 3)
  assert.equal(allExpenses.filter(item => item.tipo === 'extra').length, 1)
  assert.equal(allExpenses.filter(item => item.mes_id !== firstId).every(item => Number(item.monto) === 4000), true)
  assert.deepEqual(summarizeMonths({ capital_inicial: 1000 }, allMonths, allExpenses).map(m => m.balance), [7400, 13400, 19400])
  const pastUpdate = await db.query('UPDATE public.gastos_presupuesto SET monto=1 WHERE id=$1 RETURNING id', [fixed.id])
  assert.equal(pastUpdate.rows.length, 0, 'no se permite editar un mes pasado')
  const currentFixed = allExpenses.find(item => item.mes_id === currentId && item.tipo === 'fijo')
  await db.query('UPDATE public.gastos_presupuesto SET monto=0 WHERE id=$1', [currentFixed.id])
  assert.equal(Number((await scalar('SELECT monto_recurrente FROM public.gastos_presupuesto WHERE id=$1', [currentFixed.id])).monto_recurrente), 4000)
  await db.query('UPDATE public.gastos_presupuesto SET monto_recurrente=3000 WHERE id=$1', [currentFixed.id])
  assert.equal(Number((await scalar('SELECT monto FROM public.gastos_presupuesto WHERE id=$1', [currentFixed.id])).monto), 0)
  await db.query('SELECT public.configurar_finanzas(8000,0)')
  const incomes = (await db.query('SELECT ingreso FROM public.meses_financieros ORDER BY mes')).rows.map(r => Number(r.ingreso))
  assert.deepEqual(incomes, [10000, 10000, 8000])
  await db.exec(`SET request.jwt.claim.sub = '${userB}'`)
  for (const table of ['configuracion_financiera', 'meses_financieros', 'secciones_presupuesto', 'gastos_presupuesto']) {
    assert.equal((await db.query(`SELECT * FROM public.${table}`)).rows.length, 0, table)
  }
  await assert.rejects(db.query('INSERT INTO public.secciones_presupuesto(user_id,mes_id,nombre,asignado) VALUES($1,$2,$3,0)', [userA, currentId, 'Ajena']))
  const { id: bMonth } = await scalar('SELECT public.configurar_finanzas(500,0) AS id')
  await assert.rejects(db.query('INSERT INTO public.secciones_presupuesto(mes_id,nombre,asignado) VALUES($1,$2,0)', [currentId, 'Otro usuario']))
  const bSection = await scalar('INSERT INTO public.secciones_presupuesto(mes_id,nombre,asignado) VALUES($1,$2,0) RETURNING id', [bMonth, 'Propia'])
  await assert.rejects(db.query("INSERT INTO public.gastos_presupuesto(mes_id,seccion_id,nombre,monto,tipo) VALUES($1,$2,'Invalido',1,'extra')", [bMonth, section.id]))
  await assert.rejects(db.query("INSERT INTO public.gastos_presupuesto(mes_id,seccion_id,nombre,monto,tipo) VALUES($1,$2,'Negativo',-1,'extra')", [bMonth, bSection.id]))
  await db.exec('SET ROLE anon')
  await assert.rejects(db.query('SELECT public.abrir_mes_financiero()'))
  await assert.rejects(db.query('SELECT * FROM public.meses_financieros'))
  console.log('SQL correcto: reset, acumulación, recurrencia, ajustes mensuales, historial y RLS entre usuarios.')
} catch (error) {
  console.error(error.message, error.detail || '', error.where || '', error.position || '')
  process.exitCode = 1
} finally { await db.close() }
