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