-- REINICIO: elimina los datos financieros anteriores. Conserva auth.users.
BEGIN;
DROP VIEW IF EXISTS public.transacciones_resumen_mensual;
DROP VIEW IF EXISTS public.saldo_usuario;
DROP FUNCTION IF EXISTS public.abrir_mes_financiero();
DROP FUNCTION IF EXISTS public.configurar_finanzas(numeric, numeric);
DROP TABLE IF EXISTS public.gastos_presupuesto;
DROP TABLE IF EXISTS public.secciones_presupuesto;
DROP TABLE IF EXISTS public.meses_financieros;
DROP TABLE IF EXISTS public.configuracion_financiera;
DROP TABLE IF EXISTS public.transacciones;
DROP TABLE IF EXISTS public.categorias;

CREATE TABLE public.configuracion_financiera (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 ingreso_mensual numeric(12,2) NOT NULL CHECK (ingreso_mensual >= 0 AND ingreso_mensual < 1000000000),
 capital_inicial numeric(12,2) NOT NULL DEFAULT 0 CHECK (capital_inicial >= 0 AND capital_inicial < 1000000000)
);
CREATE TABLE public.meses_financieros (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.configuracion_financiera(user_id) ON DELETE CASCADE,
 mes date NOT NULL CHECK (extract(day FROM mes) = 1),
 ingreso numeric(12,2) NOT NULL CHECK (ingreso >= 0 AND ingreso < 1000000000),
 UNIQUE(user_id, mes), UNIQUE(id, user_id)
);
-- Asignar dinero a una secciÃ³n no lo descuenta del total; gastarlo sÃ­.
CREATE TABLE public.secciones_presupuesto (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(), mes_id uuid NOT NULL,
 nombre text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 100),
 asignado numeric(12,2) NOT NULL DEFAULT 0 CHECK (asignado >= 0 AND asignado < 1000000000),
 FOREIGN KEY(mes_id, user_id) REFERENCES public.meses_financieros(id, user_id) ON DELETE CASCADE,
 UNIQUE(id, mes_id, user_id)
);
CREATE TABLE public.gastos_presupuesto (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(), mes_id uuid NOT NULL, seccion_id uuid NOT NULL,
 nombre text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 100),
 monto numeric(12,2) NOT NULL CHECK (monto >= 0 AND monto < 1000000000),
 monto_recurrente numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto_recurrente >= 0 AND monto_recurrente < 1000000000),
 tipo text NOT NULL CHECK (tipo IN ('fijo', 'extra')),
 CHECK (tipo = 'fijo' OR (monto > 0 AND monto_recurrente = 0)),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(seccion_id, mes_id, user_id) REFERENCES public.secciones_presupuesto(id, mes_id, user_id) ON DELETE CASCADE
);
CREATE INDEX gastos_presupuesto_mes ON public.gastos_presupuesto(user_id, mes_id);
CREATE INDEX secciones_presupuesto_mes ON public.secciones_presupuesto(user_id, mes_id);
ALTER TABLE public.configuracion_financiera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meses_financieros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secciones_presupuesto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_presupuesto ENABLE ROW LEVEL SECURITY;
CREATE POLICY propietario_config ON public.configuracion_financiera FOR SELECT TO authenticated USING(user_id = auth.uid());
CREATE POLICY propietario_meses ON public.meses_financieros FOR SELECT TO authenticated USING(user_id = auth.uid());
CREATE POLICY propietario_secciones_lectura ON public.secciones_presupuesto FOR SELECT TO authenticated USING(user_id = auth.uid());
CREATE POLICY propietario_gastos_lectura ON public.gastos_presupuesto FOR SELECT TO authenticated USING(user_id = auth.uid());
-- Los meses anteriores se pueden consultar, pero solo se edita el actual.
CREATE POLICY propietario_secciones_escritura ON public.secciones_presupuesto FOR ALL TO authenticated
 USING(user_id = auth.uid() AND EXISTS(SELECT 1 FROM public.meses_financieros m WHERE m.id = mes_id AND m.mes = date_trunc('month', timezone('America/Guatemala', now()))::date))
 WITH CHECK(user_id = auth.uid() AND EXISTS(SELECT 1 FROM public.meses_financieros m WHERE m.id = mes_id AND m.mes = date_trunc('month', timezone('America/Guatemala', now()))::date));
