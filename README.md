# Mi presupuesto

App React + Vite + Tailwind + Supabase para distribuir un ingreso mensual en secciones configurables. La captura es una referencia visual: no se cargan sus nombres ni cantidades como datos del usuario.

## Cómo funciona

1. Configura tu ingreso mensual y, opcionalmente, un ahorro anterior.
2. Crea secciones con nombre y monto: cada sección ya es un gasto fijo.
3. Sus montos se descuentan directamente una vez cada mes; no hay gastos anidados.
4. Reporta gastos adicionales en su propio bloque, sin vincularlos a una sección.
5. El sobrante pasa al mes siguiente, incluidos los déficits.

**Saldo acumulado = capital inicial + ingresos de los meses − gastos fijos reales − gastos adicionales.** Cada sección se descuenta una sola vez. Los gastos adicionales son independientes.

Cada sección tiene dos importes: el gasto real del mes y el habitual. El lápiz cambia únicamente el mes actual; el botón de repetición cambia el habitual para los próximos meses. Si comida suele ser 4,000 y este mes gastaste 3,500, el sobrante aumenta 500 y el próximo mes vuelve a prever 4,000. Puedes poner el gasto actual en cero. Para dejar de repetir un fijo, pon su importe habitual en cero.

Los meses anteriores son de solo lectura. Cambiar el ingreso afecta al mes actual y a los siguientes. Los importes se muestran en USD.

## Instalar y configurar

```sh
npm ci
```

Copia `.env.example` a `.env` y configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Mantén la configuración de autenticación y redirecciones de tu proyecto Supabase.

**Si ya tienes la versión de secciones con gastos internos, ejecuta únicamente `SUPABASE_SIMPLIFICAR_SECCIONES.sql`: convierte las secciones actuales en fijos, consolida sus fijos internos y conserva los extras, las cuentas y los saldos anteriores. Es repetible.** Las secciones actuales sin gastos internos pasan a descontar su propio monto; en meses anteriores se conserva el gasto que realmente estaba registrado. Los nombres de los antiguos fijos internos quedan consolidados en el nombre de su sección.

Para una instalación nueva, ejecuta `SUPABASE_SETUP.sql` en el SQL Editor de tu proyecto Supabase. **Es un reinicio destructivo:** elimina categorías, transacciones y presupuestos financieros anteriores, pero conserva las cuentas en `auth.users`. Exporta antes cualquier dato que quieras conservar. Volver a ejecutar el script vuelve a borrar los datos; no es una migración incremental.

```sh
npm run dev
npm run build
```

La app usa la ruta base `/AppFinanzas/`. Tras iniciar sesión, configura tu presupuesto desde el panel. `/libreta` redirige al nuevo panel. Los datos se guardan por usuario en Supabase; la antigua clave local `app_finanzas_store` ya no se utiliza ni se importa.

## Interfaz

Diseño de cristal con fondos translúcidos, desenfoque y contraste adaptable. El botón de sol/luna cambia entre claro y oscuro y guarda la preferencia. La primera visita usa el tema del sistema. La pantalla muestra montos y acciones, con ayuda breve en los formularios.

## Cambio de mes

El calendario usa `America/Guatemala`. Al cargar o volver a la pestaña se materializan los meses pendientes en la base de datos. También se comprueba cada minuto mientras está abierta. Un bloqueo por usuario y la restricción única de mes impiden duplicar el ingreso al recargar o abrir varias pestañas.

Se repiten el ingreso mensual y las secciones con sus importes habituales. Los gastos adicionales no se repiten. Si pasan varios meses sin abrir la app, se generan todos con la configuración habitual anterior; se asume que no hubo gastos adicionales sin reportar. No se necesita una tarea programada para calcular el acumulado cuando vuelves a entrar.

## Validación

```sh
npm test
npm run build
```

La prueba SQL utiliza PostgreSQL en memoria y nunca se conecta a Supabase. Instala temporalmente su motor y ejecútala:

```sh
npm install --no-save --package-lock=false @electric-sql/pglite
node tests/sql-integration.mjs
npm ci
```

Comprueba la ejecución repetida del reset, arrastre de sobrantes, gastos reales frente a habituales, historial, importes inválidos y RLS entre cuentas. `npm ci` restaura las dependencias del proyecto después de la prueba.
