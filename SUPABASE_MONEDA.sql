-- Preferencia de visualizacion por usuario. No convierte ni modifica importes.
BEGIN;
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
