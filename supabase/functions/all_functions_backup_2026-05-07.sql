| funcion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| -- ============================================
-- aceptar_solicitud
-- ============================================
CREATE OR REPLACE FUNCTION public.aceptar_solicitud(p_solicitud_id uuid, p_aceptante_id uuid, p_dia_ofrecido_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO aceptaciones (solicitud_id, aceptante_id, dia_ofrecido_id, confirmado_solicitante)
  VALUES (p_solicitud_id, p_aceptante_id, p_dia_ofrecido_id, false);
  
  UPDATE solicitudes SET estado = 'esperando_confirmacion' WHERE id = p_solicitud_id;
END;
$function$
;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -- ============================================
-- apuntarse_lista_espera
-- ============================================
CREATE OR REPLACE FUNCTION public.apuntarse_lista_espera(p_user_id uuid, p_fecha date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_dia_suelto dias_sueltos%ROWTYPE;
  v_soltante profiles%ROWTYPE;
BEGIN
  -- Comprobar si el usuario ha soltado ese día
  IF EXISTS (SELECT 1 FROM dias_sueltos WHERE user_id = p_user_id AND fecha = p_fecha AND estado = 'disponible') THEN
    RAISE EXCEPTION 'No puedes apuntarte a la lista de espera de un día que tú mismo has soltado';
  END IF;

  SELECT * INTO v_dia_suelto FROM dias_sueltos 
  WHERE fecha = p_fecha AND estado = 'disponible'
  ORDER BY created_at ASC LIMIT 1;
  
  IF v_dia_suelto.id IS NOT NULL THEN
    SELECT * INTO v_soltante FROM profiles WHERE id = v_dia_suelto.user_id;
    UPDATE dias_sueltos SET estado = 'asignado', asignado_a = p_user_id WHERE id = v_dia_suelto.id;
    
    UPDATE solicitudes SET estado = 'cancelada' 
    WHERE solicitante_id = p_user_id AND dia_pedido = p_fecha AND estado IN ('abierta', 'esperando_confirmacion');
    
    INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, referencia_id)
    VALUES (
      p_user_id, 'dia_asignado', '¡Te han asignado un día!',
      v_soltante.nombre || ' ' || v_soltante.apellidos || ' (chapa ' || v_soltante.chapa || ') tiene el ' || 
      to_char(p_fecha, 'DD/MM/YYYY') || ' disponible y es tuyo. Recuerda tramitar el cambio en la web cooperativa.',
      v_dia_suelto.id
    );
    INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, referencia_id)
    VALUES (
      v_dia_suelto.user_id, 'dia_soltado', 'Día asignado automáticamente',
      'Tu día ' || to_char(p_fecha, 'DD/MM/YYYY') || ' ha sido asignado a ' ||
      (SELECT nombre || ' ' || apellidos || ' (chapa ' || chapa || ')' FROM profiles WHERE id = p_user_id) || 
      '. Recuerda tramitar el cambio en la web cooperativa.',
      v_dia_suelto.id
    );
  ELSE
    INSERT INTO lista_espera (user_id, dia_pedido) VALUES (p_user_id, p_fecha);
  END IF;
