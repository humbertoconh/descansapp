'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, getDaysInMonth, startOfMonth, getDay, isToday } from 'date-fns'
import { enviarEmail, templateNotificacion } from '@/lib/email'
import { Suspense } from 'react'
import { es } from 'date-fns/locale'
export const dynamic = 'force-dynamic'

const FESTIVOS_2026 = [
  '2026-01-01','2026-01-06','2026-03-19','2026-04-02','2026-04-03',
  '2026-05-01','2026-06-24','2026-08-15','2026-10-09','2026-11-01',
  '2026-12-06','2026-12-08','2026-12-25',
]
const NOMBRES_FESTIVOS: Record<string,string> = {
  '2026-01-01':'Año Nuevo','2026-01-06':'Reyes','2026-03-19':'San José',
  '2026-04-02':'Jueves Santo','2026-04-03':'Viernes Santo','2026-05-01':'Día del Trabajo',
  '2026-06-24':'San Juan','2026-08-15':'Asunción','2026-10-09':'Día CV',
  '2026-11-01':'Todos los Santos','2026-12-06':'Constitución',
  '2026-12-08':'Inmaculada','2026-12-25':'Navidad',
}
const fmt = (f: string) => f.split("-").reverse().join("/") 
const COLORES = ['#f5c518','#60a5fa','#34d399','#f87171','#a78bfa','#fb923c','#e879f9','#2dd4bf']

type DiaOfrecido = { id: string; fecha: string }
type Solicitud = {
  id: string
  solicitante_id: string
  dia_pedido: string
  estado: string
  dias_ofrecidos: DiaOfrecido[]
  profiles?: { nombre: string; apellidos: string; chapa: string }
}

function CalendarioContent() {
  const supabase = createClient()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [companyeros, setCompanyeros] = useState<any[]>([])
  const [miId, setMiId] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalDia, setModalDia] = useState<{ fecha: string; quieren: Solicitud[]; ofrecen: Solicitud[] } | null>(null)
  const [modalNueva, setModalNueva] = useState(false)
  const [diaPedido, setDiaPedido] = useState('')
  const [diasOfrecidos, setDiasOfrecidos] = useState<string[]>([''])
  const [coincidencias, setCoincidencias] = useState<any[]>([])
  const [cadenas, setCadenas] = useState<any[]>([])
  const [modalCadenas, setModalCadenas] = useState(false)
  const [buscandoCadenas, setBuscandoCadenas] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modalAceptar, setModalAceptar] = useState<Solicitud | null>(null)
  const [aceptaciones, setAceptaciones] = useState<any[]>([])
  const [diasSueltos, setDiasSueltos] = useState<any[]>([])
  const [modalSoltar, setModalSoltar] = useState(false)
  const [diaSoltar, setDiaSoltar] = useState('')
  const [soltando, setSoltando] = useState(false)
  const [diaParam, setDiaParam] = useState<string | null>(null)
  const [listaEspera, setListaEspera] = useState<any[]>([])
  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMiId(user.id)
    const { data: miPerfil } = await supabase.from('profiles').select('grupo').eq('id', user.id).single()
    if (!miPerfil) return
    const { data: perfiles } = await supabase.from('profiles').select('*').eq('grupo', miPerfil.grupo)
    setCompanyeros(perfiles || [])
    const ids = (perfiles || []).map((p: any) => p.id)
    const { data: sols } = await supabase
      .from('solicitudes')
      .select('*, dias_ofrecidos(*), profiles(nombre, apellidos, chapa)')
      .in('solicitante_id', ids)
      .in('estado', ['abierta', 'esperando_confirmacion'])
      .gte('dia_pedido', new Date().toISOString().split('T')[0])
    setSolicitudes(sols || [])
    const { data: lista } = await supabase.from('lista_espera').select('*, profiles(nombre, apellidos)').in('user_id', ids).gte('dia_pedido', new Date().toISOString().split('T')[0])
    setListaEspera(lista || [])
    const { data: acepts } = await supabase.from('aceptaciones').select('*, profiles(nombre, apellidos), dias_ofrecidos(fecha)').in('solicitud_id', (sols || []).map((s: any) => s.id))
    setAceptaciones(acepts || [])
    const { data: sueltos, error: errorSueltos } = await supabase.from('dias_sueltos').select('id, user_id, fecha, estado, created_at, profiles!dias_sueltos_user_id_fkey(nombre, apellidos)').eq('estado', 'disponible')
    
    setDiasSueltos(sueltos || [])
    const { data: perfil } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    setEsAdmin(perfil?.is_admin || false)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const channel = supabase.channel('solicitudes-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aceptaciones' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_espera' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dias_sueltos' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dia = params.get('dia')
    if (dia) {
      setDiaParam(dia)
      window.history.replaceState({}, '', '/calendario')
    }
  }, [])

  useEffect(() => {
    if (diaParam && !loading) {
      abrirDia(diaParam)
      setDiaParam(null)
    }
  }, [diaParam, loading])

  const colorPorUsuario: Record<string, string> = {}
  companyeros.forEach((c, i) => { colorPorUsuario[c.id] = COLORES[i % COLORES.length] })

  const hoy = new Date().toISOString().split('T')[0]
  const diasPedidos: Record<string, Solicitud[]> = {}
  const diasOfrecidosMap: Record<string, Solicitud[]> = {}
  solicitudes.forEach(s => {
    if (s.dia_pedido >= hoy) {
      if (!diasPedidos[s.dia_pedido]) diasPedidos[s.dia_pedido] = []
      diasPedidos[s.dia_pedido].push(s)
    }
    s.dias_ofrecidos?.forEach(d => {
      if (d.fecha >= hoy) {
        if (!diasOfrecidosMap[d.fecha]) diasOfrecidosMap[d.fecha] = []
        diasOfrecidosMap[d.fecha].push(s)
      }
    })
  })

  const abrirDia = (fecha: string) => {
    setModalDia({ fecha, quieren: diasPedidos[fecha] || [], ofrecen: diasOfrecidosMap[fecha] || [] })
  }
  const buscarCadenas = async () => {
    setBuscandoCadenas(true)
    setModalCadenas(true)
    const { data, error } = await supabase.rpc('buscar_cadenas')
    if (error) { setBuscandoCadenas(false); return }
    const { data: perfil } = await supabase.from('profiles').select('is_admin').eq('id', miId).single()
    const esAdmin = perfil?.is_admin
    const cadenasVisibles = esAdmin
      ? (data || [])
      : (data || []).filter((c: any) => c.usuario1_id === miId || c.usuario2_id === miId || c.usuario3_id === miId)
    setCadenas(cadenasVisibles)
    setBuscandoCadenas(false)
  }
  const buscarCoincidencias = async (diaPedido: string, diasOfrece: string[]) => {
    if (!diaPedido || diasOfrece.filter(d => d).length === 0) {
      setCoincidencias([])
      return
    }
    const diasValidos = diasOfrece.filter(d => d)
    const { data } = await supabase
      .from('solicitudes')
      .select('*, profiles(nombre, apellidos, chapa), dias_ofrecidos(id, fecha)')
      .eq('estado', 'abierta')
      .eq('dia_pedido', diasValidos[0])
      .neq('solicitante_id', miId)
    const matches = (data || []).filter(s =>
      s.dias_ofrecidos?.some((d: any) => d.fecha === diaPedido)
    )
    setCoincidencias(matches)
  }

  const crearSolicitud = async () => {
    if (!diaPedido) return
    const ofrecidos = diasOfrecidos.filter(d => d !== '')
    if (ofrecidos.length === 0) return
    setGuardando(true)
    const { data: sol } = await supabase
      .from('solicitudes')
      .insert({ solicitante_id: miId, dia_pedido: diaPedido })
      .select().single()
    if (sol) {
      await supabase.from('dias_ofrecidos').insert(ofrecidos.map(f => ({ solicitud_id: sol.id, fecha: f })))
    }
    await cargar()
    setModalNueva(false)
    setDiaPedido('')
    setDiasOfrecidos([''])
    setGuardando(false)
  }

  const aceptarSolicitud = async (solicitud: Solicitud, diaOfrecidoId: string) => {
    await supabase.rpc('aceptar_solicitud', {
      p_solicitud_id: solicitud.id,
      p_aceptante_id: miId,
      p_dia_ofrecido_id: diaOfrecidoId,
    })
    // Enviar email al solicitante para que confirme
    const { data: emailData } = await supabase.rpc('get_user_email', { p_user_id: solicitud.solicitante_id })
    const { data: perfil } = await supabase.from('profiles').select('nombre, apellidos, chapa').eq('id', miId).single()
    const { data: diaOfrecido } = await supabase.from('dias_ofrecidos').select('fecha').eq('id', diaOfrecidoId).single()
    if (emailData && perfil && diaOfrecido) {
      await enviarEmail(
        emailData,
        '⚡ Alguien acepta tu intercambio - DescansApp',
        templateNotificacion(
          '¡Alguien acepta tu intercambio!',
          `${perfil.nombre} ${perfil.apellidos} (chapa ${perfil.chapa}) acepta darte el ${fmt(diaOfrecido.fecha)} a cambio del ${fmt(solicitud.dia_pedido)}. Entra en DescansApp para confirmar el intercambio.`
        )
      )
    }
    await cargar()
    setModalDia(null)
    setModalAceptar(null)
  }

