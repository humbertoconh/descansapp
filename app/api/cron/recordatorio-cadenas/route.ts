import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmail, templateNotificacion } from '@/lib/email'

export const dynamic = 'force-dynamic'

const fmt = (f: string) => f ? f.split('-').reverse().join('/') : ''

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
    const { data: cadenasVencidas } = await supabase
      .from('vacaciones_cadenas')
      .select('*')
      .eq('estado', 'pendiente')
      .lt('expira_at', new Date().toISOString())

    for (const cadena of cadenasVencidas || []) {
      await supabase.from('vacaciones_cadenas').update({ estado: 'cancelada' }).eq('id', cadena.id)
      const ids = [cadena.solicitud1_id, cadena.solicitud2_id, cadena.solicitud3_id, cadena.solicitud4_id].filter(Boolean)
      await supabase.from('vacaciones_solicitudes').update({ estado: 'abierta' }).in('id', ids).eq('estado', 'en_cadena')
      const participantes = [cadena.usuario1_id, cadena.usuario2_id, cadena.usuario3_id, cadena.usuario4_id].filter(Boolean)
      for (const uid of participantes) {
        await supabase.from('notificaciones').insert({ user_id: uid, tipo: 'cadena', titulo: '❌ Cadena de vacaciones cancelada', mensaje: 'La cadena ha sido cancelada porque no todos confirmaron en 5 días. Tus solicitudes han vuelto a estar disponibles.', leida: false })
        const { data: email } = await supabase.rpc('get_user_email', { p_user_id: uid })
        if (email) await enviarEmail(email, '❌ Cadena de vacaciones cancelada - DescansApp', templateNotificacion('Cadena de vacaciones cancelada', 'La cadena de vacaciones en la que participabas ha sido cancelada porque no todos los participantes confirmaron en el plazo de 5 días.<br><br>Tus solicitudes han vuelto a estar disponibles.'))
      }
    }

    const { data: cadenasPendientes } = await supabase
      .from('vacaciones_cadenas')
      .select('*, p1:usuario1_id(nombre, apellidos), p2:usuario2_id(nombre, apellidos), p3:usuario3_id(nombre, apellidos), p4:usuario4_id(nombre, apellidos), s1:solicitud1_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, num_dias), s2:solicitud2_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, num_dias), s3:solicitud3_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, num_dias), s4:solicitud4_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, num_dias)')
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

      for (const p of participantes.filter((p: any) => !p.confirmado)) {
        const { data: email } = await supabase.rpc('get_user_email', { p_user_id: p.uid })
        if (!email) continue
        const sol = p.sol
        const descripcionDa = sol ? (sol.flexible_ofrecido ? `${sol.num_dias} días entre el ${fmt(sol.ofrecido_ventana_desde)} y el ${fmt(sol.ofrecido_ventana_hasta)}` : `${fmt(sol.ofrecido_desde)} → ${fmt(sol.ofrecido_hasta)}`) : '—'
        const otros = participantes.filter((o: any) => o.uid !== p.uid).map((o: any) => `${o.perfil?.nombre} ${o.perfil?.apellidos}`).join(', ')
        await enviarEmail(email, `⏳ Recuerda confirmar tu cadena de vacaciones (${diasRestantes} días) - DescansApp`,
          templateNotificacion('⏳ Recuerda confirmar tu parte',
            `Tienes una <strong>cadena de vacaciones de ${cadena.tipo} personas</strong> pendiente de tu confirmación.<br><br>Tú das: <strong>${descripcionDa}</strong><br>Participantes: <strong>${otros}</strong><br><br>Te quedan <strong>${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}</strong> para confirmar. Si no confirmas, la cadena se cancelará automáticamente.<br><br>Entra en DescansApp → Vacaciones → <strong>"Mis solicitudes"</strong> y pulsa <strong>"✓ CONFIRMAR MI PARTE"</strong>.`))
      }
    }

    return NextResponse.json({ ok: true, cadenasVencidas: cadenasVencidas?.length || 0, cadenasPendientes: cadenasPendientes?.length || 0 })
  } catch (error) {
    console.error('Error en cron recordatorio-cadenas:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