END;
$function$
;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -- ============================================
-- buscar_cadenas
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
$function$
;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -- ============================================
-- confirmar_intercambio
-- ============================================
CREATE OR REPLACE FUNCTION public.confirmar_intercambio(p_solicitud_id uuid, p_aceptante_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_solicitud solicitudes%ROWTYPE;
  v_solicitante profiles%ROWTYPE;
  v_aceptante profiles%ROWTYPE;
  v_dia_ofrecido dias_ofrecidos%ROWTYPE;
  v_aceptacion aceptaciones%ROWTYPE;
BEGIN
  SELECT * INTO v_aceptacion FROM aceptaciones WHERE solicitud_id = p_solicitud_id LIMIT 1;
  SELECT * INTO v_solicitud FROM solicitudes WHERE id = p_solicitud_id;
  SELECT * INTO v_solicitante FROM profiles WHERE id = v_solicitud.solicitante_id;
  SELECT * INTO v_aceptante FROM profiles WHERE id = p_aceptante_id;
  SELECT * INTO v_dia_ofrecido FROM dias_ofrecidos WHERE id = v_aceptacion.dia_ofrecido_id;

  UPDATE aceptaciones SET confirmado_solicitante = true WHERE solicitud_id = p_solicitud_id;
  UPDATE solicitudes SET estado = 'completada' WHERE id = p_solicitud_id;

  -- Eliminar de lista de espera al solicitante para ese día
  DELETE FROM lista_espera WHERE user_id = v_solicitud.solicitante_id AND dia_pedido = v_solicitud.dia_pedido;
  
  -- Cancelar solicitudes del aceptante para el día que recibe
  UPDATE solicitudes SET estado = 'cancelada' 
  WHERE solicitante_id = p_aceptante_id AND dia_pedido = v_dia_ofrecido.fecha AND estado IN ('abierta', 'esperando_confirmacion');
  
  -- Eliminar de lista de espera al aceptante para ese día
  DELETE FROM lista_espera WHERE user_id = p_aceptante_id AND dia_pedido = v_dia_ofrecido.fecha;

  INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, referencia_id)
  VALUES (
    p_aceptante_id, 'completado', '¡Intercambio confirmado!',
    v_solicitante.nombre || ' ' || v_solicitante.apellidos || ' (chapa ' || v_solicitante.chapa || ') ha confirmado el intercambio. Te da el ' ||
    to_char(v_solicitud.dia_pedido, 'DD/MM/YYYY') || ' a cambio del ' ||
    to_char(v_dia_ofrecido.fecha, 'DD/MM/YYYY') || '. Recuerda tramitar el cambio en la web cooperativa.',
    p_solicitud_id
  );
END;
$function$
;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -- ============================================
-- get_user_email
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT email FROM auth.users WHERE id = p_user_id;
$function$
;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -- ============================================
-- registrar_auditoria
-- ============================================
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_chapa text;
  v_nombre text;
  v_user_id uuid;
  v_accion text;
  v_descripcion text;