const confirmarIntercambio = async (solicitudId: string) => {
    const { data: acept } = await supabase
      .from('aceptaciones')
      .select('*')
      .eq('solicitud_id', solicitudId)
      .single()
    if (!acept) return
    await supabase.rpc('confirmar_intercambio', {
      p_solicitud_id: solicitudId,
      p_aceptante_id: acept.aceptante_id,
    })
    await cargar()
    setModalDia(null)
  }
const apuntarseListaEspera = async (fecha: string) => {
    const yaApuntado = listaEspera.find(l => l.dia_pedido === fecha && l.user_id === miId)
    if (yaApuntado) return
    const misColas = listaEspera.filter(l => l.user_id === miId)
    if (misColas.length >= 5) {
      alert('Ya estás en 5 listas de espera. Quítate de alguna antes de apuntarte a otra.')
      return
    }
    const yaSolte = diasSueltos.find(d => {
      const fechaDB = d.fecha?.split('T')[0]
      return fechaDB === fecha && d.user_id === miId
    })
    if (yaSolte) {
      alert('No puedes apuntarte a la lista de espera de un día que tú mismo has soltado.')
      return
    }
    const { error } = await supabase.rpc('apuntarse_lista_espera', { p_user_id: miId, p_fecha: fecha })
    if (error) { alert(error.message); return }
    await cargar()
    setModalDia(null)
  }

  const quitarseListaEspera = async (fecha: string) => {
    await supabase.from('lista_espera').delete().eq('user_id', miId).eq('dia_pedido', fecha)
    await cargar()
    setModalDia(null)
  }
