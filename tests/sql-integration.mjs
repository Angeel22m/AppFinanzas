import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { summarizeMonths } from '../src/lib/budget.js'
const { PGlite } = await import(process.env.FINANZAS_SQL_ENGINE || '@electric-sql/pglite')
const userA = '11111111-1111-4111-8111-111111111111'
const userB = '22222222-2222-4222-8222-222222222222'
const read = file => readFile(new URL(file, import.meta.url), 'utf8')
const scalar = async (db, sql, values = []) => (await db.query(sql, values)).rows[0]

async function initialize(db) {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    INSERT INTO auth.users VALUES ('${userA}'), ('${userB}');`)
}
const asA = db => db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${userA}'`)
async function snapshot(db) {
  const months = (await db.query('SELECT id,user_id,mes::text,ingreso FROM public.meses_financieros ORDER BY mes')).rows
  const sections = (await db.query('SELECT * FROM public.secciones_presupuesto')).rows
  const extras = (await db.query('SELECT * FROM public.gastos_presupuesto')).rows
  return { months, sections, extras }
}

async function testFresh() {
  const db = new PGlite()
  try {
    await initialize(db)
    const setup = await read('../SUPABASE_SETUP.sql')
    await db.exec(setup)
    await db.exec(setup)
    await asA(db)
    const { id: first } = await scalar(db, 'SELECT public.configurar_finanzas(10000,1000) AS id')
    const { id: food } = await scalar(db, "INSERT INTO public.secciones_presupuesto(mes_id,nombre,monto,monto_recurrente) VALUES($1,'Comida',4000,4000) RETURNING id", [first])
    await db.query('UPDATE public.secciones_presupuesto SET monto=3500 WHERE id=$1', [food])
    assert.equal(Number((await scalar(db, 'SELECT monto_recurrente FROM public.secciones_presupuesto WHERE id=$1', [food])).monto_recurrente), 4000)
    await db.query("INSERT INTO public.gastos_presupuesto(mes_id,nombre,monto) VALUES($1,'Salida',100)", [first])
    await db.exec('RESET ROLE')
    await db.query("UPDATE public.meses_financieros SET mes=(mes-interval '2 months')::date WHERE id=$1", [first])
    await asA(db)
    const { id: current } = await scalar(db, 'SELECT public.abrir_mes_financiero() AS id')
    assert.equal((await scalar(db, 'SELECT public.abrir_mes_financiero() AS id')).id, current)
    const data = await snapshot(db)
    assert.equal(data.months.length, 3)
    assert.equal(data.extras.length, 1)
    assert.equal(data.sections.filter(s => s.mes_id !== first).every(s => Number(s.monto) === 4000), true)
    assert.deepEqual(summarizeMonths({ capital_inicial: 1000 }, data.months, data.sections, data.extras).map(m => m.balance), [7400,13400,19400])
    assert.equal((await db.query('UPDATE public.secciones_presupuesto SET monto=1 WHERE id=$1 RETURNING id', [food])).rows.length, 0)
    const currentFood = data.sections.find(s => s.mes_id === current)
    await db.query('UPDATE public.secciones_presupuesto SET monto=0 WHERE id=$1', [currentFood.id])
    assert.equal(Number((await scalar(db, 'SELECT monto_recurrente FROM public.secciones_presupuesto WHERE id=$1', [currentFood.id])).monto_recurrente), 4000)
    await db.query('UPDATE public.secciones_presupuesto SET monto_recurrente=3000 WHERE id=$1', [currentFood.id])
    assert.equal(Number((await scalar(db, 'SELECT monto FROM public.secciones_presupuesto WHERE id=$1', [currentFood.id])).monto), 0)
    await db.query('SELECT public.configurar_finanzas(8000,0)')
    assert.deepEqual((await db.query('SELECT ingreso FROM public.meses_financieros ORDER BY mes')).rows.map(m => Number(m.ingreso)), [10000,10000,8000])
    await db.exec(`SET request.jwt.claim.sub = '${userB}'`)
    for (const table of ['configuracion_financiera','meses_financieros','secciones_presupuesto','gastos_presupuesto']) {
      assert.equal((await db.query(`SELECT * FROM public.${table}`)).rows.length, 0)
    }
    await scalar(db, 'SELECT public.configurar_finanzas(500,0) AS id')
    await assert.rejects(db.query("INSERT INTO public.gastos_presupuesto(mes_id,nombre,monto) VALUES($1,'Ajeno',1)", [current]))
    await assert.rejects(db.query("INSERT INTO public.secciones_presupuesto(user_id,mes_id,nombre,monto) VALUES($1,$2,'Ajena',1)", [userA,current]))
    await db.exec('SET ROLE anon')
    await assert.rejects(db.query('SELECT public.abrir_mes_financiero()'))
    await assert.rejects(db.query('SELECT * FROM public.meses_financieros'))
  } finally { await db.close() }
}

