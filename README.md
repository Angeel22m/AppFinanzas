# 💰 Mi Finanzas - App de Gestión de Finanzas Personales

Una SPA moderna construida con React, Vite, Tailwind CSS y Supabase para gestionar tus gastos e ingresos personales.

## 🎯 Características

- ✅ **Autenticación Segura** - Login/Registro con Supabase Auth
- ✅ **Registro de Transacciones** - Ingresa fácilmente gastos e ingresos
- ✅ **Categorización** - Clasifica tus gastos por categoría predefinida
- ✅ **Reportes Mensuales** - Visualiza tus gastos con gráficos interactivos
- ✅ **3 Vistas de Datos** - Gráfico circular, barras y listado
- ✅ **Saldo Actual** - Monitorea tu saldo en tiempo real
- ✅ **RLS + Seguridad** - Cada usuario solo ve sus datos

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 + Vite
- **Estilos:** Tailwind CSS
- **Base de Datos:** PostgreSQL (Supabase)
- **Gráficos:** Recharts
- **Autenticación:** Supabase Auth
- **Despliegue:** GitHub Pages

## 📋 Requisitos Previos

- Node.js >= 16
- npm o yarn
- Cuenta de Supabase (gratis en https://supabase.com)
- Git

## 🚀 Instalación y Setup

### 1. Crear proyecto en Supabase

1. Ve a https://supabase.com y crea una nueva cuenta
2. Crea un nuevo proyecto (elige una región cercana)
3. Espera a que esté listo
4. En la sección de **SQL Editor**, copia el contenido de `SUPABASE_SETUP.sql` y ejecuta

```sql
-- ===========================
-- TABLAS Y CONFIGURACIÓN
-- ===========================

-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
  icono_opcional VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de transacciones
CREATE TABLE IF NOT EXISTS transacciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monto DECIMAL(12, 2) NOT NULL,
  fecha TIMESTAMP NOT NULL,
  descripcion TEXT,
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT monto_positivo CHECK (monto > 0)
);

-- ===========================
-- ÍNDICES PARA PERFORMANCE
-- ===========================

CREATE INDEX idx_transacciones_user_id ON transacciones(user_id);
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha);
CREATE INDEX idx_transacciones_categoria_id ON transacciones(categoria_id);
CREATE INDEX idx_transacciones_user_fecha ON transacciones(user_id, fecha);

-- ===========================
-- ROW LEVEL SECURITY (RLS)
-- ===========================

-- Habilitar RLS en ambas tablas
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;

-- Políticas para CATEGORÍAS (cualquier usuario autenticado puede leer)
CREATE POLICY "Cualquier usuario autenticado puede ver categorías"
  ON categorias FOR SELECT
  USING (auth.role() = 'authenticated');

-- Políticas para TRANSACCIONES
-- Solo el propietario puede ver sus transacciones
CREATE POLICY "Los usuarios solo ven sus propias transacciones"
  ON transacciones FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el propietario puede crear transacciones
CREATE POLICY "Los usuarios solo crean transacciones propias"
  ON transacciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo el propietario puede actualizar sus transacciones
CREATE POLICY "Los usuarios solo actualizan sus propias transacciones"
  ON transacciones FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Solo el propietario puede eliminar sus transacciones
CREATE POLICY "Los usuarios solo eliminan sus propias transacciones"
  ON transacciones FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================
-- DATOS INICIALES
-- ===========================

-- Insertar categorías por defecto
INSERT INTO categorias (nombre, tipo, icono_opcional) VALUES
  ('Capital Inicial', 'ingreso', '💰'),
  ('Salario', 'ingreso', '💼'),
  ('Bonificación', 'ingreso', '🎁'),
  ('Otros Ingresos', 'ingreso', '➕'),

  ('Comida', 'gasto', '🍔'),
  ('Transporte', 'gasto', '🚗'),
  ('Entretenimiento', 'gasto', '🎮'),
  ('Hobby', 'gasto', '🎨'),
  ('Juegos', 'gasto', '🎯'),
  ('Uso Personal', 'gasto', '👕'),
  ('Salud', 'gasto', '⚕️'),
  ('Educación', 'gasto', '📚'),
  ('Servicios', 'gasto', '📱'),
  ('Otros Gastos', 'gasto', '➖')
ON CONFLICT (nombre) DO NOTHING;

-- ===========================
-- VISTAS ÚTILES (OPCIONAL)
-- ===========================

-- Vista para resumen mensual (útil para reportes)
CREATE OR REPLACE VIEW transacciones_resumen_mensual AS
SELECT
  DATE_TRUNC('month', t.fecha)::DATE as mes,
  t.user_id,
  c.nombre as categoria,
  c.tipo,
  SUM(t.monto) as total,
  COUNT(*) as cantidad_transacciones
FROM transacciones t
JOIN categorias c ON t.categoria_id = c.id
GROUP BY DATE_TRUNC('month', t.fecha), t.user_id, c.nombre, c.tipo;

-- Vista para saldo actual del usuario
CREATE OR REPLACE VIEW saldo_usuario AS
SELECT
  t.user_id,
  COALESCE(SUM(CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE 0 END), 0) as total_ingresos,
  COALESCE(SUM(CASE WHEN c.tipo = 'gasto' THEN t.monto ELSE 0 END), 0) as total_gastos,
  COALESCE(SUM(CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE -t.monto END), 0) as saldo_actual
FROM transacciones t
JOIN categorias c ON t.categoria_id = c.id
GROUP BY t.user_id;

-- ===========================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ===========================

COMMENT ON TABLE categorias IS 'Categorías predefinidas para clasificar ingresos y gastos';
COMMENT ON TABLE transacciones IS 'Registro de todas las transacciones (ingresos y gastos) de los usuarios';
COMMENT ON COLUMN transacciones.monto IS 'Cantidad en valor positivo (la clasificación ingreso/gasto viene de la categoría)';
COMMENT ON COLUMN transacciones.user_id IS 'Referencia al usuario propietario de la transacción (RLS aplica)';


-- 1. Recrear la vista de resumen mensual con el invoker seguro
CREATE OR REPLACE VIEW transacciones_resumen_mensual 
WITH (security_invoker = true) AS
SELECT
  DATE_TRUNC('month', t.fecha)::DATE as mes,
  t.user_id,
  c.nombre as categoria,
  c.tipo,
  SUM(t.monto) as total,
  COUNT(*) as cantidad_transacciones
FROM transacciones t
JOIN categorias c ON t.categoria_id = c.id
GROUP BY DATE_TRUNC('month', t.fecha), t.user_id, c.nombre, c.tipo;

-- 2. Recrear la vista de saldo del usuario con el invoker seguro
CREATE OR REPLACE VIEW saldo_usuario 
WITH (security_invoker = true) AS
SELECT
  t.user_id,
  COALESCE(SUM(CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE 0 END), 0) as total_ingresos,
  COALESCE(SUM(CASE WHEN c.tipo = 'gasto' THEN t.monto ELSE 0 END), 0) as total_gastos,
  COALESCE(SUM(CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE -t.monto END), 0) as saldo_actual
FROM transacciones t
JOIN categorias c ON t.categoria_id = c.id
GROUP BY t.user_id;
```

### 2. Obtener credenciales de Supabase

1. Ve a **Settings → API**
2. Copia estos valores:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Instalar dependencias

```bash
npm install
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La app abrirá en http://localhost:5173

## 📁 Estructura del Proyecto

```
finanzas-app/
├── src/
│   ├── components/
│   │   ├── IngresosGastosForm.jsx    # Formulario para registrar transacciones
│   │   ├── ReporteMensual.jsx        # Core: Reportes con gráficos
│   │   └── ProtectedRoute.jsx        # Wrapper para rutas privadas
│   ├── context/
│   │   └── AuthContext.jsx           # Proveedor de autenticación
│   ├── hooks/
│   │   └── useAuth.js                # Custom hook para acceder a auth
│   ├── lib/
│   │   └── supabase.js               # Cliente de Supabase
│   ├── pages/
│   │   ├── AuthPage.jsx              # Login/Registro
│   │   └── DashboardPage.jsx         # Dashboard principal
│   ├── App.jsx                       # Router y setup principal
│   ├── main.jsx                      # Punto de entrada React
│   └── index.css                     # Estilos globales
├── public/                           # Archivos estáticos
├── SUPABASE_SETUP.sql               # Script SQL para Supabase
├── .env.example                      # Plantilla de variables
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 🔐 Modelo de Datos

### Tabla: `categorias`
```
id (UUID, PK)
nombre (VARCHAR, UNIQUE)
tipo (VARCHAR: 'ingreso' o 'gasto')
icono_opcional (VARCHAR)
created_at (TIMESTAMP)
```

**Categorías por defecto:**
- **Ingresos:** Capital Inicial, Salario, Bonificación, Otros Ingresos
- **Gastos:** Comida, Transporte, Entretenimiento, Hobby, Juegos, Uso Personal, Salud, Educación, Servicios, Otros Gastos

### Tabla: `transacciones`
```
id (UUID, PK)
user_id (UUID, FK → auth.users)
monto (DECIMAL 12,2)
fecha (TIMESTAMP)
descripcion (TEXT, opcional)
categoria_id (UUID, FK → categorias)
created_at (TIMESTAMP)
```

## 🔒 Seguridad - Row Level Security (RLS)

Todas las transacciones están protegidas por RLS. Cada usuario:
- ✅ Solo puede VER sus propias transacciones
- ✅ Solo puede CREAR transacciones propias
- ✅ Solo puede ACTUALIZAR/ELIMINAR sus transacciones
- ✅ Las categorías son públicas (de lectura)

## 💡 Flujo Principal

1. **Autenticación:** Usuario se registra/inicia sesión
2. **Ingreso Rápido:** Registra gastos diarios en el formulario lateral
3. **Reporte:** Ve análisis mensuales con:
   - Saldo actual (ingresos - gastos)
   - Gráfico circular/barras de gastos por categoría
   - Listado ordenado por categoría

## 🎨 Componentes Clave

### ReporteMensual.jsx
**Core de la aplicación.** Características:

```jsx
// Agrupa transacciones por categoría del mes actual
const gastosPorCategoria = {}
transacciones.forEach((tx) => {
  const categoria = tx.categorias
  if (categoria.tipo !== 'ingreso') {
    gastosPorCategoria[categoria.id] = {
      nombre: categoria.nombre,
      total: total += tx.monto
    }
  }
})

// 3 vistas:
// - Pie Chart (Recharts)
// - Bar Chart (Recharts)
// - Lista con porcentajes
```

Lógica de consulta en Supabase:
- Obtiene transacciones del mes actual
- Agrupa por `categoria_id`
- Filtra por tipo (ingreso vs gasto)
- Calcula totales y porcentajes

## 📦 Build y Deploy

### Build para producción
```bash
npm run build
```

### Deploy a GitHub Pages
```bash
npm run deploy
```

(Requiere configurar `gh-pages` en package.json y permisos de GitHub)

## 🐛 Troubleshooting

### Error: "Variables de entorno no configuradas"
→ Copia `.env.example` a `.env.local` y llena tus credenciales de Supabase

### Error: "RLS Policy denied"
→ Verifica que ejecutaste el script `SUPABASE_SETUP.sql` en Supabase

### Transacciones no aparecen
→ Confirma estar bajo el usuario correcto y revisar fecha/filtros

### Gráfico vacío
→ Registra gastos y presiona "Actualizar Reporte"

## 📚 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [React Router](https://reactrouter.com/)
- [Recharts](https://recharts.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

## 📝 Notas de Desarrollo

- Las categorías vienen precargadas desde la DB (tabla `categorias`)
- El mes actual se calcula automáticamente
- Los gráficos son interactivos (hover, click)
- La app es responsive (mobile-first)

## 📄 Licencia

MIT - Libre para usar y modificar

## 👨‍💻 Autor

Creado como template educativo para gestión de finanzas personales.

---

**¿Dudas o sugerencias?** Revisa el código en los componentes, especialmente `ReporteMensual.jsx` y `AuthContext.jsx`.
