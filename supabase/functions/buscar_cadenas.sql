-- ============================================
-- buscar_cadenas
-- Detecta ciclos de intercambio de 3 usuarios.
-- Versión corregida 2026-05-07: cambiada la 
-- condición de deduplicación de "p1.id < p2.id 
-- AND p2.id < p3.id" a "p1.id = LEAST(...)"
-- para permitir rotaciones del ciclo.
-- ============================================
CREATE OR REPLACE FUNCTION public.buscar_cadenas()
 RETURNS TABLE(solicitud1_id uuid, solicitud2_id uuid, solicitud3_id uuid, usuario1_id uuid, usuario1_nombre text, usuario1_chapa text, dia_que_pide1 date, dia_que_da1 date, usuario2_id uuid, usuario2_nombre text, usuario2_chapa text, dia_que_pide2 date, dia_que_da2 date, usuario3_id uuid, usuario3_nombre text, usuario3_chapa text, dia_que_pide3 date, dia_que_da3 date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    s1.id::UUID, s2.id::UUID, s3.id::UUID,
    p1.id::UUID, (p1.nombre || ' ' || p1.apellidos)::TEXT, p1.chapa::TEXT,
    s1.dia_pedido::DATE, d1.fecha::DATE,
    p2.id::UUID, (p2.nombre || ' ' || p2.apellidos)::TEXT, p2.chapa::TEXT,
    s2.dia_pedido::DATE, d2.fecha::DATE,
    p3.id::UUID, (p3.nombre || ' ' || p3.apellidos)::TEXT, p3.chapa::TEXT,
    s3.dia_pedido::DATE, d3.fecha::DATE
  FROM solicitudes s1
  JOIN dias_ofrecidos d1 ON d1.solicitud_id = s1.id
  JOIN solicitudes s2 ON s2.dia_pedido = d1.fecha AND s2.solicitante_id != s1.solicitante_id
  JOIN dias_ofrecidos d2 ON d2.solicitud_id = s2.id
  JOIN solicitudes s3 ON s3.dia_pedido = d2.fecha AND s3.solicitante_id != s1.solicitante_id AND s3.solicitante_id != s2.solicitante_id
  JOIN dias_ofrecidos d3 ON d3.solicitud_id = s3.id AND d3.fecha = s1.dia_pedido
  JOIN profiles p1 ON p1.id = s1.solicitante_id
  JOIN profiles p2 ON p2.id = s2.solicitante_id
  JOIN profiles p3 ON p3.id = s3.solicitante_id
  WHERE s1.estado = 'abierta' AND s2.estado = 'abierta' AND s3.estado = 'abierta'
  AND s1.solicitante_id != s3.solicitante_id
  AND p1.id = LEAST(p1.id, p2.id, p3.id);
END;
$function$;