BEGIN
  v_user_id := auth.uid();
  SELECT chapa, nombre || ' ' || apellidos INTO v_chapa, v_nombre
  FROM profiles WHERE id = v_user_id;

  IF TG_TABLE_NAME = 'solicitudes' THEN
    IF TG_OP = 'INSERT' THEN
      v_accion := 'solicitud_creada';
      v_descripcion := 'Solicitud del día ' || NEW.dia_pedido;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.estado = 'cancelada' THEN
        v_accion := 'solicitud_cancelada';
        v_descripcion := 'Canceló solicitud del día ' || NEW.dia_pedido;
      ELSIF NEW.estado = 'completada' THEN
        v_accion := 'intercambio_confirmado';
        v_descripcion := 'Intercambio confirmado para el día ' || NEW.dia_pedido;
      ELSIF NEW.estado = 'esperando_confirmacion' THEN
        v_accion := 'intercambio_aceptado';
        v_descripcion := 'Intercambio aceptado para el día ' || NEW.dia_pedido;
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'dias_sueltos' THEN
    IF TG_OP = 'INSERT' THEN
      v_accion := 'dia_soltado';
      v_descripcion := 'Soltó el día ' || NEW.fecha;
    ELSIF TG_OP = 'UPDATE' AND NEW.asignado_a IS NOT NULL AND OLD.asignado_a IS NULL THEN
      v_accion := 'dia_asignado';
      v_descripcion := 'Día ' || NEW.fecha || ' asignado automáticamente';
    END IF;

  ELSIF TG_TABLE_NAME = 'lista_espera' THEN
    IF TG_OP = 'INSERT' THEN
      v_accion := 'lista_espera_entrada';
      v_descripcion := 'Se apuntó a la lista de espera del día ' || NEW.dia_pedido;
    ELSIF TG_OP = 'DELETE' THEN
      v_accion := 'lista_espera_salida';
      v_descripcion := 'Salió de la lista de espera del día ' || OLD.dia_pedido;
      v_user_id := OLD.user_id;
      SELECT chapa, nombre || ' ' || apellidos INTO v_chapa, v_nombre FROM profiles WHERE id = OLD.user_id;
    END IF;

  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF TG_OP = 'INSERT' THEN
      v_accion := 'usuario_registrado';
      v_descripcion := 'Nuevo registro: ' || NEW.nombre || ' ' || NEW.apellidos || ' (chapa ' || NEW.chapa || ')';
      v_user_id := NEW.id;
      v_chapa := NEW.chapa;
      v_nombre := NEW.nombre || ' ' || NEW.apellidos;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.aprobado = false AND NEW.aprobado = true THEN
        v_accion := 'usuario_aprobado';
        v_descripcion := 'Usuario aprobado: ' || NEW.nombre || ' ' || NEW.apellidos || ' (chapa ' || NEW.chapa || ')';
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      v_accion := 'usuario_eliminado';
      v_descripcion := 'Usuario eliminado: ' || OLD.nombre || ' ' || OLD.apellidos || ' (chapa ' || OLD.chapa || ')';
      v_user_id := OLD.id;
      v_chapa := OLD.chapa;
      v_nombre := OLD.nombre || ' ' || OLD.apellidos;
    END IF;

  END IF;

  IF v_accion IS NOT NULL THEN
    INSERT INTO auditoria (user_id, user_chapa, user_nombre, accion, tabla, descripcion, datos)
    VALUES (
      v_user_id, v_chapa, v_nombre, v_accion, TG_TABLE_NAME,
      v_descripcion,
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;
 |
| -- ============================================
-- soltar_dia
-- ============================================
CREATE OR REPLACE FUNCTION public.soltar_dia(p_user_id uuid, p_fecha date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
  v_primero lista_espera%ROWTYPE;
  v_soltante profiles%ROWTYPE;
  v_dia_suelto dias_sueltos%ROWTYPE;
BEGIN
  -- VALIDACIÓN 1: No puedes soltar un día si estás en su lista de espera
  IF EXISTS (
    SELECT 1 FROM lista_espera 
    WHERE user_id = p_user_id AND dia_pedido = p_fecha
  ) THEN
    RAISE EXCEPTION 'No puedes soltar un día en el que estás apuntado a la lista de espera. Quítate de la lista primero.';
  END IF;

  -- VALIDACIÓN 2: No puedes soltar un día que ya tienes soltado
  IF EXISTS (
    SELECT 1 FROM dias_sueltos 
    WHERE user_id = p_user_id AND fecha = p_fecha AND estado IN ('disponible', 'asignado')
  ) THEN
    RAISE EXCEPTION 'Ya has soltado este día anteriormente.';
  END IF;

  SELECT * INTO v_soltante FROM profiles WHERE id = p_user_id;
  
  INSERT INTO dias_sueltos (user_id, fecha) VALUES (p_user_id, p_fecha)
  RETURNING * INTO v_dia_suelto;
  
  SELECT * INTO v_primero FROM lista_espera 
  WHERE dia_pedido = p_fecha 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF v_primero.id IS NOT NULL THEN
    UPDATE dias_sueltos SET estado = 'asignado', asignado_a = v_primero.user_id WHERE id = v_dia_suelto.id;
    DELETE FROM lista_espera WHERE id = v_primero.id;
    
    UPDATE solicitudes SET estado = 'cancelada' 
    WHERE solicitante_id = v_primero.user_id AND dia_pedido = p_fecha AND estado IN ('abierta', 'esperando_confirmacion');
    
    INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, referencia_id)
    VALUES (
      v_primero.user_id, 'dia_asignado', '¡Te han asignado un día!',
      v_soltante.nombre || ' ' || v_soltante.apellidos || ' (chapa ' || v_soltante.chapa || ') te ha soltado el ' || 
      to_char(p_fecha, 'DD/MM/YYYY') || '. ¡Es tuyo! Recuerda tramitar el cambio en la web cooperativa.',
      v_dia_suelto.id
    );
    INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, referencia_id)
    VALUES (
      p_user_id, 'dia_soltado', 'Día asignado automáticamente',
      'Tu día ' || to_char(p_fecha, 'DD/MM/YYYY') || ' ha sido asignado a ' ||
      (SELECT nombre || ' ' || apellidos || ' (chapa ' || chapa || ')' FROM profiles WHERE id = v_primero.user_id) || 
      '. Recuerda tramitar el cambio en la web cooperativa.',
      v_dia_suelto.id
    );
  END IF;
END;$function$
;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -- ============================================
-- update_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |