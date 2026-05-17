# 🚀 GUÍA RÁPIDA - Pasos para Iniciar

## ⏱️ Tiempo Total: ~10 minutos

## PASO 1: Crear Proyecto en Supabase (3 min)

1. Ve a https://supabase.com
2. Haz clic en "Start your project"
3. Inicia sesión o regístrate (con Google es más rápido)
4. Crea un nuevo proyecto:
   - **Project Name:** `finanzas-app`
   - **Password:** Guárdalo bien
   - **Region:** Elige la más cercana (ej: sa-east-1 si eres de Latinoamérica)
5. **Espera 1-2 minutos** a que el proyecto esté listo

## PASO 2: Ejecutar Script SQL (2 min)

1. En tu proyecto Supabase, ve a **SQL Editor** (lado izquierdo)
2. Haz clic en "New Query"
3. **Copia TODO el contenido** de `SUPABASE_SETUP.sql` de este proyecto
4. Pégalo en el editor SQL
5. Haz clic en el botón **"Run"** (o Ctrl+Enter)
6. Espera a que termine (deberías ver "Success")

✅ Ahora tienes las tablas con datos iniciales

## PASO 3: Obtener Credenciales (1 min)

1. En Supabase, ve a **Settings → API**
2. Copia estos valores:
   ```
   Project URL = https://xxxxxxxxx.supabase.co
   anon public = eyJhbGciOi...
   ```

## PASO 4: Configurar Proyecto Local (2 min)

1. Abre la terminal en la carpeta `finanzas-app`

2. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env.local
   ```

3. Abre `.env.local` con tu editor favorito y pega:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

4. Guarda el archivo

## PASO 5: Instalar Dependencias (2 min)

```bash
npm install
```

Espera a que termine (tomará 1-2 minutos)

## PASO 6: Ejecutar en Desarrollo (1 min)

```bash
npm run dev
```

Deberías ver:
```
VITE v5.0.0  ready in XXX ms

➜  Local:   http://localhost:5173/finanzas-app/
```

## PASO 7: Probar la App

1. Abre http://localhost:5173/finanzas-app/ en tu navegador
2. Haz clic en **"Registrarse"**
3. Crea una cuenta con tu email (ej: test@example.com)
4. Espera el email de confirmación o usa el link mágico
5. ¡Ya deberías estar en el Dashboard! 🎉

## PRIMER USO

1. **Registra tu Capital Inicial:**
   - Selecciona categoría "Capital Inicial"
   - Ingresa monto (ej: 1000)
   - Haz clic en "Registrar"

2. **Registra algunos gastos:**
   - Categoría: "Comida"
   - Monto: 50
   - Descripción: "Almuerzo" (opcional)

3. **Mira el Reporte:**
   - El dashboard muestra automáticamente:
     - Saldo actual
     - Gráfico de gastos
     - Listado por categoría

4. **Prueba las vistas:**
   - Haz clic en "Gráfico Circular", "Barras", "Listado"

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js recharts
```

### Error: "VITE_SUPABASE_URL is not defined"
→ Verifica que creaste `.env.local` con las credenciales correctas

### Error: "RLS policy denied"
→ Ejecuta nuevamente `SUPABASE_SETUP.sql` en Supabase (botón Run)

### La app no carga transacciones
→ Prueba:
  1. Presiona F12 (DevTools)
  2. Ve a la pestaña "Console"
  3. Revisa si hay errores rojos
  4. Si dice "RLS", ejecuta `SUPABASE_SETUP.sql` de nuevo

### ¿Cómo veo los datos en la base de datos?
1. En Supabase, ve a **Table Editor**
2. Deberías ver "categorias" y "transacciones"
3. Puedes ver, editar o eliminar registros desde ahí

## 📱 DEPLOY a GitHub Pages (Opcional)

Cuando quieras publicar la app:

```bash
# 1. Construir versión de producción
npm run build

# 2. Deploy (requiere gh-pages configurado)
npm run deploy
```

Tu app estará en: `https://tu-usuario.github.io/finanzas-app/`

## ✅ Checklist Final

- [ ] Proyecto creado en Supabase
- [ ] Script SQL ejecutado
- [ ] Credenciales copiadas a `.env.local`
- [ ] `npm install` completado
- [ ] `npm run dev` corriendo
- [ ] App abierta en navegador
- [ ] Registro y login funcionando
- [ ] Transacción registrada
- [ ] Reporte visible

## 📚 Siguientes Pasos

Ahora que tienes la app corriendo:

1. **Lee ARQUITECTURA.md** para entender la estructura
2. **Explora el código** en los componentes principales:
   - `src/components/ReporteMensual.jsx` (el más importante)
   - `src/context/AuthContext.jsx`
3. **Personaliza:**
   - Cambia colores en `tailwind.config.js`
   - Modifica categorías en `SUPABASE_SETUP.sql`
4. **Agrega features:**
   - Filtros por fecha
   - Categorías personalizadas
   - Export a PDF/CSV

## 🆘 ¿Necesitas ayuda?

Si algo no funciona:

1. **Revisa la consola del navegador** (F12)
2. **Revisa los logs en terminal** (donde corres `npm run dev`)
3. **Ve a Supabase → Table Editor** y verifica que existan las tablas
4. **Elimina node_modules y vuelve a instalar:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

---

**¡Ya estás listo! 🚀 Empieza a gestionar tus finanzas.**
