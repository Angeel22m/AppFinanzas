# Reglas del sistema

- Autenticación con Supabase y datos aislados por usuario.
- Ingreso mensual configurable, capital inicial opcional y secciones libres.
- Sin conceptos o importes personales precargados.
- Gastos fijos descontados una vez por mes y gastos adicionales reportados por el usuario.
- Importe real del fijo editable solo en el mes actual; habitual futuro editable por separado.
- Sobrante positivo o negativo acumulado de forma cronológica.
- Historial mensual de solo lectura.
- Cada sección representa directamente un gasto fijo; los extras se registran aparte.
- Moneda y formato visual configurables por usuario, con HNL (L) inicial, dos decimales y cálculos en centavos enteros. Cambiar la visualización no convierte importes.
- Mes calendario según America/Guatemala, materializado al entrar o actualizar la app.
- Persistencia en Supabase; no se utiliza el presupuesto local anterior.

SUPABASE_SIMPLIFICAR_SECCIONES.sql actualiza la versión anterior sin reiniciar datos. El script de instalación completa sí reinicia los datos financieros: revisa README.md.