const soltarDia = async (fecha: string) => {
    setSoltando(true)
    const { data } = await supabase.rpc('soltar_dia', {
      p_user_id: miId,
      p_fecha: fecha,
    })
    // Enviar email al asignado si hay alguien en lista de espera
    const { data: suelto } = await supabase.from('dias_sueltos').select('asignado_a, fecha').eq('user_id', miId).eq('fecha', fecha).single()
    if (suelto?.asignado_a) {
      const { data: emailData } = await supabase.rpc('get_user_email', { p_user_id: suelto.asignado_a })
      const { data: perfil } = await supabase.from('profiles').select('nombre, apellidos, chapa').eq('id', miId).single()
      if (emailData && perfil) {
        await enviarEmail(
          emailData,
          '🎉 ¡Te han asignado un día! - DescansApp',
          templateNotificacion(
            '¡Te han asignado un día!',
            `${perfil.nombre} ${perfil.apellidos} (chapa ${perfil.chapa}) te ha soltado el ${fmt(fecha)}. ¡Es tuyo! Recuerda tramitar el cambio en la web del Cpe.`
          )
        )
      }
    }
    await cargar()
    setModalSoltar(false)
    setDiaSoltar('')
    setSoltando(false)
  }
  const cancelarSolicitud = async (solicitudId: string) => {
    const { error } = await supabase.from('solicitudes').update({ estado: 'cancelada' }).eq('id', solicitudId)
    if (error) alert('Error: ' + error.message)
    await cargar()
    setModalDia(null)
  }

  if (loading) return (
    <div style={{ background:'#0f0f0f', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#f5c518', fontFamily:'sans-serif', fontSize:'1.5rem', letterSpacing:'3px' }}>
      CARGANDO...
    </div>
  )
return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f0f; color: #e8e0d4; font-family: 'DM Sans', sans-serif; }
        .cal-page { padding: 2rem; max-width: 1400px; margin: 0 auto; }
        .cal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #2a2420; gap: 1rem; flex-wrap: wrap; }
        .cal-header h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; letter-spacing: 3px; color: #f5c518; }
        .cal-header p { color: #6a6058; font-size: 0.8rem; margin-top: 0.2rem; }
        .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; }
        .leyenda { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: flex-end; }
        .leyenda-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #8a8070; }
        .leyenda-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .leyenda-dot.cuadrado { border-radius: 2px; }
        .btn-nueva { background: #f5c518; color: #0f0f0f; border: none; padding: 0.6rem 1.5rem; font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; cursor: pointer; border-radius: 2px; }
        .btn-nueva:hover { background: #ffd740; }
        .meses-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .mes { background: #1a1612; border: 1px solid #2a2420; border-radius: 4px; padding: 1rem; }
        .mes-titulo { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; color: #f5c518; margin-bottom: 0.75rem; text-align: center; }
        .dias-semana { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 0.25rem; }
        .dia-semana { text-align: center; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1px; color: #4a4038; padding: 0.2rem 0; }
        .dias-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dia { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.7rem; border-radius: 3px; cursor: pointer; position: relative; transition: transform 0.1s; border: 1px solid transparent; background: #141210; color: #6a6058; }
        .dia:hover { transform: scale(1.15); z-index: 10; }
        .dia.vacio { cursor: default; pointer-events: none; background: transparent; }
        .dia.festivo { background: #2a1a1a; color: #e05050; border-color: #3a2020; }
        .dia.hoy { border-color: #f5c518 !important; }
.dia.no-valido { background: #e8e4e0 !important; color: #b8b0a8 !important; cursor: default; pointer-events: none; }
.dia-num { font-size: 0.7rem; line-height: 1; }
        .puntos { display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; justify-content: center; }
.dia-badges { display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; justify-content: center; }
.badge-pedido { font-size: 0.55rem; background: #c4a520; color: #fff; border-radius: 2px; padding: 0 2px; font-weight: 700; line-height: 1.4; }
.badge-ofrecido { font-size: 0.55rem; background: #34d399; color: #0f0f0f; border-radius: 2px; padding: 0 2px; font-weight: 700; line-height: 1.4; }
.badge-espera { font-size: 0.55rem; background: #fb923c; color: #fff; border-radius: 2px; padding: 0 2px; font-weight: 700; line-height: 1.4; }
.badge-suelto { font-size: 0.55rem; background: #a78bfa; color: #0f0f0f; border-radius: 2px; padding: 0 2px; font-weight: 700; line-height: 1.4; }
        .punto-pedido { width: 5px; height: 5px; border-radius: 2px; background: #f5c518; flex-shrink: 0; }
        .punto-ofrecido { width: 5px; height: 5px; border-radius: 50%; background: #34d399; flex-shrink: 0; }
.punto-espera { width: 5px; height: 5px; border-radius: 50%; background: #fb923c; flex-shrink: 0; }
.punto-suelto { width: 5px; height: 5px; border-radius: 50%; background: #a78bfa; flex-shrink: 0; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
        .modal { background: #1a1612; border: 1px solid #2a2420; border-left: 3px solid #f5c518; padding: 1.5rem; width: 100%; max-width: 480px; border-radius: 4px; max-height: 90vh; overflow-y: auto; }
        .modal h3 { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 2px; color: #f5c518; margin-bottom: 1rem; }
        .seccion { margin-top: 1rem; }
        .seccion-titulo { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #6a6058; margin-bottom: 0.5rem; border-bottom: 1px solid #2a2420; padding-bottom: 0.3rem; }
        .solicitud-card { background: #221e18; border: 1px solid #2a2420; border-radius: 3px; padding: 0.75rem; margin-bottom: 0.5rem; }
        .sol-usuario { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .sol-ofrece { font-size: 0.75rem; color: #8a8070; margin-bottom: 0.5rem; }
        .dias-chips { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.3rem; }
        .chip { background: #2a2420; border: 1px solid #3a3028; padding: 0.2rem 0.6rem; font-size: 0.78rem; border-radius: 2px; cursor: pointer; transition: background 0.1s; }
        .chip:hover { background: #f5c518; color: #0f0f0f; border-color: #f5c518; }
        .tag { font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 2px; font-weight: 500; }
        .tag-yo { background: #2a2010; color: #f5c518; }
        .tag-espera { background: #1a2a1a; color: #34d399; }
        .modal-btns { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
        .btn-amarillo { background: #f5c518; color: #0f0f0f; border: none; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-amarillo:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-gris { background: transparent; color: #8a8070; border: 1px solid #2a2420; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-rojo { background: transparent; color: #e05050; border: 1px solid #5a2020; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
        .field label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; }
        .field input[type=date] { background: #221e18; border: 1px solid #2e2820; color: #e8e0d4; padding: 0.6rem 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; border-radius: 2px; width: 100%; }
        .field input[type=date]:focus { border-color: #f5c518; }
        .btn-add { background: none; border: 1px dashed #3a3028; color: #6a6058; padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor: pointer; border-radius: 2px; width: 100%; margin-top: 0.25rem; }
        .btn-add:hover { border-color: #f5c518; color: #f5c518; }
        .btn-remove { background: none; border: none; color: #e05050; cursor: pointer; font-size: 0.9rem; padding: 0 0.3rem; }
        .dia-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
        .festivo-aviso { font-size: 0.72rem; color: #e05050; margin-top: 0.2rem; }
        .vacio-msg { color: #6a6058; font-size: 0.85rem; margin-top: 0.75rem; }
.barra-movil { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #1a1612; border-top: 1px solid #2a2420; padding: 0.5rem 1rem; gap: 0.5rem; z-index: 50; flex-wrap: wrap; justify-content: center; }
.barra-movil button { flex: 1; min-width: 80px; padding: 0.5rem 0.5rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.75rem; letter-spacing: 1px; border: none; border-radius: 2px; cursor: pointer; }
        @media (max-width: 1100px) { .meses-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px) {
  body { background: #f5f0eb !important; color: #1a1612 !important; }
  .meses-grid { grid-template-columns: repeat(2, 1fr); }
  .cal-page { padding: 1rem; padding-bottom: 80px; }
  .mes { background: #fff; border-color: #e0d8d0; }
  .mes-titulo { color: #c4a520; }
  .dia { background: #f0ebe5; color: #4a4038; }
  .dia.festivo { background: #fde8e8; color: #c04040; }
  .dia.hoy { border-color: #c4a520 !important; }
  .barra-movil { display: flex !important; }
}
@media (max-width: 500px) {
  .meses-grid { grid-template-columns: 1fr; }
  .cal-header { flex-direction: column; }
  .cal-header h1 { font-size: 1.8rem; color: #1a1612; }
}
@media (max-width: 768px) {
  body { background: #f5f0eb !important; color: #1a1612 !important; }  
  body { background: #f5f0eb !important; color: #1a1612 !important; }
.mes { background: #fff; border-color: #e0d8d0; }
.mes-titulo { color: #c4a520; }
.dia { background: #f0ebe5; color: #4a4038; }
.dia.festivo { background: #fde8e8; color: #c04040; }
.dia.hoy { border-color: #c4a520 !important; }
.modal { background: #fff; border-color: #e0d8d0; border-left-color: #c4a520; }
.solicitud-card { background: #f5f0eb; border-color: #e0d8d0; }
.overlay { align-items: flex-end !important; padding: 0 !important; }
.modal { border-radius: 12px 12px 0 0 !important; max-height: 85vh !important; border-left: none !important; border-top: 3px solid #c4a520 !important; }
.field input[type=date] { background: #f0ebe5 !important; border-color: #d0c8c0 !important; color: #1a1612 !important; }
.btn-gris { color: #4a4038 !important; border-color: #d0c8c0 !important; }
.btn-rojo { color: #c04040 !important; border-color: #c04040 !important; }
.chip { background: #e8e0d8 !important; border-color: #d0c8c0 !important; color: #1a1612 !important; }
.vacio-msg { color: #4a4038 !important; }
.seccion-titulo { color: #4a4038 !important; }
.modal h3 { color: #c4a520 !important; }
.barra-movil { display: flex !important; background: #1a1612; }


.cal-page { padding: 0.75rem; padding-bottom: 80px; }
  .cal-header h1 { font-size: 1.8rem; color: #1a1612; }
  .btn-nueva { font-size: 0.85rem; padding: 0.5rem 1rem; }
  .meses-grid { grid-template-columns: 1fr; }
  .mes { background: #fff; border-color: #e0d8d0; }
  .mes-titulo { color: #c4a520; }
  .dia { background: #f0ebe5; color: #4a4038; }
  .dia.festivo { background: #fde8e8; color: #c04040; }
  .dia.hoy { border-color: #c4a520 !important; }
  .modal { background: #fff; border-color: #e0d8d0; }
  .solicitud-card { background: #f5f0eb; border-color: #e0d8d0; }
  .barra-movil { display: flex !important; }
  .dia-num { font-size: 1rem !important; }
  .overlay { align-items: flex-end !important; padding: 0 !important; }
.modal { border-radius: 12px 12px 0 0 !important; max-height: 85vh !important; border-left: none !important; border-top: 3px solid #c4a520 !important; }
.field input[type=date] { background: #f0ebe5 !important; border-color: #d0c8c0 !important; color: #1a1612 !important; }
.btn-add { background: #f0ebe5 !important; border-color: #d0c8c0 !important; color: #4a4038 !important; }
.modal h3 { color: #c4a520 !important; }
.seccion-titulo { color: #4a4038 !important; }
.solicitud-card { background: #f0ebe5 !important; border-color: #d0c8c0 !important; }
.vacio-msg { color: #4a4038 !important; }
.btn-gris { color: #4a4038 !important; border-color: #d0c8c0 !important; }
.btn-rojo { color: #c04040 !important; border-color: #c04040 !important; }
.chip { background: #e8e0d8 !important; border-color: #d0c8c0 !important; color: #1a1612 !important; }
  .badge-pedido, .badge-ofrecido, .badge-espera, .badge-suelto { font-size: 0.7rem !important; padding: 1px 3px !important; }
  .dia-semana { font-size: 0.75rem !important; }
}
        
      `}</style>
<div className="cal-page">
        <div className="cal-header">
          <div>
            <h1>CALENDARIO</h1>
            <p>Pincha cualquier día para ver o crear solicitudes de intercambio</p>
          </div>
          <div className="header-right">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-nueva" onClick={() => setModalNueva(true)}>+ NUEVA SOLICITUD</button>
              <button className="btn-nueva" style={{ background: '#fb923c' }} onClick={() => setModalSoltar(true)}>+ SOLTAR DÍA</button>
              <button className="btn-nueva" style={{ background: '#a78bfa' }} onClick={buscarCadenas}>🔗 BUSCAR CADENAS</button>
            </div>
            <div className="leyenda">
              <div className="leyenda-item">
                <div className="leyenda-dot" style={{ background: '#e05050' }} />
                Festivo
              </div>
              <div className="leyenda-item">
                <div className="leyenda-dot cuadrado" style={{ background: '#f5c518' }} />
                Día pedido
              </div>
              <div className="leyenda-item">
                <div className="leyenda-dot" style={{ background: '#60a5fa' }} />
                Día ofrecido
              </div>
              <div className="leyenda-item">
                <div className="leyenda-dot" style={{ background: '#f472b6' }} />
                Lista de espera
              </div>
              <div className="leyenda-item">
                <div className="leyenda-dot" style={{ background: '#34d399' }} />
                Día disponible
              </div>
             
            </div>
          </div>
        </div>
        <div className="meses-grid">
          {Array.from({ length: 12 }, (_, i) => i).map(offset => {
            const ahora = new Date()
            const fecha = new Date(ahora.getFullYear(), ahora.getMonth() + offset, 1)
            const mes = fecha.getMonth()
            const diasEnMes = getDaysInMonth(fecha)
            const primerDia = (getDay(startOfMonth(fecha)) + 6) % 7
            const nombreMes = format(fecha, 'MMMM', { locale: es }).toUpperCase()
            return (
              <div key={mes} className="mes">
                <div className="mes-titulo">{nombreMes}</div>
                <div className="dias-semana">
                  {['L','M','X','J','V','S','D'].map(d => (
                    <div key={d} className="dia-semana">{d}</div>
                  ))}
                </div>
                <div className="dias-grid">
                  {Array.from({ length: primerDia }, (_, i) => (
                    <div key={`v${i}`} className="dia vacio" />
                  ))}
                  {Array.from({ length: diasEnMes }, (_, i) => {
                    const dia = i + 1
                    const fechaStr = `${fecha.getFullYear()}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                    const esFestivo = FESTIVOS_2026.includes(fechaStr)
                    const esHoy = isToday(new Date(fecha.getFullYear(), mes, dia))
                    const hoy = new Date(); hoy.setHours(0,0,0,0)
                    const limit = new Date(Date.now() + 60*24*60*60*1000); limit.setHours(0,0,0,0)
                    const fechaDia = new Date(fecha.getFullYear(), mes, dia)
                    const esNoValido = fechaDia < hoy || fechaDia > limit
                    const pedidos = diasPedidos[fechaStr] || []
                    const ofrecidos = diasOfrecidosMap[fechaStr] || []
                    const sueltos = diasSueltos.filter(d => {
      const fechaDB = d.fecha?.split('T')[0]
      return fechaDB === fechaStr
    })
                    return (
                      <div
                        key={dia}
                        className={`dia${esFestivo ? ' festivo' : ''}${esHoy ? ' hoy' : ''}${esNoValido ? ' no-valido' : ''}`}
                        onClick={() => abrirDia(fechaStr)}
                        title={esFestivo ? NOMBRES_FESTIVOS[fechaStr] : ''}
                      >
                        <span className="dia-num">{dia}</span>
                        <div className="dia-badges">
                          {pedidos.length > 0 && <span className="badge-pedido">{pedidos.length}</span>}
                          {ofrecidos.length > 0 && <span className="badge-ofrecido">{ofrecidos.length}</span>}
                          {listaEspera.filter(l => l.dia_pedido === fechaStr).length > 0 && <span className="badge-espera">{listaEspera.filter(l => l.dia_pedido === fechaStr).length}</span>}
                          {sueltos.length > 0 && <span className="badge-suelto">{sueltos.length}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
{modalDia && (
        <div className="overlay" onClick={() => setModalDia(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>📅 {fmt(modalDia.fecha)}</h3>
            {FESTIVOS_2026.includes(modalDia.fecha) && (
              <div className="festivo-aviso">🔴 {NOMBRES_FESTIVOS[modalDia.fecha]}</div>
            )}
            {modalDia.quieren.length > 0 && (
              <div className="seccion">
                <div className="seccion-titulo">Quieren este día</div>
                {modalDia.quieren.map(s => (
                  <div key={s.id} className="solicitud-card">
                    <div className="sol-usuario">
                      <div style={{ width:8, height:8, borderRadius:'50%', background: colorPorUsuario[s.solicitante_id], flexShrink:0 }} />
                      {s.profiles?.nombre} {s.profiles?.apellidos}
                      {s.solicitante_id === miId && <span className="tag tag-yo">YO</span>}
                      {s.estado === 'esperando_confirmacion' && <span className="tag tag-espera">ESPERANDO</span>}
                    </div>
                    <div className="sol-ofrece">Ofrece a cambio:</div>
                    <div className="dias-chips">
                      {s.dias_ofrecidos?.map(d => (
                        <span key={d.id} className="chip" onClick={() => s.solicitante_id !== miId && s.estado === 'abierta' && setModalAceptar(s)}>
                          {fmt(d.fecha)}
                        </span>
                      ))}
                    </div>
                    {s.solicitante_id === miId && (
                      <div className="modal-btns" style={{ marginTop:'0.5rem' }}>
                        {s.estado === 'esperando_confirmacion' && (
                          <div style={{ fontSize: '0.78rem', color: '#8a8070', marginBottom: '0.5rem', padding: '0.4rem 0.6rem', background: '#1a1612', borderRadius: '2px', border: '1px solid #2a2420' }}>
                            ⏳ Pendiente de confirmar
                          </div>
                        )}
                      {s.estado === 'esperando_confirmacion' && (() => {
                          const acept = aceptaciones.find(a => a.solicitud_id === s.id)
                          return acept ? (
                            <div style={{ fontSize: '0.78rem', color: '#8a8070', marginBottom: '0.5rem', padding: '0.4rem 0.6rem', background: '#1a1612', borderRadius: '2px', border: '1px solid #2a2420' }}>
                              👤 {acept.profiles?.nombre} {acept.profiles?.apellidos} acepta darte el <strong style={{ color: '#f5c518' }}>{fmt(acept.dias_ofrecidos?.fecha)}</strong>
                            </div>
                          ) : null
                        })()}
                      {s.estado === 'esperando_confirmacion' && (
                          <button className="btn-amarillo" onClick={() => confirmarIntercambio(s.id)}>✓ CONFIRMAR INTERCAMBIO</button>
                        )}
                        {s.estado === 'abierta' && (
                          <button className="btn-rojo" onClick={() => cancelarSolicitud(s.id)}>CANCELAR</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {modalDia.ofrecen.length > 0 && (
              <div className="seccion">
                <div className="seccion-titulo">Ofrecen este día a cambio de</div>
                {modalDia.ofrecen.map(s => (
                  <div key={s.id} className="solicitud-card">
                    <div className="sol-usuario">
                      <div style={{ width:8, height:8, borderRadius:'50%', background: colorPorUsuario[s.solicitante_id], flexShrink:0 }} />
                      {s.profiles?.nombre} {s.profiles?.apellidos}
                      {s.solicitante_id === miId && <span className="tag tag-yo">YO</span>}
                    </div>
                    <div className="sol-ofrece">Quiere a cambio: <strong style={{ color:'#f5c518' }}>{fmt(s.dia_pedido)}</strong></div>
                    {s.solicitante_id !== miId && s.estado === 'abierta' && (
                      <div className="modal-btns" style={{ marginTop:'0.5rem' }}>
                        <button className="btn-amarillo" onClick={() => setModalAceptar(s)}>ACEPTAR INTERCAMBIO</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {modalDia.quieren.length === 0 && modalDia.ofrecen.length === 0 && (
              <p className="vacio-msg">No hay solicitudes para este día.</p>
            )}
{(() => {
              const esperaHoy = listaEspera.filter(l => l.dia_pedido === modalDia.fecha)
              const yoApuntado = esperaHoy.find(l => l.user_id === miId)
              return (
                <div className="seccion">
                  <div className="seccion-titulo">Lista de espera ({esperaHoy.length})</div>
                  {esperaHoy.length === 0 && <p className="vacio-msg" style={{ marginTop: '0.5rem' }}>Nadie en lista de espera</p>}
                  {esperaHoy.map((l, i) => (
                    <div key={l.id} className="solicitud-card">
                      <div className="sol-usuario">
                        <span style={{ color: '#4a4038', fontSize: '0.75rem', marginRight: '0.25rem' }}>#{i+1}</span>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: colorPorUsuario[l.user_id], flexShrink:0 }} />
                        {l.profiles?.nombre} {l.profiles?.apellidos}
                        {l.user_id === miId && <span className="tag tag-yo">YO</span>}
                      </div>
                    </div>
                  ))}
                  <div className="modal-btns" style={{ marginTop: '0.75rem' }}>
                    {yoApuntado ? (
                      <button className="btn-rojo" onClick={() => quitarseListaEspera(modalDia.fecha)}>SALIR DE LA LISTA</button>
                    ) : (
                      <button className="btn-gris" onClick={() => apuntarseListaEspera(modalDia.fecha)}>+ APUNTARME A LA LISTA</button>
                    )}
                  </div>
                </div>
              )
            })()}
            <div className="modal-btns">
              <button className="btn-nueva" style={{ fontSize:'0.8rem', padding:'0.4rem 0.8rem' }}
                onClick={() => { setDiaPedido(modalDia.fecha); setModalNueva(true); setModalDia(null) }}>
                + PEDIR ESTE DÍA
              </button>
              <button className="btn-gris" onClick={() => setModalDia(null)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}
      {modalAceptar && (
        <div className="overlay" onClick={() => setModalAceptar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>ACEPTAR INTERCAMBIO</h3>
            <p style={{ fontSize:'0.85rem', color:'#8a8070', marginBottom:'1rem' }}>
              <strong style={{ color:'#e8e0d4' }}>{modalAceptar.profiles?.nombre}</strong> quiere el{' '}
              <strong style={{ color:'#f5c518' }}>{fmt(modalAceptar.dia_pedido)}</strong>.<br />
              Elige qué día de los que ofrece quieres tú:
            </p>
            <div className="dias-chips">
              {modalAceptar.dias_ofrecidos?.map(d => (
                <span key={d.id} className="chip" style={{ fontSize:'0.9rem', padding:'0.5rem 1rem' }}
                  onClick={() => aceptarSolicitud(modalAceptar, d.id)}>
                  {fmt(d.fecha)}
                </span>
              ))}
            </div>
            <div className="modal-btns">
              <button className="btn-gris" onClick={() => setModalAceptar(null)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
{modalCadenas && (
        <div className="overlay" onClick={() => setModalCadenas(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <h3>🔗 INTERCAMBIOS EN CADENA</h3>
            {buscandoCadenas ? (
              <p style={{ color: '#6a6058', fontSize: '0.85rem' }}>Buscando cadenas posibles...</p>
            ) : cadenas.length === 0 ? (
              <p style={{ color: '#6a6058', fontSize: '0.85rem', marginTop: '0.5rem' }}>No se han encontrado intercambios en cadena posibles con las solicitudes actuales.</p>
            ) : (
              <>
                <p style={{ color: '#6a6058', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  Se han encontrado {cadenas.length} cadena(s) posible(s). Notifica a los participantes para que puedan confirmar.
                </p>
                {cadenas.map((c, i) => (
                  <div key={i} className="solicitud-card" style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#a78bfa', marginBottom: '0.75rem', fontWeight: 600 }}>
                      Cadena #{i + 1}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.85rem', padding: '0.5rem', background: '#1a1612', borderRadius: '2px', borderLeft: '2px solid #f5c518' }}>
                        <strong style={{ color: '#f5c518' }}>{c.usuario1_nombre}</strong> <span style={{ color: '#6a6058' }}>(chapa {c.usuario1_chapa})</span>
                        <br /><span style={{ color: '#8a8070', fontSize: '0.78rem' }}>Da el <strong style={{ color: '#e8e0d4' }}>{fmt(c.dia_que_da1)}</strong> y recibe el <strong style={{ color: '#e8e0d4' }}>{fmt(c.dia_que_pide1)}</strong></span>
                      </div>
                      <div style={{ textAlign: 'center', color: '#a78bfa', fontSize: '0.8rem' }}>↕</div>
                      <div style={{ fontSize: '0.85rem', padding: '0.5rem', background: '#1a1612', borderRadius: '2px', borderLeft: '2px solid #34d399' }}>
                        <strong style={{ color: '#34d399' }}>{c.usuario2_nombre}</strong> <span style={{ color: '#6a6058' }}>(chapa {c.usuario2_chapa})</span>
                        <br /><span style={{ color: '#8a8070', fontSize: '0.78rem' }}>Da el <strong style={{ color: '#e8e0d4' }}>{fmt(c.dia_que_da2)}</strong> y recibe el <strong style={{ color: '#e8e0d4' }}>{fmt(c.dia_que_pide2)}</strong></span>
                      </div>
                      <div style={{ textAlign: 'center', color: '#a78bfa', fontSize: '0.8rem' }}>↕</div>
                      <div style={{ fontSize: '0.85rem', padding: '0.5rem', background: '#1a1612', borderRadius: '2px', borderLeft: '2px solid #fb923c' }}>
                        <strong style={{ color: '#fb923c' }}>{c.usuario3_nombre}</strong> <span style={{ color: '#6a6058' }}>(chapa {c.usuario3_chapa})</span>
                        <br /><span style={{ color: '#8a8070', fontSize: '0.78rem' }}>Da el <strong style={{ color: '#e8e0d4' }}>{fmt(c.dia_que_da3)}</strong> y recibe el <strong style={{ color: '#e8e0d4' }}>{fmt(c.dia_que_pide3)}</strong></span>
                      </div>
                    </div>
                    <div className="modal-btns" style={{ marginTop: '0.75rem' }}>
                    {(esAdmin || c.usuario1_id === miId || c.usuario2_id === miId || c.usuario3_id === miId) && (
                      <button className="btn-amarillo" style={{ background: '#a78bfa', fontSize: '0.8rem' }}
                        onClick={async () => {
                          const { data: cadenaCreada } = await supabase.from('cadenas_intercambio').insert({
                            solicitud1_id: c.solicitud1_id,
                            solicitud2_id: c.solicitud2_id,
                            solicitud3_id: c.solicitud3_id,
                            usuario1_id: c.usuario1_id,
                            usuario2_id: c.usuario2_id,
                            usuario3_id: c.usuario3_id,
                          }).select().single()
                          if (cadenaCreada) {
                            await supabase.from('notificaciones').insert([
                              { user_id: c.usuario1_id, tipo: 'cadena', titulo: '🔗 Intercambio en cadena encontrado', mensaje: `Tú das el ${fmt(c.dia_que_da1)} y recibes el ${fmt(c.dia_que_pide1)}. Participantes: ${c.usuario2_nombre} y ${c.usuario3_nombre}. Confirma para completar.`, referencia_id: cadenaCreada.id },
                              { user_id: c.usuario2_id, tipo: 'cadena', titulo: '🔗 Intercambio en cadena encontrado', mensaje: `Tú das el ${fmt(c.dia_que_da2)} y recibes el ${fmt(c.dia_que_pide2)}. Participantes: ${c.usuario1_nombre} y ${c.usuario3_nombre}. Confirma para completar.`, referencia_id: cadenaCreada.id },
                              { user_id: c.usuario3_id, tipo: 'cadena', titulo: '🔗 Intercambio en cadena encontrado', mensaje: `Tú das el ${fmt(c.dia_que_da3)} y recibes el ${fmt(c.dia_que_pide3)}. Participantes: ${c.usuario1_nombre} y ${c.usuario2_nombre}. Confirma para completar.`, referencia_id: cadenaCreada.id },
                            ])
                            const emails = await Promise.all([
                              supabase.rpc('get_user_email', { p_user_id: c.usuario1_id }),
                              supabase.rpc('get_user_email', { p_user_id: c.usuario2_id }),
                              supabase.rpc('get_user_email', { p_user_id: c.usuario3_id }),
                            ])
                            const asunto = '🔗 Intercambio en cadena encontrado - DescansApp'
                            if (emails[0].data) await enviarEmail(emails[0].data, asunto, templateNotificacion('🔗 Intercambio en cadena encontrado', `Tú das el ${fmt(c.dia_que_da1)} y recibes el ${fmt(c.dia_que_pide1)}. Participantes: ${c.usuario2_nombre} y ${c.usuario3_nombre}. Entra en DescansApp para confirmar.`))
                            if (emails[1].data) await enviarEmail(emails[1].data, asunto, templateNotificacion('🔗 Intercambio en cadena encontrado', `Tú das el ${fmt(c.dia_que_da2)} y recibes el ${fmt(c.dia_que_pide2)}. Participantes: ${c.usuario1_nombre} y ${c.usuario3_nombre}. Entra en DescansApp para confirmar.`))
                            if (emails[2].data) await enviarEmail(emails[2].data, asunto, templateNotificacion('🔗 Intercambio en cadena encontrado', `Tú das el ${fmt(c.dia_que_da3)} y recibes el ${fmt(c.dia_que_pide3)}. Participantes: ${c.usuario1_nombre} y ${c.usuario2_nombre}. Entra en DescansApp para confirmar.`))
                          }
                          setCadenas(prev => prev.filter((_, idx) => idx !== i))
                        }}>
                        📨 NOTIFICAR A LOS 3
                      </button>
                    )}
                    </div>
                  </div>
                ))}
              </>
            )}
            <div className="modal-btns">
              <button className="btn-gris" onClick={() => setModalCadenas(false)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}
{/* MODAL: Soltar día */}
      {modalSoltar && (
        <div className="overlay" onClick={() => setModalSoltar(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>SOLTAR UN DÍA</h3>
            <p style={{ fontSize: '0.85rem', color: '#8a8070', marginBottom: '1rem' }}>
              Suelta un día de descanso. Si hay alguien en la lista de espera se lo asignaremos automáticamente.
            </p>
            <div className="field">
              <label>Día que sueltas</label>
              <input
                type="date"
                value={diaSoltar}
                min="2026-01-01"
                max="2026-12-31"
                onChange={e => setDiaSoltar(e.target.value)}
              />
              {diaSoltar && FESTIVOS_2026.includes(diaSoltar) && (
                <div className="festivo-aviso">⚠️ Festivo: {NOMBRES_FESTIVOS[diaSoltar]}</div>
              )}
            </div>
            <div className="modal-btns">
              <button
                className="btn-amarillo"
                style={{ background: '#fb923c' }}
                disabled={soltando || !diaSoltar}
                onClick={() => soltarDia(diaSoltar)}
              >
                {soltando ? 'SOLTANDO...' : 'SOLTAR DÍA'}
              </button>
              <button className="btn-gris" onClick={() => { setModalSoltar(false); setDiaSoltar('') }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
      {modalNueva && (
        <div className="overlay" onClick={() => setModalNueva(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>NUEVA SOLICITUD</h3>
            <div className="field">
              <label>Día que quiero</label>
              <input type="date" value={diaPedido} min="2026-01-01" max="2026-12-31"
                onChange={e => { setDiaPedido(e.target.value); buscarCoincidencias(e.target.value, diasOfrecidos) }} />
              {diaPedido && FESTIVOS_2026.includes(diaPedido) && (
                <div className="festivo-aviso">⚠️ Festivo: {NOMBRES_FESTIVOS[diaPedido]}</div>
              )}
            </div>
            <div className="field">
              <label>Días que ofrezco a cambio</label>
              {diasOfrecidos.map((d, i) => (
                <div key={i} className="dia-row">
                  <input type="date" value={d} min="2026-01-01" max="2026-12-31"
                    onChange={e => {
                      const nuevo = [...diasOfrecidos]
                      nuevo[i] = e.target.value
                      setDiasOfrecidos(nuevo)
                      buscarCoincidencias(diaPedido, nuevo)
                    }} />
                  {diasOfrecidos.length > 1 && (
                    <button className="btn-remove" onClick={() => setDiasOfrecidos(diasOfrecidos.filter((_,j) => j !== i))}>✕</button>
                  )}
                </div>
              ))}
              {diasOfrecidos.length < 5 && (
                <button className="btn-add" onClick={() => setDiasOfrecidos([...diasOfrecidos, ''])}>+ Añadir otro día</button>
              )}
            </div>
            {coincidencias.length > 0 && (
              <div className="seccion" style={{ background: '#1a2a1a', border: '1px solid #34d399', borderRadius: '3px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="seccion-titulo" style={{ color: '#34d399' }}>⚡ COINCIDENCIA ENCONTRADA</div>
                {coincidencias.map(s => (
                  <div key={s.id} style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#e8e0d4', marginBottom: '0.4rem' }}>
                      <strong>{s.profiles?.nombre} {s.profiles?.apellidos}</strong> (chapa {s.profiles?.chapa}) quiere exactamente lo que ofreces y tiene lo que quieres.
                    </div>
                    <button className="btn-amarillo" style={{ background: '#34d399', color: '#0f0f0f', fontSize: '0.8rem' }}
                      onClick={async () => {
                        const diaOfrecidoId = s.dias_ofrecidos?.find((d: any) => d.fecha === diaPedido)?.id
const diaOfrecidoIdFallback = s.dias_ofrecidos?.[0]?.id
const idFinal = diaOfrecidoId || diaOfrecidoIdFallback

                        if (idFinal) {
  const { error } = await supabase.rpc('aceptar_solicitud', {
    p_solicitud_id: s.id,
    p_aceptante_id: miId,
    p_dia_ofrecido_id: idFinal,
  })
  if (error) { alert('Error: ' + error.message); return }
  await cargar()
  setModalNueva(false)
  setDiaPedido('')
  setDiasOfrecidos([''])
  setCoincidencias([])
}
                      }}>
                      ⚡ INTERCAMBIO DIRECTO CON {s.profiles?.nombre?.toUpperCase()}
                    </button>
                  </div>
                ))}
                <div style={{ fontSize: '0.72rem', color: '#6a6058', marginTop: '0.5rem' }}>O puedes publicar tu solicitud normalmente:</div>
              </div>
            )}
            <div className="modal-btns">
              <button className="btn-amarillo"
                disabled={guardando || !diaPedido || diasOfrecidos.filter(d => d).length === 0}
                onClick={crearSolicitud}>
                {guardando ? 'GUARDANDO...' : 'PUBLICAR SOLICITUD'}
              </button>
              <button className="btn-gris" onClick={() => { setModalNueva(false); setDiaPedido(''); setDiasOfrecidos(['']); setCoincidencias([]) }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
<div className="barra-movil">
       <button style={{ background: '#f5c518', color: '#0f0f0f', fontSize: '0.85rem' }} onClick={() => setModalNueva(true)}>+ SOLICITUD</button>
        <button style={{ background: '#fb923c', color: '#0f0f0f', fontSize: '0.85rem' }} onClick={() => setModalSoltar(true)}>− SOLTAR DÍA</button>
        <button style={{ background: '#a78bfa', color: '#0f0f0f', fontSize: '0.85rem' }} onClick={buscarCadenas}>🔗 CADENAS</button>
      </div>
    </>
  )
}
export default function CalendarioPage() {
  return (
    <Suspense fallback={<div style={{ background:'#0f0f0f', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#f5c518', fontFamily:'sans-serif', fontSize:'1.5rem', letterSpacing:'3px' }}>CARGANDO...</div>}>
      <CalendarioContent />
    </Suspense>
  )
}