CREATE POLICY propietario_gastos_escritura ON public.gastos_presupuesto FOR ALL TO authenticated
 USING(user_id = auth.uid() AND EXISTS(SELECT 1 FROM public.meses_financieros m WHERE m.id = mes_id AND m.mes = date_trunc('month', timezone('America/Guatemala', now()))::date))
 WITH CHECK(user_id = auth.uid() AND EXISTS(SELECT 1 FROM public.meses_financieros m WHERE m.id = mes_id AND m.mes = date_trunc('month', timezone('America/Guatemala', now()))::date));

-- Materializa una sola vez cada mes pendiente al entrar en la app.
-- Repite ingreso, secciones y fijos. Los extras nunca se repiten.
CREATE FUNCTION public.abrir_mes_financiero() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 usuario uuid := auth.uid();
 actual date := date_trunc('month', timezone('America/Guatemala', now()))::date;
 anterior public.meses_financieros%ROWTYPE;
 nuevo uuid; nueva_seccion uuid; seccion record; ingreso_base numeric;
BEGIN
 IF usuario IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesiÃ³n'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(usuario::text, 0));
 SELECT ingreso_mensual INTO ingreso_base FROM public.configuracion_financiera WHERE user_id = usuario;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO anterior FROM public.meses_financieros WHERE user_id = usuario ORDER BY mes DESC LIMIT 1;
 IF NOT FOUND THEN
  INSERT INTO public.meses_financieros(user_id,mes,ingreso) VALUES(usuario,actual,ingreso_base) RETURNING id INTO nuevo;
  RETURN nuevo;
 END IF;
 WHILE anterior.mes < actual LOOP
  INSERT INTO public.meses_financieros(user_id,mes,ingreso) VALUES(usuario,(anterior.mes + interval '1 month')::date,ingreso_base) RETURNING id INTO nuevo;
  FOR seccion IN SELECT * FROM public.secciones_presupuesto WHERE mes_id = anterior.id AND user_id = usuario LOOP
   INSERT INTO public.secciones_presupuesto(user_id,mes_id,nombre,asignado) VALUES(usuario,nuevo,seccion.nombre,seccion.asignado) RETURNING id INTO nueva_seccion;
   INSERT INTO public.gastos_presupuesto(user_id,mes_id,seccion_id,nombre,monto,monto_recurrente,tipo)
    SELECT usuario,nuevo,nueva_seccion,nombre,monto_recurrente,monto_recurrente,'fijo' FROM public.gastos_presupuesto WHERE seccion_id = seccion.id AND user_id = usuario AND tipo = 'fijo' AND monto_recurrente > 0;
  END LOOP;
  SELECT * INTO anterior FROM public.meses_financieros WHERE id = nuevo;
 END LOOP;
 RETURN anterior.id;
END;
$$;

CREATE FUNCTION public.configurar_finanzas(p_ingreso numeric, p_capital numeric DEFAULT 0) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE usuario uuid := auth.uid(); actual_id uuid;
BEGIN
 IF usuario IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesiÃ³n'; END IF;
 IF p_ingreso IS NULL OR p_capital IS NULL OR p_ingreso < 0 OR p_capital < 0 OR p_ingreso >= 1000000000 OR p_capital >= 1000000000 OR p_ingreso <> round(p_ingreso,2) OR p_capital <> round(p_capital,2) THEN
  RAISE EXCEPTION 'Importes invÃ¡lidos: usa valores positivos o cero con dos decimales';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(usuario::text, 0));
 -- Abre los meses faltantes con la configuraciÃ³n anterior antes de cambiarla.
 actual_id := public.abrir_mes_financiero();
 INSERT INTO public.configuracion_financiera(user_id,ingreso_mensual,capital_inicial) VALUES(usuario,p_ingreso,p_capital)
 ON CONFLICT(user_id) DO UPDATE SET ingreso_mensual = excluded.ingreso_mensual;
 IF actual_id IS NULL THEN actual_id := public.abrir_mes_financiero(); END IF;
 UPDATE public.meses_financieros SET ingreso = p_ingreso WHERE id = actual_id AND user_id = usuario;
 RETURN actual_id;
END;
$$;
REVOKE ALL ON FUNCTION public.abrir_mes_financiero() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.configurar_finanzas(numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abrir_mes_financiero() TO authenticated;
GRANT EXECUTE ON FUNCTION public.configurar_finanzas(numeric,numeric) TO authenticated;
REVOKE ALL ON public.configuracion_financiera,public.meses_financieros,public.secciones_presupuesto,public.gastos_presupuesto FROM anon,authenticated;
GRANT SELECT ON public.configuracion_financiera,public.meses_financieros TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.secciones_presupuesto,public.gastos_presupuesto TO authenticated;
COMMIT;
