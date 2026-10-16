-- ACTUALIZACION desde el presupuesto con gastos anidados. No reinicia cuentas ni meses.
-- Las secciones actuales sin fijos internos pasan a descontar su propio monto.
-- Si habia fijos internos, se suman en el monto de su seccion; no se duplican.
-- Los extras se conservan aparte. Los saldos de meses anteriores se conservan.
BEGIN;
LOCK TABLE public.secciones_presupuesto, public.gastos_presupuesto IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='secciones_presupuesto' AND column_name='asignado') THEN
  ALTER TABLE public.secciones_presupuesto ADD COLUMN monto_recurrente numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto_recurrente >= 0 AND monto_recurrente < 1000000000);
  UPDATE public.secciones_presupuesto s SET monto_recurrente = coalesce(
   (SELECT sum(g.monto_recurrente) FROM public.gastos_presupuesto g WHERE g.seccion_id=s.id AND g.tipo='fijo'), s.asignado);
  UPDATE public.secciones_presupuesto s SET asignado = coalesce(
   (SELECT sum(g.monto) FROM public.gastos_presupuesto g WHERE g.seccion_id=s.id AND g.tipo='fijo'),
   CASE WHEN EXISTS (SELECT 1 FROM public.meses_financieros m WHERE m.id=s.mes_id AND m.mes=date_trunc('month',timezone('America/Guatemala',now()))::date) THEN s.asignado ELSE 0 END);
  ALTER TABLE public.secciones_presupuesto RENAME COLUMN asignado TO monto;
  -- Los fijos anteriores quedan consolidados en su seccion.
  DELETE FROM public.gastos_presupuesto WHERE tipo='fijo';
  ALTER TABLE public.gastos_presupuesto DROP COLUMN seccion_id;
  ALTER TABLE public.gastos_presupuesto DROP COLUMN tipo;
  ALTER TABLE public.gastos_presupuesto DROP COLUMN monto_recurrente;
  ALTER TABLE public.gastos_presupuesto ADD CONSTRAINT gastos_mes_propietario_fk
   FOREIGN KEY(mes_id,user_id) REFERENCES public.meses_financieros(id,user_id) ON DELETE CASCADE;
  ALTER TABLE public.gastos_presupuesto ADD CONSTRAINT gasto_extra_positivo CHECK(monto > 0);
 END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.abrir_mes_financiero() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 usuario uuid := auth.uid();
 actual date := date_trunc('month', timezone('America/Guatemala', now()))::date;
 anterior public.meses_financieros%ROWTYPE;
 nuevo uuid; ingreso_base numeric;
BEGIN
 IF usuario IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión'; END IF;
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
  INSERT INTO public.secciones_presupuesto(user_id,mes_id,nombre,monto,monto_recurrente)
   SELECT usuario,nuevo,nombre,monto_recurrente,monto_recurrente
   FROM public.secciones_presupuesto WHERE mes_id = anterior.id AND user_id = usuario AND monto_recurrente > 0;
  SELECT * INTO anterior FROM public.meses_financieros WHERE id = nuevo;
 END LOOP;
 RETURN anterior.id;
END;
$$;


NOTIFY pgrst, 'reload schema';
ALTER TABLE public.configuracion_financiera ADD COLUMN IF NOT EXISTS moneda text NOT NULL DEFAULT 'HNL'
 CHECK (moneda IN ('HNL','USD','GTQ','EUR','MXN','CRC','NIO'));
ALTER TABLE public.configuracion_financiera ADD COLUMN IF NOT EXISTS formato_moneda text NOT NULL DEFAULT 'simbolo'
 CHECK (formato_moneda IN ('simbolo','codigo'));

CREATE OR REPLACE FUNCTION public.configurar_presupuesto(p_ingreso numeric,p_capital numeric,p_moneda text,p_formato text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE usuario uuid := auth.uid(); mes_actual uuid;
BEGIN
 IF usuario IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesion'; END IF;
 IF p_moneda IS NULL OR p_moneda NOT IN ('HNL','USD','GTQ','EUR','MXN','CRC','NIO')
 OR p_formato IS NULL OR p_formato NOT IN ('simbolo','codigo') THEN
  RAISE EXCEPTION 'Moneda o formato no admitido';
 END IF;
 mes_actual := public.configurar_finanzas(p_ingreso,p_capital);
 UPDATE public.configuracion_financiera SET moneda=p_moneda,formato_moneda=p_formato WHERE user_id=usuario;
 RETURN mes_actual;
END;
$$;
REVOKE ALL ON FUNCTION public.configurar_presupuesto(numeric,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configurar_presupuesto(numeric,numeric,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
