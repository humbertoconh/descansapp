'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, getDaysInMonth, startOfMonth, getDay, isToday, differenceInDays, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

const MESES_VACACIONAL = [7, 8, 9, 12] // Julio, Agosto, Septiembre, Diciembre
const NOMBRES_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const COLORES_USUARIO = ['#f5c518','#60a5fa','#34d399','#f87171','#a78bfa','#fb923c','#e879f9','#2dd4bf','#facc15','#4ade80']

const fmt = (f: string) => f.split('-').reverse().join('/')

const diasEntre = (desde: string, hasta: string) =>
  differenceInDays(parseISO(hasta), parseISO(desde)) + 1

const hoy = new Date()
hoy.setHours(0, 0, 0, 0)
const limite7dias = new Date(hoy)
limite7dias.setDate(limite7dias.getDate() + 7)

function VacacionesContent() {
  const supabase = createClient()
  const [miId, setMiId] = useState('')
  const [miGrupo, setMiGrupo] = useState('')
  const [esAdmin, setEsAdmin] = useState(false)
  const [companyeros, setCompanyeros] = useState<any[]>([])
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [aceptaciones, setAceptaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal nueva solicitud
  const [modalNueva, setModalNueva] = useState(false)
  const [ofrecidoFlexible, setOfrecidoFlexible] = useState(false)
  const [buscadoFlexible, setBuscadoFlexible] = useState(false)
  const [ofrecidoDesde, setOfrecidoDesde] = useState('')
  const [ofrecidoHasta, setOfrecidoHasta] = useState('')
  const [ofrecidoMes, setOfrecidoMes] = useState('')
  const [buscadoDesde, setBuscadoDesde] = useState('')
  const [buscadoHasta, setBuscadoHasta] = useState('')
  const [buscadoMes, setBuscadoMes] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  // Modal día
  const [modalDia, setModalDia] = useState<{ fecha: string; solicitudes: any[] } | null>(null)

  // Modal detalle solicitud
  const [modalDetalle, setModalDetalle] = useState<any | null>(null)
  const [modalAceptar, setModalAceptar] = useState<any | null>(null)
  const [aceptandoDesde, setAceptandoDesde] = useState('')
  const [aceptandoHasta, setAceptandoHasta] = useState('')
  const [aceptandoMes, setAceptandoMes] = useState('')
  const [aceptandoFlexible, setAceptandoFlexible] = useState(false)
  const [aceptando, setAceptando] = useState(false)

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMiId(user.id)
    const { data: perfil } = await supabase.from('profiles').select('grupo, is_admin').eq('id', user.id).single()
    if (!perfil) return
    setMiGrupo(perfil.grupo)
    setEsAdmin(perfil.is_admin)
    const { data: perfiles } = await supabase.from('profiles').select('*').eq('grupo', perfil.grupo)
    setCompanyeros(perfiles || [])
    const ids = (perfiles || []).map((p: any) => p.id)
    const { data: sols } = await supabase
      .from('vacaciones_solicitudes')
      .select('*, profiles(nombre, apellidos, chapa)')
      .in('user_id', ids)
      .in('estado', ['abierta', 'esperando_confirmacion'])
    setSolicitudes(sols || [])
    const { data: acepts } = await supabase
      .from('vacaciones_aceptaciones')
      .select('*, profiles(nombre, apellidos, chapa)')
      .in('solicitud_id', (sols || []).map((s: any) => s.id))
    setAceptaciones(acepts || [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const channel = supabase.channel('vacaciones-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacaciones_solicitudes' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacaciones_aceptaciones' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const colorPorUsuario: Record<string, string> = {}
  companyeros.forEach((c, i) => { colorPorUsuario[c.id] = COLORES_USUARIO[i % COLORES_USUARIO.length] })

  // Calcular qué solicitudes afectan a cada fecha
  const solicitudesPorFecha: Record<string, any[]> = {}
  solicitudes.forEach(s => {
    if (!s.flexible_ofrecido && s.ofrecido_desde && s.ofrecido_hasta) {
      let d = parseISO(s.ofrecido_desde)
      const fin = parseISO(s.ofrecido_hasta)
      while (d <= fin) {
        const key = format(d, 'yyyy-MM-dd')
        if (!solicitudesPorFecha[key]) solicitudesPorFecha[key] = []
        if (!solicitudesPorFecha[key].find(x => x.id === s.id)) solicitudesPorFecha[key].push({ ...s, rol: 'ofrece' })
        d = addDays(d, 1)
      }
    }
    if (!s.flexible_buscado && s.buscado_desde && s.buscado_hasta) {
      let d = parseISO(s.buscado_desde)
      const fin = parseISO(s.buscado_hasta)
      while (d <= fin) {
        const key = format(d, 'yyyy-MM-dd')
        if (!solicitudesPorFecha[key]) solicitudesPorFecha[key] = []
        if (!solicitudesPorFecha[key].find(x => x.id === s.id && x.rol === 'busca')) solicitudesPorFecha[key].push({ ...s, rol: 'busca' })
        d = addDays(d, 1)
      }
    }
  })

  const validarFormulario = () => {
    // Validar lado ofrecido
    if (!ofrecidoFlexible) {
      if (!ofrecidoDesde || !ofrecidoHasta) return 'Indica las fechas que ofreces'
      if (ofrecidoDesde > ofrecidoHasta) return 'La fecha de inicio debe ser anterior a la de fin'
      if (parseISO(ofrecidoDesde) <= limite7dias) return 'Los días ofrecidos deben ser con más de 7 días de antelación'
    } else {
      if (!ofrecidoMes) return 'Indica el mes que ofreces'
    }
    // Validar lado buscado
    if (!buscadoFlexible) {
      if (!buscadoDesde || !buscadoHasta) return 'Indica las fechas que buscas'
      if (buscadoDesde > buscadoHasta) return 'La fecha de inicio debe ser anterior a la de fin'
      if (parseISO(buscadoDesde) <= limite7dias) return 'Los días buscados deben ser con más de 7 días de antelación'
    } else {
      if (!buscadoMes) return 'Indica el mes que buscas'
    }
    // Validar mismo número de días si ambos son exactos
    if (!ofrecidoFlexible && !buscadoFlexible) {
      const diasOfrece = diasEntre(ofrecidoDesde, ofrecidoHasta)
      const diasBusca = diasEntre(buscadoDesde, buscadoHasta)
      if (diasOfrece !== diasBusca) return `Los días ofrecidos (${diasOfrece}) y buscados (${diasBusca}) deben ser la misma cantidad`
    }
    return ''
  }

  const crearSolicitud = async () => {
    const error = validarFormulario()
    if (error) { setErrorForm(error); return }
    setGuardando(true)
    setErrorForm('')
    const numDias = !ofrecidoFlexible && !buscadoFlexible
      ? diasEntre(ofrecidoDesde, ofrecidoHasta)
      : ofrecidoFlexible && !buscadoFlexible
      ? diasEntre(buscadoDesde, buscadoHasta)
      : !ofrecidoFlexible && buscadoFlexible
      ? diasEntre(ofrecidoDesde, ofrecidoHasta)
      : 7 // flexible-flexible: referencia de 7 días

    await supabase.from('vacaciones_solicitudes').insert({
      user_id: miId,
      grupo: miGrupo,
      ofrecido_desde: ofrecidoFlexible ? null : ofrecidoDesde,
      ofrecido_hasta: ofrecidoFlexible ? null : ofrecidoHasta,
      ofrecido_mes: ofrecidoFlexible ? ofrecidoMes : null,
      buscado_desde: buscadoFlexible ? null : buscadoDesde,
      buscado_hasta: buscadoFlexible ? null : buscadoHasta,
      buscado_mes: buscadoFlexible ? buscadoMes : null,
      num_dias: numDias,
      flexible_ofrecido: ofrecidoFlexible,
      flexible_buscado: buscadoFlexible,
    })
    await cargar()
    setModalNueva(false)
    resetForm()
    setGuardando(false)
  }

  const resetForm = () => {
    setOfrecidoFlexible(false); setBuscadoFlexible(false)
    setOfrecidoDesde(''); setOfrecidoHasta(''); setOfrecidoMes('')
    setBuscadoDesde(''); setBuscadoHasta(''); setBuscadoMes('')
    setErrorForm('')
  }

  const cancelarSolicitud = async (id: string) => {
    await supabase.from('vacaciones_solicitudes').update({ estado: 'cancelada' }).eq('id', id)
    await cargar()
    setModalDetalle(null)
  }

  const aceptarSolicitud = async () => {
    if (!modalAceptar) return
    setAceptando(true)
    await supabase.from('vacaciones_aceptaciones').insert({
      solicitud_id: modalAceptar.id,
      aceptante_id: miId,
      ofrecido_desde: aceptandoFlexible ? null : aceptandoDesde,
      ofrecido_hasta: aceptandoFlexible ? null : aceptandoHasta,
      ofrecido_mes: aceptandoFlexible ? aceptandoMes : null,
      flexible: aceptandoFlexible,
    })
    await supabase.from('vacaciones_solicitudes').update({ estado: 'esperando_confirmacion' }).eq('id', modalAceptar.id)
    await cargar()
    setModalAceptar(null)
    setAceptandoDesde(''); setAceptandoHasta(''); setAceptandoMes(''); setAceptandoFlexible(false)
    setAceptando(false)
  }

  const confirmarIntercambio = async (solicitudId: string) => {
    await supabase.from('vacaciones_solicitudes').update({ estado: 'confirmada' }).eq('id', solicitudId)
    await cargar()
    setModalDetalle(null)
  }

  if (loading) return (
    <div style={{ background: '#f5f0eb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4a520', fontFamily: 'sans-serif', fontSize: '1.5rem', letterSpacing: '3px' }}>
      CARGANDO...
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f0eb; color: #1a1612; font-family: 'DM Sans', sans-serif; }
        .vac-page { padding: 2rem; max-width: 1400px; margin: 0 auto; }
        .vac-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #d0c8c0; gap: 1rem; flex-wrap: wrap; }
        .vac-header h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; letter-spacing: 3px; color: #c4a520; }
        .vac-header p { color: #8a8070; font-size: 0.8rem; margin-top: 0.2rem; }
        .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; }
        .leyenda { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: flex-end; }
        .leyenda-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #8a8070; }
        .leyenda-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
        .btn-nueva { background: #f5c518; color: #0f0f0f; border: none; padding: 0.6rem 1.5rem; font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; cursor: pointer; border-radius: 2px; }
        .btn-nueva:hover { background: #ffd740; }
        .meses-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .mes { border: 1px solid #e0d8d0; border-radius: 4px; padding: 1rem; position: relative; }
        .mes.vacacional { background: #fff; border-color: #f5c518; }
        .mes.normal { background: #fff; }
        .mes-titulo { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; color: #c4a520; margin-bottom: 0.75rem; text-align: center; }
        .mes.vacacional .mes-titulo { color: #b8920a; }
        .mes-badge-vac { font-size: 0.55rem; background: #f5c518; color: #0f0f0f; border-radius: 2px; padding: 0.1rem 0.4rem; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; position: absolute; top: 0.75rem; right: 0.75rem; }
        .dias-semana { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 0.25rem; }
        .dia-semana { text-align: center; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1px; color: #8a8070; padding: 0.2rem 0; }
        .dias-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dia { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.7rem; border-radius: 3px; cursor: pointer; position: relative; transition: transform 0.1s; border: 1px solid transparent; background: #f0ebe5; color: #4a4038; overflow: hidden; }
        .dia:hover { transform: scale(1.15); z-index: 10; }
        .dia.vacio { cursor: default; pointer-events: none; background: transparent; border: none; }
        .dia.hoy { border-color: #f5c518 !important; }
        .dia.bloqueado { background: #e8e4e0 !important; color: #b8b0a8 !important; cursor: default; pointer-events: none; }
        .dia.vacacional-bg { background: #fdf8e8; }
        .dia-num { font-size: 0.7rem; line-height: 1; position: relative; z-index: 2; }
        .dia-barras { position: absolute; bottom: 0; left: 0; right: 0; display: flex; flex-direction: column; gap: 1px; }
        .dia-barra { height: 4px; width: 100%; opacity: 0.85; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
        .modal { background: #fff; border: 1px solid #e0d8d0; border-left: 3px solid #c4a520; padding: 1.5rem; width: 100%; max-width: 520px; border-radius: 4px; max-height: 90vh; overflow-y: auto; }
        .modal h3 { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 2px; color: #c4a520; margin-bottom: 1rem; }
        .seccion { margin-top: 1rem; }
        .seccion-titulo { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; margin-bottom: 0.5rem; border-bottom: 1px solid #e0d8d0; padding-bottom: 0.3rem; }
        .solicitud-card { background: #f5f0eb; border: 1px solid #e0d8d0; border-radius: 3px; padding: 0.75rem; margin-bottom: 0.5rem; }
        .sol-usuario { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .tag { font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 2px; font-weight: 500; }
        .tag-yo { background: #2a2010; color: #f5c518; }
        .tag-espera { background: #1a2a1a; color: #34d399; }
        .modal-btns { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
        .btn-amarillo { background: #f5c518; color: #0f0f0f; border: none; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-amarillo:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-gris { background: transparent; color: #8a8070; border: 1px solid #d0c8c0; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-rojo { background: transparent; color: #e05050; border: 1px solid #c04040; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
        .field label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; }
        .field input[type=date], .field select { background: #f0ebe5; border: 1px solid #d0c8c0; color: #1a1612; padding: 0.6rem 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; border-radius: 2px; width: 100%; }
        .field input[type=date]:focus, .field select:focus { border-color: #f5c518; }
        .toggle-flexible { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; cursor: pointer; font-size: 0.8rem; color: #4a4038; }
        .toggle-flexible input { cursor: pointer; accent-color: #f5c518; width: 16px; height: 16px; }
        .bloque-lado { background: #f5f0eb; border: 1px solid #e0d8d0; border-radius: 3px; padding: 0.75rem; margin-bottom: 0.75rem; }
        .bloque-lado-titulo { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; margin-bottom: 0.5rem; }
        .error-form { color: #c04040; font-size: 0.8rem; background: #fde8e8; border-radius: 3px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; }
        .rango-display { font-size: 0.82rem; color: #4a4038; }
        .rango-display strong { color: #c4a520; }
        .dias-count { font-size: 0.72rem; color: #8a8070; margin-top: 0.25rem; }
        .vac-lista { margin-top: 2rem; }
        .vac-lista-titulo { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 2px; color: #c4a520; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e0d8d0; }
        .vac-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .vac-card { background: #fff; border: 1px solid #e0d8d0; border-radius: 4px; padding: 1rem; border-left: 3px solid; cursor: pointer; transition: box-shadow 0.15s; }
        .vac-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .vac-card-usuario { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.75rem; }
        .vac-card-rango { font-size: 0.82rem; color: #4a4038; line-height: 1.8; }
        .vac-card-rango .label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; color: #8a8070; display: block; }
        .vac-card-rango .valor { color: #1a1612; font-weight: 500; }
        .vac-card-rango .flexible-tag { background: #e0f0ff; color: #2060a0; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 2px; }
        .estado-pill { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 2px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }
        .barra-movil { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #1a1612; border-top: 1px solid #2a2420; padding: 0.5rem 1rem; gap: 0.5rem; z-index: 50; flex-wrap: wrap; justify-content: center; }
        .barra-movil button { flex: 1; min-width: 80px; padding: 0.5rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.8rem; letter-spacing: 1px; border: none; border-radius: 2px; cursor: pointer; }
        @media (max-width: 1100px) { .meses-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { .meses-grid { grid-template-columns: repeat(2, 1fr); } .vac-page { padding: 1rem; padding-bottom: 80px; } .barra-movil { display: flex !important; } }
        @media (max-width: 500px) { .meses-grid { grid-template-columns: 1fr; } .vac-header { flex-direction: column; } }
        @media (max-width: 768px) { .overlay { align-items: flex-end !important; padding: 0 !important; } .modal { border-radius: 12px 12px 0 0 !important; max-height: 85vh !important; border-left: none !important; border-top: 3px solid #c4a520 !important; } .barra-movil { display: flex !important; } }
      `}</style>

      <div className="vac-page">
        <div className="vac-header">
          <div>
            <h1>VACACIONES</h1>
            <p>Intercambios de días de vacaciones entre compañeros del mismo grupo</p>
            {miGrupo && (
              <div style={{ marginTop: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #e0d8d0', borderRadius: '3px', padding: '0.3rem 0.8rem' }}>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8a8070' }}>Tu grupo:</span>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '2px', color: '#c4a520' }}>{miGrupo}</span>
              </div>
            )}
          </div>
          <div className="header-right">
            <button className="btn-nueva" onClick={() => setModalNueva(true)}>+ NUEVO INTERCAMBIO</button>
            <div className="leyenda">
              <div className="leyenda-item">
                <div className="leyenda-dot" style={{ background: '#f5c518' }} />
                Periodo vacacional
              </div>
              <div className="leyenda-item">
                <div className="leyenda-dot" style={{ background: '#60a5fa' }} />
                Días que ofrecen
              </div>
              <div className="leyenda-item">
                <div className="leyenda-dot" style={{ background: '#f87171' }} />
                Días que buscan
              </div>
            </div>
          </div>
        </div>

        {/* CALENDARIO ANUAL */}
        <div className="meses-grid">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
            const esVacacional = MESES_VACACIONAL.includes(mes)
            const anyo = new Date().getFullYear()
            const fecha = new Date(anyo, mes - 1, 1)
            const diasEnMes = getDaysInMonth(fecha)
            const primerDia = (getDay(startOfMonth(fecha)) + 6) % 7
            const nombreMes = NOMBRES_MESES[mes - 1]

            return (
              <div key={mes} className={`mes ${esVacacional ? 'vacacional' : 'normal'}`}>
                {esVacacional && <span className="mes-badge-vac">VACACIONAL</span>}
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
                    const fechaStr = `${anyo}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                    const esHoyDia = isToday(new Date(anyo, mes - 1, dia))
                    const fechaDia = new Date(anyo, mes - 1, dia)
                    const estaBloqueado = fechaDia <= limite7dias
                    const solsDelDia = solicitudesPorFecha[fechaStr] || []
                    const ofrece = solsDelDia.filter(s => s.rol === 'ofrece')
                    const busca = solsDelDia.filter(s => s.rol === 'busca')

                    return (
                      <div
                        key={dia}
                        className={`dia${esHoyDia ? ' hoy' : ''}${estaBloqueado ? ' bloqueado' : ''}${esVacacional && !estaBloqueado ? ' vacacional-bg' : ''}`}
                        onClick={() => !estaBloqueado && solsDelDia.length > 0 && setModalDia({ fecha: fechaStr, solicitudes: solsDelDia })}
                        style={{ cursor: solsDelDia.length > 0 && !estaBloqueado ? 'pointer' : 'default' }}
                      >
                        <span className="dia-num">{dia}</span>
                        {(ofrece.length > 0 || busca.length > 0) && !estaBloqueado && (
                          <div className="dia-barras">
                            {ofrece.slice(0, 2).map((s, idx) => (
                              <div key={idx} className="dia-barra" style={{ background: colorPorUsuario[s.user_id] || '#60a5fa' }} />
                            ))}
                            {busca.slice(0, 2).map((s, idx) => (
                              <div key={idx} className="dia-barra" style={{ background: '#f87171', opacity: 0.6 }} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* LISTA DE SOLICITUDES */}
        <div className="vac-lista">
          <div className="vac-lista-titulo">SOLICITUDES ACTIVAS ({solicitudes.length})</div>
          {solicitudes.length === 0 ? (
            <p style={{ color: '#8a8070', fontSize: '0.85rem' }}>No hay solicitudes de intercambio activas en tu grupo.</p>
          ) : (
            <div className="vac-cards">
              {solicitudes.map(s => {
                const color = colorPorUsuario[s.user_id] || '#8a8070'
                const esYo = s.user_id === miId
                const acept = aceptaciones.find(a => a.solicitud_id === s.id)
                return (
                  <div key={s.id} className="vac-card" style={{ borderLeftColor: color }} onClick={() => setModalDetalle(s)}>
                    <div className="vac-card-usuario">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span>{s.profiles?.nombre} {s.profiles?.apellidos}</span>
                      {esYo && <span className="tag tag-yo">YO</span>}
                      {s.estado === 'esperando_confirmacion' && (
                        <span className="estado-pill" style={{ background: '#fef3c7', color: '#92400e' }}>ESPERANDO</span>
                      )}
                    </div>
                    <div className="vac-card-rango">
                      <span className="label">Ofrece</span>
                      {s.flexible_ofrecido
                        ? <span className="valor">Cualquier semana de <span className="flexible-tag">{s.ofrecido_mes}</span></span>
                        : <span className="valor">{fmt(s.ofrecido_desde)} → {fmt(s.ofrecido_hasta)} <span style={{ color: '#8a8070', fontSize: '0.75rem' }}>({diasEntre(s.ofrecido_desde, s.ofrecido_hasta)} días)</span></span>
                      }
                      <span className="label" style={{ marginTop: '0.4rem' }}>Busca</span>
                      {s.flexible_buscado
                        ? <span className="valor">Cualquier semana de <span className="flexible-tag">{s.buscado_mes}</span></span>
                        : <span className="valor">{fmt(s.buscado_desde)} → {fmt(s.buscado_hasta)} <span style={{ color: '#8a8070', fontSize: '0.75rem' }}>({diasEntre(s.buscado_desde, s.buscado_hasta)} días)</span></span>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Día del calendario */}
      {modalDia && (
        <div className="overlay" onClick={() => setModalDia(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>📅 {fmt(modalDia.fecha)}</h3>
            <div className="seccion">
              <div className="seccion-titulo">Solicitudes en este día</div>
              {[...new Map(modalDia.solicitudes.map(s => [s.id, s])).values()].map(s => (
                <div key={s.id} className="solicitud-card" style={{ cursor: 'pointer', borderLeft: `3px solid ${colorPorUsuario[s.user_id] || '#8a8070'}` }}
                  onClick={() => { setModalDetalle(s); setModalDia(null) }}>
                  <div className="sol-usuario">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorPorUsuario[s.user_id] || '#8a8070', flexShrink: 0 }} />
                    {s.profiles?.nombre} {s.profiles?.apellidos}
                    {s.user_id === miId && <span className="tag tag-yo">YO</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#4a4038' }}>
                    <strong>Ofrece:</strong> {s.flexible_ofrecido ? `Cualquier semana de ${s.ofrecido_mes}` : `${fmt(s.ofrecido_desde)} → ${fmt(s.ofrecido_hasta)}`}<br />
                    <strong>Busca:</strong> {s.flexible_buscado ? `Cualquier semana de ${s.buscado_mes}` : `${fmt(s.buscado_desde)} → ${fmt(s.buscado_hasta)}`}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-btns">
              <button className="btn-gris" onClick={() => setModalDia(null)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalle solicitud */}
      {modalDetalle && (
        <div className="overlay" onClick={() => setModalDetalle(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>INTERCAMBIO DE VACACIONES</h3>
            <div className="solicitud-card" style={{ borderLeft: `3px solid ${colorPorUsuario[modalDetalle.user_id] || '#8a8070'}` }}>
              <div className="sol-usuario">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorPorUsuario[modalDetalle.user_id] || '#8a8070', flexShrink: 0 }} />
                <strong>{modalDetalle.profiles?.nombre} {modalDetalle.profiles?.apellidos}</strong>
                <span style={{ color: '#8a8070', fontSize: '0.78rem' }}>chapa {modalDetalle.profiles?.chapa}</span>
                {modalDetalle.user_id === miId && <span className="tag tag-yo">YO</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#4a4038', lineHeight: 2 }}>
                <div>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#8a8070' }}>Ofrece </span>
                  {modalDetalle.flexible_ofrecido
                    ? <strong>Cualquier semana de {modalDetalle.ofrecido_mes}</strong>
                    : <strong>{fmt(modalDetalle.ofrecido_desde)} → {fmt(modalDetalle.ofrecido_hasta)} ({diasEntre(modalDetalle.ofrecido_desde, modalDetalle.ofrecido_hasta)} días)</strong>
                  }
                </div>
                <div>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#8a8070' }}>Busca </span>
                  {modalDetalle.flexible_buscado
                    ? <strong>Cualquier semana de {modalDetalle.buscado_mes}</strong>
                    : <strong>{fmt(modalDetalle.buscado_desde)} → {fmt(modalDetalle.buscado_hasta)} ({diasEntre(modalDetalle.buscado_desde, modalDetalle.buscado_hasta)} días)</strong>
                  }
                </div>
              </div>
            </div>

            {/* Si hay aceptación pendiente y soy el solicitante */}
            {modalDetalle.estado === 'esperando_confirmacion' && modalDetalle.user_id === miId && (() => {
              const acept = aceptaciones.find(a => a.solicitud_id === modalDetalle.id)
              return acept ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '3px', padding: '0.75rem', marginTop: '0.75rem', fontSize: '0.82rem' }}>
                  <strong style={{ color: '#166534' }}>✓ {acept.profiles?.nombre} {acept.profiles?.apellidos}</strong> acepta el intercambio.<br />
                  <span style={{ color: '#4a4038' }}>
                    Te ofrece: {acept.flexible ? `Cualquier semana de ${acept.ofrecido_mes}` : `${fmt(acept.ofrecido_desde)} → ${fmt(acept.ofrecido_hasta)}`}
                  </span>
                  <div className="modal-btns" style={{ marginTop: '0.5rem' }}>
                    <button className="btn-amarillo" onClick={() => confirmarIntercambio(modalDetalle.id)}>✓ CONFIRMAR INTERCAMBIO</button>
                  </div>
                </div>
              ) : null
            })()}

            <div className="modal-btns">
              {modalDetalle.user_id !== miId && modalDetalle.estado === 'abierta' && (
                <button className="btn-amarillo" onClick={() => { setModalAceptar(modalDetalle); setModalDetalle(null) }}>
                  PROPONER INTERCAMBIO
                </button>
              )}
              {modalDetalle.user_id === miId && modalDetalle.estado === 'abierta' && (
                <button className="btn-rojo" onClick={() => cancelarSolicitud(modalDetalle.id)}>CANCELAR SOLICITUD</button>
              )}
              <button className="btn-gris" onClick={() => setModalDetalle(null)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Aceptar intercambio */}
      {modalAceptar && (
        <div className="overlay" onClick={() => setModalAceptar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>PROPONER INTERCAMBIO</h3>
            <p style={{ fontSize: '0.82rem', color: '#8a8070', marginBottom: '1rem' }}>
              <strong style={{ color: '#1a1612' }}>{modalAceptar.profiles?.nombre}</strong> busca{' '}
              {modalAceptar.flexible_buscado
                ? `cualquier semana de ${modalAceptar.buscado_mes}`
                : `${fmt(modalAceptar.buscado_desde)} → ${fmt(modalAceptar.buscado_hasta)}`
              }. Indica qué días le ofreces tú:
            </p>
            <label className="toggle-flexible">
              <input type="checkbox" checked={aceptandoFlexible} onChange={e => setAceptandoFlexible(e.target.checked)} />
              Ofrezco días flexibles (cualquier semana de un mes)
            </label>
            {aceptandoFlexible ? (
              <div className="field">
                <label>Mes que ofreces</label>
                <select value={aceptandoMes} onChange={e => setAceptandoMes(e.target.value)}>
                  <option value="">Selecciona mes...</option>
                  {NOMBRES_MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Desde</label>
                  <input type="date" value={aceptandoDesde} onChange={e => setAceptandoDesde(e.target.value)} />
                </div>
                <div className="field">
                  <label>Hasta</label>
                  <input type="date" value={aceptandoHasta} onChange={e => setAceptandoHasta(e.target.value)} />
                </div>
                {aceptandoDesde && aceptandoHasta && aceptandoDesde <= aceptandoHasta && (
                  <div className="dias-count">
                    {diasEntre(aceptandoDesde, aceptandoHasta)} días seleccionados
                    {!modalAceptar.flexible_buscado && ` (necesitas ${diasEntre(modalAceptar.buscado_desde, modalAceptar.buscado_hasta)})`}
                  </div>
                )}
              </>
            )}
            <div className="modal-btns">
              <button className="btn-amarillo" disabled={aceptando} onClick={aceptarSolicitud}>
                {aceptando ? 'ENVIANDO...' : 'ENVIAR PROPUESTA'}
              </button>
              <button className="btn-gris" onClick={() => setModalAceptar(null)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nueva solicitud */}
      {modalNueva && (
        <div className="overlay" onClick={() => { setModalNueva(false); resetForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>NUEVO INTERCAMBIO</h3>
            <p style={{ fontSize: '0.8rem', color: '#8a8070', marginBottom: '1rem' }}>
              Publica qué días ofreces y qué días buscas a cambio. Mínimo 7 días de antelación.
            </p>

            {/* LADO OFRECIDO */}
            <div className="bloque-lado">
              <div className="bloque-lado-titulo">📤 LO QUE OFRECES</div>
              <label className="toggle-flexible">
                <input type="checkbox" checked={ofrecidoFlexible} onChange={e => setOfrecidoFlexible(e.target.checked)} />
                Flexible (cualquier semana de un mes)
              </label>
              {ofrecidoFlexible ? (
                <div className="field">
                  <label>Mes que ofreces</label>
                  <select value={ofrecidoMes} onChange={e => setOfrecidoMes(e.target.value)}>
                    <option value="">Selecciona mes...</option>
                    {NOMBRES_MESES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <div className="field">
                    <label>Desde</label>
                    <input type="date" value={ofrecidoDesde} onChange={e => setOfrecidoDesde(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Hasta</label>
                    <input type="date" value={ofrecidoHasta} onChange={e => setOfrecidoHasta(e.target.value)} />
                  </div>
                  {ofrecidoDesde && ofrecidoHasta && ofrecidoDesde <= ofrecidoHasta && (
                    <div className="dias-count">{diasEntre(ofrecidoDesde, ofrecidoHasta)} días seleccionados</div>
                  )}
                </>
              )}
            </div>

            {/* LADO BUSCADO */}
            <div className="bloque-lado">
              <div className="bloque-lado-titulo">📥 LO QUE BUSCAS</div>
              <label className="toggle-flexible">
                <input type="checkbox" checked={buscadoFlexible} onChange={e => setBuscadoFlexible(e.target.checked)} />
                Flexible (cualquier semana de un mes)
              </label>
              {buscadoFlexible ? (
                <div className="field">
                  <label>Mes que buscas</label>
                  <select value={buscadoMes} onChange={e => setBuscadoMes(e.target.value)}>
                    <option value="">Selecciona mes...</option>
                    {NOMBRES_MESES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <div className="field">
                    <label>Desde</label>
                    <input type="date" value={buscadoDesde} onChange={e => setBuscadoDesde(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Hasta</label>
                    <input type="date" value={buscadoHasta} onChange={e => setBuscadoHasta(e.target.value)} />
                  </div>
                  {buscadoDesde && buscadoHasta && buscadoDesde <= buscadoHasta && (
                    <div className="dias-count">{diasEntre(buscadoDesde, buscadoHasta)} días seleccionados</div>
                  )}
                </>
              )}
            </div>

            {errorForm && <div className="error-form">⚠️ {errorForm}</div>}

            <div className="modal-btns">
              <button className="btn-amarillo" disabled={guardando} onClick={crearSolicitud}>
                {guardando ? 'PUBLICANDO...' : 'PUBLICAR SOLICITUD'}
              </button>
              <button className="btn-gris" onClick={() => { setModalNueva(false); resetForm() }}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="barra-movil">
        <button style={{ background: '#f5c518', color: '#0f0f0f' }} onClick={() => setModalNueva(true)}>+ INTERCAMBIO</button>
      </div>
    </>
  )
}

export default function VacacionesPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#f5f0eb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4a520', fontFamily: 'sans-serif', fontSize: '1.5rem', letterSpacing: '3px' }}>
        CARGANDO...
      </div>
    }>
      <VacacionesContent />
    </Suspense>
  )
}