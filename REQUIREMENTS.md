# Reglas del sistema

- Autenticación con Supabase y datos aislados por usuario.
- Ingreso mensual configurable, capital inicial opcional y secciones libres.
- Sin conceptos o importes personales precargados.
- Gastos fijos descontados una vez por mes y gastos adicionales reportados por el usuario.
- Importe real del fijo editable solo en el mes actual; habitual futuro editable por separado.
- Sobrante positivo o negativo acumulado de forma cronológica.
- Historial mensual de solo lectura.
- Distribuir un presupuesto por secciones no representa un gasto.
- Moneda visual USD, importes con dos decimales y cálculos en centavos enteros.
- Mes calendario según America/Guatemala, materializado al entrar o actualizar la app.
- Persistencia en Supabase; no se utiliza el presupuesto local anterior.

El script de instalación reinicia los datos financieros: revisa README.md antes de ejecutarlo.
