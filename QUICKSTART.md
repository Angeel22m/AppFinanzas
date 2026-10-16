# Inicio rápido

1. Ejecuta `npm ci` y copia `.env.example` a `.env` con las credenciales públicas de Supabase.
2. Si ya usas la versión anterior de secciones, aplica SUPABASE_SIMPLIFICAR_SECCIONES.sql y omite el paso 3.
3. Ejecuta `SUPABASE_SETUP.sql` en el SQL Editor de Supabase: reinicia los datos financieros y conserva usuarios.
4. Ejecuta `npm run dev` y abre la ruta `/AppFinanzas/`.
5. Inicia sesión, configura tu ingreso mensual, crea tus secciones de gastos fijos. Cada monto ya se descuenta del total.

El lápiz cambia el gasto actual; el icono de repetición cambia el habitual futuro. El sobrante se acumula automáticamente al abrir cada nuevo mes. Consulta README.md para las reglas, instalación y pruebas.
