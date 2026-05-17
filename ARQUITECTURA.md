# Estructura del Proyecto - Guía Detallada

## 📂 Árbol Completo

```
finanzas-app/
│
├── 📄 package.json                  # Dependencias y scripts
├── 📄 vite.config.js                # Configuración de Vite
├── 📄 tailwind.config.js            # Configuración de Tailwind
├── 📄 postcss.config.js             # PostCSS plugins
├── 📄 .gitignore                    # Ignorar archivos en git
├── 📄 .env.example                  # Plantilla de variables
├── 📄 SUPABASE_SETUP.sql            # Script SQL (ejecutar en Supabase)
├── 📄 README.md                     # Este archivo
│
├── 📁 index.html                    # Punto de entrada HTML
│
├── 📁 public/                       # Archivos estáticos
│   └── favicon.ico
│
└── 📁 src/
    ├── 📄 main.jsx                  # Bootstrap React (ReactDOM.render)
    ├── 📄 App.jsx                   # Router principal + rutas
    ├── 📄 index.css                 # Estilos globales + Tailwind
    │
    ├── 📁 lib/
    │   └── 📄 supabase.js           # Cliente de Supabase inicializado
    │
    ├── 📁 context/
    │   └── 📄 AuthContext.jsx       # Proveedor de auth + estado
    │
    ├── 📁 hooks/
    │   └── 📄 useAuth.js            # Custom hook useAuth()
    │
    ├── 📁 components/
    │   ├── 📄 ProtectedRoute.jsx     # Wrapper para rutas privadas
    │   ├── 📄 IngresosGastosForm.jsx # Formulario de transacciones
    │   └── 📄 ReporteMensual.jsx     # Componente de reportes (CORE)
    │
    └── 📁 pages/
        ├── 📄 AuthPage.jsx          # Login/Registro (pública)
        └── 📄 DashboardPage.jsx     # Dashboard (privada)
```

## 🔄 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                        main.jsx                                  │
│              (ReactDOM.createRoot -> App)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      App.jsx                                     │
│          (Router + AuthProvider wrapper)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
  /login route                      /dashboard route
 (AuthPage.jsx)            (Protected by ProtectedRoute)
        │                                       │
        │                         ┌─────────────▼──────────────┐
        │                         │   DashboardPage.jsx        │
        │                         │  (integrador principal)    │
        │                         └─────────────┬──────────────┘
        │                                       │
        │                    ┌──────────────────┴──────────────────┐
        │                    │                                     │
        │                    ▼                                     ▼
        │          IngresosGastosForm.jsx              ReporteMensual.jsx
        │          (Registra transacción)             (Muestra reportes)
        │                    │                                     │
        │                    └─────────────────┬───────────────────┘
        │                                      │
        └──────────────────────────────────────┴──────────► Supabase
                                               │
                                  ┌────────────┴────────────┐
                                  │                         │
                        ▼ (SELECT)                   ▼ (INSERT)
                   categorias table            transacciones table
                   (lectura pública)           (protegida por RLS)
```

## 🔐 Autenticación - AuthContext

```jsx
// El flujo:
main.jsx
  └─ <AuthProvider>
      └─ useAuth() disponible en toda la app
         ├─ user: Usuario autenticado (obj con email, id)
         ├─ loading: boolean
         ├─ error: string
         ├─ signUp(email, password)
         ├─ signIn(email, password)
         └─ signOut()
```

## 📊 ReporteMensual - Consulta de Datos

```javascript
// 1. QUERY a Supabase (obtiene mes actual)
const { data: transacciones } = await supabase
  .from('transacciones')
  .select(`
    id, monto, categoria_id,
    categorias:categoria_id (
      id, nombre, tipo, icono_opcional
    )
  `)
  .eq('user_id', user.id)
  .gte('fecha', primerDiaDelMes)
  .lte('fecha', ultimoDiaDelMes)

// 2. PROCESAR en el frontend (agrupar por categoría)
const gastosPorCategoria = {}
transacciones.forEach((tx) => {
  const { categorias } = tx
  if (categorias.tipo === 'gasto') {
    if (!gastosPorCategoria[categorias.id]) {
      gastosPorCategoria[categorias.id] = {
        nombre: categorias.nombre,
        icono: categorias.icono_opcional,
        total: 0
      }
    }
    gastosPorCategoria[categorias.id].total += tx.monto
  }
})

// 3. RENDERIZAR
// - Pie Chart (recharts)
// - Bar Chart (recharts)
// - List con % de cada categoría
```

## 🗄️ Modelo de Datos (SQL)

```sql
-- TABLA: categorias (pública)
CREATE TABLE categorias (
  id UUID PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE,
  tipo VARCHAR(20) CHECK(tipo IN ('ingreso', 'gasto')),
  icono_opcional VARCHAR(50),
  created_at TIMESTAMP
);

