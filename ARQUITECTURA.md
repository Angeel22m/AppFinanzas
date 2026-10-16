# Arquitectura del presupuesto mensual

- `src/pages/DashboardPage.jsx`: panel tipo libreta, configuración, secciones, gastos fijos y adicionales, historial.
- `src/hooks/useBudget.js`: carga paginada y escrituras en Supabase, errores y actualización del mes.
- `src/lib/budget.js`: acumulación cronológica mediante centavos enteros.
- `SUPABASE_SETUP.sql`: reset transaccional, tablas, claves compuestas, RLS y funciones de apertura/configuración.
- `tests/budget.test.js`: reglas del saldo y ajustes mensuales.
- `tests/sql-integration.mjs`: PostgreSQL aislado con autenticación simulada y pruebas de permisos.

## Modelo

`configuracion_financiera` guarda el ingreso recurrente y el capital inicial por usuario. `meses_financieros` guarda una fila por usuario y mes, con el ingreso correspondiente. `secciones_presupuesto` guarda directamente cada gasto fijo: `monto` es el real del mes y `monto_recurrente` es el habitual para los siguientes. `gastos_presupuesto` guarda únicamente los gastos adicionales, vinculados al mes y al propietario, sin sección.

Las claves foráneas compuestas impiden vincular gastos o secciones a meses de otra cuenta. Las políticas RLS limitan lectura al propietario y escritura al mes actual. El cliente no modifica directamente la configuración o los meses: las funciones autenticadas realizan esas operaciones en una transacción, con `search_path` vacío y bloqueo por usuario. No se guardan saldos derivados susceptibles de duplicación.

## Recurrencia

`abrir_mes_financiero()` crea secuencialmente los meses faltantes, copia secciones y solo repite los fijos con habitual mayor que cero. No utiliza el importe real del mes anterior para calcular el siguiente. `configurar_finanzas()` abre primero los meses pendientes con la configuración anterior y después actualiza el ingreso del mes actual y la configuración futura.

El cliente conserva la autenticación y el perfil existentes. El nuevo panel sustituye los informes basados en las antiguas tablas; los componentes anteriores de transacciones no forman parte de las rutas activas.

La migración SUPABASE_SIMPLIFICAR_SECCIONES.sql convierte el modelo anterior sin reiniciar cuentas ni meses. Consolida los fijos internos en su sección, separa los extras y preserva el saldo de los meses históricos. El diseño glass y sus variantes de tema están en src/styles/budget.css.

La configuración incluye moneda y formato_moneda por usuario. La función configurar_presupuesto actualiza ingreso y formato en una sola transacción; el cliente nunca escribe directamente en la tabla de configuración. SUPABASE_MONEDA.sql añade esta preferencia de forma repetible sin reiniciar datos. El formato de moneda es visual y no altera cálculos ni convierte cantidades.