async function testMigration() {
  const db = new PGlite()
  try {
    await initialize(db)
    await db.exec(await read('./fixtures/legacy-budget.sql'))
    await asA(db)
    const { id: current } = await scalar(db, 'SELECT public.configurar_finanzas(22000,0) AS id')
    await db.query("INSERT INTO public.secciones_presupuesto(mes_id,nombre,asignado) VALUES($1,'Comida',4000),($1,'Pasaje',2025)", [current])
    const { id: service } = await scalar(db, "INSERT INTO public.secciones_presupuesto(mes_id,nombre,asignado) VALUES($1,'Servicios',100) RETURNING id", [current])
    await db.query("INSERT INTO public.gastos_presupuesto(mes_id,seccion_id,nombre,monto,monto_recurrente,tipo) VALUES($1,$2,'Internet',80,100,'fijo'),($1,$2,'Extra',100,0,'extra')", [current,service])
    await db.exec('RESET ROLE')
    const { id: past } = await scalar(db, "INSERT INTO public.meses_financieros(user_id,mes,ingreso) VALUES($1,(date_trunc('month',timezone('America/Guatemala',now()))-interval '1 month')::date,22000) RETURNING id", [userA])
    await db.query("INSERT INTO public.secciones_presupuesto(user_id,mes_id,nombre,asignado) VALUES($1,$2,'Sin gasto registrado',100)", [userA,past])
    const migration = await read('../SUPABASE_SIMPLIFICAR_SECCIONES.sql')
    await db.exec(migration)
    await db.exec(migration)
    await asA(db)
    const data = await snapshot(db)
    const currentSections = data.sections.filter(s => s.mes_id === current)
    assert.equal(Number(currentSections.find(s => s.nombre === 'Comida').monto), 4000)
    assert.equal(Number(currentSections.find(s => s.nombre === 'Pasaje').monto), 2025)
    assert.equal(Number(currentSections.find(s => s.nombre === 'Servicios').monto), 80)
    assert.equal(Number(currentSections.find(s => s.nombre === 'Servicios').monto_recurrente), 100)
    assert.equal(data.extras.length, 1)
    assert.equal(Number(data.extras[0].monto), 100)
    assert.deepEqual(summarizeMonths({ capital_inicial: 0 }, data.months, data.sections, data.extras).map(m => m.balance), [22000,37795])
    await db.query('DELETE FROM public.secciones_presupuesto WHERE id=$1', [service])
    assert.equal((await db.query('SELECT * FROM public.gastos_presupuesto')).rows.length, 1, 'los extras sobreviven a la eliminación de una sección')
    await db.exec('RESET ROLE')
    // Simula otro cambio de mes tras la migración: debe copiar el habitual.
    await db.exec("UPDATE public.meses_financieros SET mes=(mes-interval '2 months')::date")
    await asA(db)
    const { id: next } = await scalar(db, 'SELECT public.abrir_mes_financiero() AS id')
    assert.equal((await db.query('SELECT monto FROM public.secciones_presupuesto WHERE mes_id=$1', [next])).rows.reduce((sum,s) => sum+Number(s.monto),0), 6025)
    assert.equal((await db.query('SELECT * FROM public.gastos_presupuesto')).rows.length, 1)
  } finally { await db.close() }
}

try {
  await testFresh()
  await testMigration()
  console.log('SQL correcto: instalación, migración repetible, secciones como fijos, extras independientes, historial, recurrencia y RLS.')
} catch (error) {
  console.error(error.message, error.detail || '', error.where || '')
  process.exitCode = 1
}