-- TABLA: transacciones (privada por RLS)
CREATE TABLE transacciones (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- ← Separación por usuario
  monto DECIMAL(12,2),
  fecha TIMESTAMP,
  descripcion TEXT,
  categoria_id UUID REFERENCES categorias(id),
  created_at TIMESTAMP
);

-- ÍNDICES (para queries rápidas)
CREATE INDEX idx_transacciones_user_fecha
  ON transacciones(user_id, fecha);
```

## 🔒 Row Level Security (RLS)

```sql
-- Categorías: todos pueden LEER
CREATE POLICY "public_read_categorias"
  ON categorias FOR SELECT USING (true);

-- Transacciones: cada usuario solo ve/modifica las suyas
CREATE POLICY "select_own_transactions"
  ON transacciones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_transactions"
  ON transacciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## 🎨 Componentes Reutilizables

### ProtectedRoute.jsx
Envuelve rutas privadas. Si no hay usuario → redirige a /login

```jsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

### IngresosGastosForm.jsx
Formulario para registrar transacciones

**Entradas:**
- `onSuccess` (callback): Se ejecuta cuando se guarda una transacción

**Flujo:**
1. Carga categorías de DB
2. Usuario rellena: monto, categoría, descripción
3. Submit → INSERT en `transacciones`
4. Callback `onSuccess` → DashboardPage actualiza ReporteMensual

### ReporteMensual.jsx
**El corazón de la app.** Consulta, agrupa y visualiza

**Props:** Ninguna (usa `useAuth()` internamente)

**Métodos:**
- `fetchTransacciones()` - Query a Supabase
- Renderiza 3 vistas: Pie, Bar, List

## 🚀 Flujo de Creación de Transacción

```
Usuario escribe en IngresosGastosForm
    │
    ▼
IngresosGastosForm.handleSubmit()
    │
    ├─ Validar campos
    │
    ├─ INSERT en supabase.transacciones
    │
    └─ onSuccess() callback
        │
        ▼
    DashboardPage.handleTransactionSuccess()
        │
        └─ setRefreshKey() → re-render ReporteMensual
            │
            ▼
        ReporteMensual.useEffect() re-ejecuta
            │
            ├─ Fetch transacciones (mes actual)
            │
            ├─ Agrupar por categoría
            │
            └─ Renderizar gráficos actualizados
```

## 📦 Dependencias Principales

```json
{
  "dependencies": {
    "react": "18.x",                           // UI
    "react-dom": "18.x",                       // Render a DOM
    "react-router-dom": "6.x",                 // Routing
    "@supabase/supabase-js": "2.x",            // Backend
    "recharts": "2.x",                         // Gráficos
    "lucide-react": "0.x"                      // Iconos
  },
  "devDependencies": {
    "@vitejs/plugin-react": "4.x",             // Vite + React
    "vite": "5.x",                             // Build tool
    "tailwindcss": "3.x",                      // CSS utilities
    "postcss": "8.x",                          // CSS processing
    "autoprefixer": "10.x",                    // CSS vendor prefixes
    "gh-pages": "6.x"                          // Deploy a GH Pages
  }
}
```

## 🎯 Puntos de Extensión

Donde agregar nuevas features:

1. **Nueva categoría?**
   → Editar `SUPABASE_SETUP.sql` (tabla categorias)

2. **Nuevo tipo de gráfico?**
   → Agregar `if (viewType === 'nuevo')` en `ReporteMensual.jsx`

3. **Autenticación OAuth (Google)?**
   → Modificar `AuthContext.jsx` + Supabase settings

4. **Filtros por rango de fechas?**
   → Agregar inputs en `ReporteMensual.jsx` + ajustar query

5. **Exportar a CSV?**
   → Crear componente nuevo + usar librería como `papaparse`

6. **Predicciones IA?**
   → Agregar endpoint serverless en Supabase

## 💾 Ciclo de Guardado de Datos

```
Cliente (React)
    │
    ├─ Valida datos
    │
    ▼
Supabase Client SDK
    │
    ├─ Autentica user (JWT token)
    │
    ├─ Envía INSERT request HTTPS
    │
    ▼
Supabase Edge (RLS Checks)
    │
    ├─ Verifica: auth.uid() == user_id
    │
    ├─ Verifica constraints (monto > 0)
    │
    ▼
PostgreSQL Database
    │
    ├─ INSERT en tabla transacciones
    │
    ▼
Respuesta JSON → Cliente React
    │
    ├─ onSuccess() callback
    │
    └─ Re-render UI
```

---

**Pro Tips:**

- 🔍 Usa **DevTools de Supabase** para inspeccionar datos en tiempo real
- 📱 La app es **responsive** con Tailwind (mobile-first)
- ⚡ Los gráficos de **Recharts** son interactivos (tooltip, legend)
- 🔐 **RLS** protege datos a nivel de base de datos (seguridad en capas)
