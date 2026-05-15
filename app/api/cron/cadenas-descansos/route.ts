import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmail, templateNotificacion } from '@/lib/email'

export const dynamic = 'force-dynamic'

const fmt = (f: string) => f ? f.split('-').reverse().join('/') : ''

const waBtn = (tel: string, nombre: string) =>
  `<a href="https://wa.me/34${tel.replace(/\s/g,'')}" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin:4px 0">
    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="18" height="18" style="vertical-align:middle"/> Contactar con ${nombre}
  </a>`

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // ─── 1. CANCELAR CADENAS VENCIDAS ───────────────────────────────────────
    const { data: cadenasVencidas } = await supabase
      .from('cadenas_intercambio')
      .select('*')
      .eq('estado', 'pendiente')
      .lt('expira_at', new Date().toISOString())

    for (const cadena of cadenasVencidas || []) {
      // Cancelar la cadena
      await supabase
        .from('cadenas_intercambio')
        .update({ estado: 'cancelada' })
        .eq('id', cadena.id)

      // Liberar las solicitudes (vuelven a 'abierta')
      const ids = [cadena.solicitud1_id, cadena.solicitud2_id, cadena.solicitud3_id, cadena.solicitud4_id].filter(Boolean)
      await supabase
        .from('solicitudes')
        .update({ estado: 'abierta' })
        .in('id', ids)
        .eq('estado', 'en_cadena')

      // Notificar a los participantes
      const participantes = [cadena.usuario1_id, cadena.usuario2_id, cadena.usuario3_id, cadena.usuario4_id].filter(Boolean)
      for (const uid of participantes) {
        await supabase.from('notificaciones').insert({
          user_id: uid,
          tipo: 'cadena',
          titulo: '❌ Cadena de descansos cancelada',
          mensaje: 'La cadena ha sido cancelada porque no todos confirmaron en 3 días. Tus solicitudes han vuelto a estar disponibles.',
          leida: false
        })
        const { data: email } = await supabase.rpc('get_user_email', { p_user_id: uid })
        if (email) {
          await enviarEmail(
            email,
            '❌ Cadena de descansos cancelada - DescansApp',
            templateNotificacion(
              'Cadena de descansos cancelada',
              'La cadena de descansos en la que participabas ha sido cancelada porque no todos los participantes confirmaron en el plazo de 3 días.<br><br>Tus solicitudes han vuelto a estar disponibles.'
            )
          )
        }
      }
    }

    // ─── 2. RECORDATORIOS A LOS QUE NO HAN CONFIRMADO ──────────────────────
    const { data: cadenasPendientes } = await supabase
      .from('cadenas_intercambio')
      .select(`
        *,
        p1:usuario1_id(nombre, apellidos, telefono),
        p2:usuario2_id(nombre, apellidos, telefono),
        p3:usuario3_id(nombre, apellidos, telefono),
        p4:usuario4_id(nombre, apellidos, telefono),
        s1:solicitud1_id(dia_pedido),
        s2:solicitud2_id(dia_pedido),
        s3:solicitud3_id(dia_pedido),
        s4:solicitud4_id(dia_pedido)
      `)
      .eq('estado', 'pendiente')
      .gte('expira_at', new Date().toISOString())

    for (const cadena of cadenasPendientes || []) {
      const diasRestantes = Math.ceil((new Date(cadena.expira_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      const participantes = [
        { uid: cadena.usuario1_id, perfil: cadena.p1, sol: cadena.s1, confirmado: cadena.confirmado1 },
        { uid: cadena.usuario2_id, perfil: cadena.p2, sol: cadena.s2, confirmado: cadena.confirmado2 },
        { uid: cadena.usuario3_id, perfil: cadena.p3, sol: cadena.s3, confirmado: cadena.confirmado3 },
        cadena.tipo === 4 ? { uid: cadena.usuario4_id, perfil: cadena.p4, sol: cadena.s4, confirmado: cadena.confirmado4 } : null,
      ].filter(Boolean) as any[]

      // Enviar recordatorio solo a los que NO han confirmado aún
      for (let i = 0; i < participantes.length; i++) {
        const p = participantes[i]
        if (p.confirmado) continue

        const { data: email } = await supabase.rpc('get_user_email', { p_user_id: p.uid })
        if (!email) continue

        const miSiguiente = participantes[(i + 1) % participantes.length]
        const queriaDia = fmt(p.sol?.dia_pedido)
        const dabaDia = fmt(miSiguiente?.sol?.dia_pedido)

        // Bloque de otros participantes con WhatsApp
        const otrosWa = participantes
          .filter((_: any, idx: number) => idx !== i)
          .map((o: any) => {
            const nombreCompleto = `${o.perfil?.nombre} ${o.perfil?.apellidos}`
            return o.perfil?.telefono ? waBtn(o.perfil.telefono, nombreCompleto) : ''
          })
          .filter(Boolean)
          .join('')
        const waSeccion = otrosWa ? `<br><br>Contacta con tus compañeros:<br>${otrosWa}` : ''

        await enviarEmail(
          email,
          `⏳ Recuerda confirmar tu cadena de descansos (${diasRestantes} días) - DescansApp`,
          templateNotificacion(
            '⏳ Recuerda confirmar tu parte',
            `Tienes una <strong>cadena de descansos de ${cadena.tipo} personas</strong> pendiente de tu confirmación.<br><br>` +
            `<strong>Querías:</strong> ${queriaDia}<br>` +
            `<strong>Dabas:</strong> ${dabaDia}<br><br>` +
            `Te quedan <strong>${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}</strong> para confirmar. Si no confirmas, la cadena se cancelará automáticamente y los días volverán a estar disponibles.<br><br>` +
            `Entra en DescansApp → Descansos y pulsa <strong>"✓ CONFIRMAR MI PARTE"</strong> en la sección morada.` +
            `${waSeccion}`
          )
        )
      }
    }

    return NextResponse.json({
      ok: true,
      cadenasVencidas: cadenasVencidas?.length || 0,
      cadenasPendientes: cadenasPendientes?.length || 0
    })
  } catch (error) {
    console.error('Error en cron cadenas-descansos:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
