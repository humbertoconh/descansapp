'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, getDaysInMonth, startOfMonth, getDay, isToday, differenceInDays, addDays, parseISO, getDay as getDayOfWeek, addMonths, subMonths } from 'date-fns'
import { Suspense } from 'react'
import { enviarEmail, templateNotificacion } from '@/lib/email'

export const dynamic = 'force-dynamic'

const MESES_VACACIONAL = [7, 8, 9, 12]
const NOMBRES_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const COLORES_USUARIO = ['#f5c518','#60a5fa','#34d399','#f87171','#a78bfa','#fb923c','#e879f9','#2dd4bf','#facc15','#4ade80']

const fmt = (f: string) => f ? f.split('-').reverse().join('/') : ''
const diasEntre = (desde: string, hasta: string) => differenceInDays(parseISO(hasta), parseISO(desde)) + 1
const toDateStr = (d: Date) => format(d, 'yyyy-MM-dd')

const hoy = new Date()
hoy.setHours(0, 0, 0, 0)
const limite7dias = new Date(hoy)
limite7dias.setDate(limite7dias.getDate() + 7)

const esPeriodoVacacional = (fechaStr: string) => MESES_VACACIONAL.includes(parseInt(fechaStr.split('-')[1]))

const incluyeFindeSemana = (desde: string, hasta: string): boolean => {
  let d = parseISO(desde)
  const fin = parseISO(hasta)
  while (d <= fin) {
    const dow = getDayOfWeek(d)
    if (dow === 0 || dow === 6) return true
    d = addDays(d, 1)
  }
  return false
}

const todosEnPeriodoVacacional = (desde: string, hasta: string): boolean => {
  let d = parseISO(desde)
  const fin = parseISO(hasta)
  while (d <= fin) {
    if (!esPeriodoVacacional(format(d, 'yyyy-MM-dd'))) return false
    d = addDays(d, 1)
  }
  return true
}

const validarRango = (desde: string, hasta: string): string => {
  if (!desde || !hasta) return ''
  if (desde > hasta) return 'La fecha inicio debe ser anterior a la de fin'
  const numDias = diasEntre(desde, hasta)
  const todoVacacional = todosEnPeriodoVacacional(desde, hasta)
  const tieneFinde = incluyeFindeSemana(desde, hasta)
  if (!todoVacacional && tieneFinde && numDias < 7)
    return 'Fuera del periodo vacacional, para incluir fin de semana necesitas mínimo 7 días consecutivos'
  return ''
}

// ─── SELECTOR DE FECHA ───────────────────────────────────────────────────────
function DatePicker({ value, onChange, label, mesInicial, minDate, maxDate, abreHacia = 'arriba' }: {
  value: string; onChange: (v: string) => void; label: string
  mesInicial?: Date; minDate?: Date; maxDate?: Date; abreHacia?: 'arriba' | 'abajo'
}) {
  const [abierto, setAbierto] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mesActual, setMesActual] = useState<Date>(() => {
    if (value) return new Date(value + 'T00:00:00')
    if (mesInicial) return new Date(mesInicial.getFullYear(), mesInicial.getMonth(), 1)
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (abierto) {
      if (value) setMesActual(new Date(value + 'T00:00:00'))
      else if (mesInicial) setMesActual(new Date(mesInicial.getFullYear(), mesInicial.getMonth(), 1))
      if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    }
  }, [abierto, mesInicial?.getTime()])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.closest('[data-datepicker]')?.contains(e.target as Node)) setAbierto(false)
    }
    if (abierto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [abierto])

  const diasEnMes = getDaysInMonth(mesActual)
  const primerDia = (getDay(startOfMonth(mesActual)) + 6) % 7
  const anyo = mesActual.getFullYear()
  const mes = mesActual.getMonth()

  const esDiaValido = (dia: number) => {
    const fecha = new Date(anyo, mes, dia)
    if (minDate && fecha < minDate) return false
    if (maxDate && fecha > maxDate) return false
    return true
  }

  const seleccionar = (dia: number) => {
    if (!esDiaValido(dia)) return
    onChange(toDateStr(new Date(anyo, mes, dia)))
    setAbierto(false)
  }

  const calendarStyle: React.CSSProperties = rect ? {
    position: 'fixed', left: rect.left, width: rect.width, zIndex: 9999,
    background: '#fff', border: '1px solid #e0d8d0', borderRadius: '4px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)', padding: '0.75rem',
    ...(abreHacia === 'abajo' ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 })
  } : { display: 'none' }

  return (
    <div data-datepicker="true" style={{ position: 'relative', marginBottom: '0.75rem' }}>
      <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8a8070', display: 'block', marginBottom: '0.35rem' }}>{label}</label>
      <button ref={btnRef} type="button"
        onClick={() => { setAbierto(!abierto); if (!abierto && btnRef.current) setRect(btnRef.current.getBoundingClientRect()) }}
        style={{ width: '100%', background: '#f0ebe5', border: `1px solid ${abierto ? '#f5c518' : '#d0c8c0'}`, color: value ? '#1a1612' : '#8a8070', padding: '0.6rem 0.8rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', borderRadius: '2px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{value ? fmt(value) : 'Selecciona fecha...'}</span>
        <span style={{ fontSize: '0.8rem' }}>📅</span>
      </button>
      {abierto && rect && (
        <div style={calendarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <button type="button" onClick={() => setMesActual(subMonths(mesActual, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4038', fontSize: '1.2rem', padding: '0.25rem 0.5rem' }}>‹</button>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '2px', color: '#c4a520' }}>{NOMBRES_MESES[mes]} {anyo}</span>
            <button type="button" onClick={() => setMesActual(addMonths(mesActual, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4038', fontSize: '1.2rem', padding: '0.25rem 0.5rem' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.25rem' }}>
            {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', color: '#8a8070', textTransform: 'uppercase', padding: '0.2rem 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: primerDia }, (_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: diasEnMes }, (_, i) => {
              const dia = i + 1
              const fechaStr = toDateStr(new Date(anyo, mes, dia))
              const valido = esDiaValido(dia)
              const esHoyDia = isToday(new Date(anyo, mes, dia))
              const seleccionado = value === fechaStr
              const esVac = esPeriodoVacacional(fechaStr)
              return (
                <button key={dia} type="button" disabled={!valido} onClick={() => seleccionar(dia)}
                  style={{ aspectRatio: '1', border: seleccionado ? '2px solid #f5c518' : esHoyDia ? '1px solid #c4a520' : '1px solid transparent', borderRadius: '3px', cursor: valido ? 'pointer' : 'default', background: seleccionado ? '#f5c518' : esVac ? '#fffbf0' : '#f0ebe5', color: seleccionado ? '#0f0f0f' : !valido ? '#c8c0b8' : '#1a1612', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {dia}
                </button>
              )
            })}
          </div>
          {value && (
            <button type="button" onClick={() => { onChange(''); setAbierto(false) }}
              style={{ marginTop: '0.5rem', width: '100%', background: 'none', border: '1px solid #e0d8d0', color: '#8a8070', padding: '0.3rem', fontSize: '0.75rem', borderRadius: '2px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Limpiar fecha
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function VacacionesContent() {
  const supabase = createClient()
  const [miId, setMiId] = useState('')
  const [miGrupo, setMiGrupo] = useState('')
  const [companyeros, setCompanyeros] = useState<any[]>([])
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [aceptaciones, setAceptaciones] = useState<any[]>([])
  const [cadenas, setCadenas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [modalNueva, setModalNueva] = useState(false)
  const [ofrecidoFlexible, setOfrecidoFlexible] = useState(false)
  const [ofrecidoDesde, setOfrecidoDesde] = useState('')
  const [ofrecidoHasta, setOfrecidoHasta] = useState('')
  const [ofrecidoNumDias, setOfrecidoNumDias] = useState(7)
  const [ofrecidoVentanaDesde, setOfrecidoVentanaDesde] = useState('')
  const [ofrecidoVentanaHasta, setOfrecidoVentanaHasta] = useState('')
  const [buscadoFlexible, setBuscadoFlexible] = useState(false)
  const [buscadoDesde, setBuscadoDesde] = useState('')
  const [buscadoHasta, setBuscadoHasta] = useState('')
  const [buscadoNumDias, setBuscadoNumDias] = useState(7)
  const [buscadoVentanaDesde, setBuscadoVentanaDesde] = useState('')
  const [buscadoVentanaHasta, setBuscadoVentanaHasta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  const [modalDia, setModalDia] = useState<{ fecha: string; solicitudes: any[] } | null>(null)
  const [modalDetalle, setModalDetalle] = useState<any | null>(null)
  const [modalAceptar, setModalAceptar] = useState<any | null>(null)
  const [aceptDesde, setAceptDesde] = useState('')
  const [aceptHasta, setAceptHasta] = useState('')
  const [aceptNumDias, setAceptNumDias] = useState(7)
  const [aceptVentanaDesde, setAceptVentanaDesde] = useState('')
  const [aceptVentanaHasta, setAceptVentanaHasta] = useState('')
  const [aceptando, setAceptando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [confirmandoCadena, setConfirmandoCadena] = useState<string | null>(null)
  const [recientes, setRecientes] = useState<any[]>([])
  const [recientesAbierto, setRecientesAbierto] = useState(false)

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMiId(user.id)
    const { data: perfil } = await supabase.from('profiles').select('grupo, is_admin').eq('id', user.id).single()
    if (!perfil) return
    setMiGrupo(perfil.grupo)
    const { data: perfiles } = await supabase.from('profiles').select('*').eq('grupo', perfil.grupo)
    setCompanyeros(perfiles || [])
    const ids = (perfiles || []).map((p: any) => p.id)
    const { data: sols } = await supabase
      .from('vacaciones_solicitudes')
      .select('*, profiles(nombre, apellidos, chapa)')
      .in('user_id', ids)
      .in('estado', ['abierta', 'esperando_confirmacion', 'en_cadena'])
    setSolicitudes(sols || [])
    const { data: acepts } = await supabase
      .from('vacaciones_aceptaciones')
      .select('*, profiles(nombre, apellidos, chapa)')
      .in('solicitud_id', (sols || []).map((s: any) => s.id))
    setAceptaciones(acepts || [])
    // Cargar cadenas del usuario
    const { data: cads } = await supabase
      .from('vacaciones_cadenas')
      .select(`
        *,
        p1:usuario1_id(nombre, apellidos, chapa),
        p2:usuario2_id(nombre, apellidos, chapa),
        p3:usuario3_id(nombre, apellidos, chapa),
        p4:usuario4_id(nombre, apellidos, chapa),
        s1:solicitud1_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, buscado_desde, buscado_hasta, flexible_buscado, buscado_ventana_desde, buscado_ventana_hasta, num_dias),
        s2:solicitud2_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, buscado_desde, buscado_hasta, flexible_buscado, buscado_ventana_desde, buscado_ventana_hasta, num_dias),
        s3:solicitud3_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, buscado_desde, buscado_hasta, flexible_buscado, buscado_ventana_desde, buscado_ventana_hasta, num_dias),
        s4:solicitud4_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, buscado_desde, buscado_hasta, flexible_buscado, buscado_ventana_desde, buscado_ventana_hasta, num_dias)
      `)
      .or(`usuario1_id.eq.${user.id},usuario2_id.eq.${user.id},usuario3_id.eq.${user.id},usuario4_id.eq.${user.id}`)
      .eq('estado', 'pendiente')
    setCadenas(cads || [])
    // Intercambios recientes (últimos 10 días)
    const hace10 = new Date()
    hace10.setDate(hace10.getDate() - 10)
    const { data: solsConf } = await supabase
      .from('vacaciones_solicitudes')
      .select('*, profiles(nombre, apellidos, chapa)')
      .eq('user_id', user.id)
      .eq('estado', 'confirmada')
      .gte('updated_at', hace10.toISOString())
      .order('updated_at', { ascending: false })
    const recList: any[] = []
    for (const s of solsConf || []) {
      const { data: acept } = await supabase.from('vacaciones_aceptaciones').select('*, profiles(nombre, apellidos, chapa, telefono)').eq('solicitud_id', s.id).single()
      if (acept) {
        const desc = s.flexible_ofrecido
          ? `${s.num_dias} días (flexible)`
          : `${s.ofrecido_desde?.split('-').reverse().join('/')} → ${s.ofrecido_hasta?.split('-').reverse().join('/')}`
        recList.push({ companyero: acept.profiles, desc, fecha: s.updated_at, tipo: 'solicitante' })
      }
    }
    // También como aceptante
    const { data: aceConf } = await supabase
      .from('vacaciones_aceptaciones')
      .select('*, solicitudes:solicitud_id(estado, user_id, ofrecido_desde, ofrecido_hasta, flexible_ofrecido, num_dias, profiles(nombre, apellidos, chapa, telefono))')
      .eq('aceptante_id', user.id)
      .gte('created_at', hace10.toISOString())
      .order('created_at', { ascending: false })
    for (const a of aceConf || []) {
      const sol = (a as any).solicitudes
      if (sol?.estado === 'confirmada' && sol.user_id !== user.id) {
        const desc = sol.flexible_ofrecido
          ? `${sol.num_dias} días (flexible)`
          : `${sol.ofrecido_desde?.split('-').reverse().join('/')} → ${sol.ofrecido_hasta?.split('-').reverse().join('/')}`
        recList.push({ companyero: sol.profiles, desc, fecha: a.created_at, tipo: 'aceptante' })
      }
    }
    // También como participante en cadenas confirmadas
    const { data: cadenasConf } = await supabase
      .from('vacaciones_cadenas')
      .select('*, p1:usuario1_id(nombre, apellidos, chapa, telefono), p2:usuario2_id(nombre, apellidos, chapa, telefono), p3:usuario3_id(nombre, apellidos, chapa, telefono), p4:usuario4_id(nombre, apellidos, chapa, telefono)')
      .or(`usuario1_id.eq.${user.id},usuario2_id.eq.${user.id},usuario3_id.eq.${user.id},usuario4_id.eq.${user.id}`)
      .eq('estado', 'confirmada')
      .gte('updated_at', hace10.toISOString())
      .order('updated_at', { ascending: false })
    for (const c of cadenasConf || []) {
      // Añadir cada compañero de la cadena (excepto yo)
      const participantes = [
        { uid: c.usuario1_id, perfil: c.p1 },
        { uid: c.usuario2_id, perfil: c.p2 },
        { uid: c.usuario3_id, perfil: c.p3 },
        c.usuario4_id ? { uid: c.usuario4_id, perfil: c.p4 } : null,
      ].filter((p): p is { uid: string, perfil: any } => p !== null && p.uid !== user.id)
      for (const p of participantes) {
        recList.push({ companyero: p.perfil, desc: `Cadena de ${c.tipo} participantes`, fecha: c.updated_at, tipo: 'cadena' })
      }
    }
    recList.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    setRecientes(recList.slice(0, 10))
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const channel = supabase.channel('vacaciones-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacaciones_solicitudes' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacaciones_aceptaciones' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacaciones_cadenas' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const colorPorUsuario: Record<string, string> = {}
  companyeros.forEach((c, i) => { colorPorUsuario[c.id] = COLORES_USUARIO[i % COLORES_USUARIO.length] })

  const solicitudesPorFecha: Record<string, any[]> = {}
  solicitudes.forEach(s => {
    const addFechas = (desde: string, hasta: string, rol: string, esVentana: boolean) => {
      if (!desde || !hasta) return
      let d = parseISO(desde)
      const fin = parseISO(hasta)
      while (d <= fin) {
        const key = format(d, 'yyyy-MM-dd')
        if (!solicitudesPorFecha[key]) solicitudesPorFecha[key] = []
        if (!solicitudesPorFecha[key].find((x: any) => x.id === s.id && x.rol === rol))
          solicitudesPorFecha[key].push({ ...s, rol, esVentana })
        d = addDays(d, 1)
      }
    }
    if (!s.flexible_ofrecido) addFechas(s.ofrecido_desde, s.ofrecido_hasta, 'ofrece', false)
    else addFechas(s.ofrecido_ventana_desde, s.ofrecido_ventana_hasta, 'ofrece', true)
    if (!s.flexible_buscado) addFechas(s.buscado_desde, s.buscado_hasta, 'busca', false)
    else addFechas(s.buscado_ventana_desde, s.buscado_ventana_hasta, 'busca', true)
  })

  const mySolicitudes = solicitudes.filter(s => s.user_id === miId)

  const tipoCaso = (s: any) => {
    if (!s.flexible_ofrecido && !s.flexible_buscado) return 'exacto-exacto'
    if (!s.flexible_ofrecido && s.flexible_buscado) return 'exacto-flexible'
    if (s.flexible_ofrecido && !s.flexible_buscado) return 'flexible-exacto'
    return 'flexible-flexible'
  }

  const numDiasOfrecido = ofrecidoFlexible
    ? (!buscadoFlexible && buscadoDesde && buscadoHasta ? diasEntre(buscadoDesde, buscadoHasta) : ofrecidoNumDias)
    : (ofrecidoDesde && ofrecidoHasta ? diasEntre(ofrecidoDesde, ofrecidoHasta) : 0)

  const numDiasBuscado = buscadoFlexible
    ? (!ofrecidoFlexible && ofrecidoDesde && ofrecidoHasta ? diasEntre(ofrecidoDesde, ofrecidoHasta) : buscadoNumDias)
    : (buscadoDesde && buscadoHasta ? diasEntre(buscadoDesde, buscadoHasta) : 0)

  const validarFormulario = () => {
    if (!ofrecidoFlexible) {
      if (!ofrecidoDesde || !ofrecidoHasta) return 'Indica las fechas que ofreces'
      if (parseISO(ofrecidoDesde) <= limite7dias) return 'Los días ofrecidos deben ser con más de 7 días de antelación'
      const err = validarRango(ofrecidoDesde, ofrecidoHasta)
      if (err) return `Lo que ofreces: ${err}`
    } else {
      if (!ofrecidoVentanaDesde || !ofrecidoVentanaHasta) return 'Indica la ventana de fechas que ofreces'
      if (parseISO(ofrecidoVentanaDesde) <= limite7dias) return 'La ventana ofrecida debe ser con más de 7 días de antelación'
      if (diasEntre(ofrecidoVentanaDesde, ofrecidoVentanaHasta) < numDiasOfrecido) return `La ventana debe tener al menos ${numDiasOfrecido} días`
    }
    if (!buscadoFlexible) {
      if (!buscadoDesde || !buscadoHasta) return 'Indica las fechas que buscas'
      if (parseISO(buscadoDesde) <= limite7dias) return 'Los días buscados deben ser con más de 7 días de antelación'
      const err = validarRango(buscadoDesde, buscadoHasta)
      if (err) return `Lo que buscas: ${err}`
    } else {
      if (!buscadoVentanaDesde || !buscadoVentanaHasta) return 'Indica la ventana de fechas que buscas'
      if (diasEntre(buscadoVentanaDesde, buscadoVentanaHasta) < numDiasBuscado) return `La ventana debe tener al menos ${numDiasBuscado} días`
    }
    if (numDiasOfrecido > 0 && numDiasBuscado > 0 && numDiasOfrecido !== numDiasBuscado)
      return `Los días ofrecidos (${numDiasOfrecido}) y buscados (${numDiasBuscado}) deben ser la misma cantidad`
    return ''
  }

  const validarAceptacion = (): string => {
    if (!modalAceptar) return ''
    const caso = tipoCaso(modalAceptar)
    if (caso === 'exacto-exacto') return ''
    if (caso === 'exacto-flexible' || caso === 'flexible-exacto') {
      if (!aceptDesde || !aceptHasta) return 'Indica las fechas que ofreces'
      if (aceptDesde > aceptHasta) return 'La fecha inicio debe ser anterior a la de fin'
      if (parseISO(aceptDesde) < limite7dias) return 'Los días deben ser con más de 7 días de antelación'
      const err = validarRango(aceptDesde, aceptHasta)
      if (err) return err
      const ventDesde = caso === 'exacto-flexible' ? modalAceptar.buscado_ventana_desde : modalAceptar.ofrecido_ventana_desde
      const ventHasta = caso === 'exacto-flexible' ? modalAceptar.buscado_ventana_hasta : modalAceptar.ofrecido_ventana_hasta
      if (aceptDesde < ventDesde || aceptHasta > ventHasta) return `Las fechas deben estar dentro de la ventana: ${fmt(ventDesde)} — ${fmt(ventHasta)}`
      const numExacto = caso === 'exacto-flexible'
        ? diasEntre(modalAceptar.ofrecido_desde, modalAceptar.ofrecido_hasta)
        : diasEntre(modalAceptar.buscado_desde, modalAceptar.buscado_hasta)
      if (diasEntre(aceptDesde, aceptHasta) !== numExacto) return `Debes elegir exactamente ${numExacto} días`
    }
    if (caso === 'flexible-flexible') {
      if (!aceptVentanaDesde || !aceptVentanaHasta) return 'Indica tu ventana de fechas'
      if (aceptVentanaDesde > aceptVentanaHasta) return 'La ventana inicio debe ser anterior a la de fin'
      if (parseISO(aceptVentanaDesde) <= limite7dias) return 'La ventana debe ser con más de 7 días de antelación'
      if (diasEntre(aceptVentanaDesde, aceptVentanaHasta) < aceptNumDias) return `La ventana debe tener al menos ${aceptNumDias} días`
    }
    return ''
  }

  const crearSolicitud = async () => {
    const error = validarFormulario()
    if (error) { setErrorForm(error); return }
    setGuardando(true)
    setErrorForm('')
    const numDias = numDiasOfrecido
    await supabase.from('vacaciones_solicitudes').insert({
      user_id: miId, grupo: miGrupo,
      ofrecido_desde: ofrecidoFlexible ? null : ofrecidoDesde,
      ofrecido_hasta: ofrecidoFlexible ? null : ofrecidoHasta,
      ofrecido_ventana_desde: ofrecidoFlexible ? ofrecidoVentanaDesde : null,
      ofrecido_ventana_hasta: ofrecidoFlexible ? ofrecidoVentanaHasta : null,
      buscado_desde: buscadoFlexible ? null : buscadoDesde,
      buscado_hasta: buscadoFlexible ? null : buscadoHasta,
      buscado_ventana_desde: buscadoFlexible ? buscadoVentanaDesde : null,
      buscado_ventana_hasta: buscadoFlexible ? buscadoVentanaHasta : null,
      num_dias: numDias, flexible_ofrecido: ofrecidoFlexible, flexible_buscado: buscadoFlexible,
    })
    await cargar()
    // Buscar si el trigger detectó una cadena nueva con esta solicitud
    // Esperar un momento para que el trigger de Supabase se ejecute
    await new Promise(r => setTimeout(r, 1500))
    const { data: cadenasNuevas } = await supabase
      .from('vacaciones_cadenas')
      .select(`
        *,
        p1:usuario1_id(nombre, apellidos, chapa),
        p2:usuario2_id(nombre, apellidos, chapa),
        p3:usuario3_id(nombre, apellidos, chapa),
        p4:usuario4_id(nombre, apellidos, chapa),
        s1:solicitud1_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, num_dias),
        s2:solicitud2_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, num_dias),
        s3:solicitud3_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, num_dias),
        s4:solicitud4_id(ofrecido_desde, ofrecido_hasta, flexible_ofrecido, ofrecido_ventana_desde, ofrecido_ventana_hasta, num_dias)
      `)
      .or(`usuario1_id.eq.${miId},usuario2_id.eq.${miId},usuario3_id.eq.${miId},usuario4_id.eq.${miId}`)
      .eq('estado', 'pendiente')
      .gte('created_at', new Date(Date.now() - 10000).toISOString()) // cadenas creadas en los últimos 10 segundos
    for (const cadena of cadenasNuevas || []) {
      const uids = [cadena.usuario1_id, cadena.usuario2_id, cadena.usuario3_id, cadena.usuario4_id].filter(Boolean)
      const perfiles = [cadena.p1, cadena.p2, cadena.p3, cadena.p4].filter(Boolean)
      const sols = [cadena.s1, cadena.s2, cadena.s3, cadena.s4].filter(Boolean)
      for (let i = 0; i < uids.length; i++) {
        const uid = uids[i]
        const perfil = perfiles[i]
        const sol = sols[i]
        const descDa = sol ? (sol.flexible_ofrecido
          ? `${sol.num_dias} días (flexible entre ${fmt(sol.ofrecido_ventana_desde)} y ${fmt(sol.ofrecido_ventana_hasta)})`
          : `${fmt(sol.ofrecido_desde)} → ${fmt(sol.ofrecido_hasta)}`) : '—'
        const otrosNombres = perfiles.filter((_, j) => j !== i).map(p => `${p?.nombre} ${p?.apellidos}`).join(', ')
        // Notificación campana
        await supabase.from('notificaciones').insert({
          user_id: uid, tipo: 'cadena',
          titulo: `🔗 ¡Cadena de vacaciones de ${cadena.tipo} detectada!`,
          mensaje: `Se ha encontrado una cadena de ${cadena.tipo} participantes. Tú das: ${descDa}. Participantes: ${otrosNombres}. Entra en Vacaciones para confirmar tu parte.`,
          leida: false,
        })
        // Email sin WhatsApp
        const { data: emailP } = await supabase.rpc('get_user_email', { p_user_id: uid })
        if (emailP) {
          await enviarEmail(emailP,
            `🔗 ¡Cadena de vacaciones de ${cadena.tipo} detectada! - DescansApp`,
            templateNotificacion(`¡Cadena de vacaciones de ${cadena.tipo} encontrada!`,
              `Se ha detectado automáticamente una cadena de intercambio de vacaciones entre ${cadena.tipo} compañeros.<br><br>
              Tú das: <strong>${descDa}</strong><br>
              Participantes: <strong>${otrosNombres}</strong><br><br>
              Tienes <strong>5 días</strong> para confirmar tu parte. Entra en DescansApp → Vacaciones → <strong>"Mis solicitudes"</strong> y pulsa <strong>"✓ CONFIRMAR MI PARTE"</strong>.<br><br>
              Si no confirman todos en 5 días, la cadena se cancelará automáticamente.`))
        }
      }
    }
    await cargar()
    setModalNueva(false)
    resetForm()
    setGuardando(false)
  }

  const resetForm = () => {
    setOfrecidoFlexible(false); setBuscadoFlexible(false)
    setOfrecidoDesde(''); setOfrecidoHasta(''); setOfrecidoNumDias(7); setOfrecidoVentanaDesde(''); setOfrecidoVentanaHasta('')
    setBuscadoDesde(''); setBuscadoHasta(''); setBuscadoNumDias(7); setBuscadoVentanaDesde(''); setBuscadoVentanaHasta('')
    setErrorForm('')
  }

  const resetAceptar = () => {
    setAceptDesde(''); setAceptHasta(''); setAceptNumDias(7)
    setAceptVentanaDesde(''); setAceptVentanaHasta('')
  }

  const eliminarSolicitud = async (id: string) => {
    setEliminando(id)
    await supabase.from('vacaciones_aceptaciones').delete().eq('solicitud_id', id)
    await supabase.from('vacaciones_solicitudes').update({ estado: 'cancelada' }).eq('id', id)
    await cargar()
    setEliminando(null)
  }

  const descripcionLado = (s: any, lado: 'ofrecido' | 'buscado') => {
    const flexible = lado === 'ofrecido' ? s.flexible_ofrecido : s.flexible_buscado
    const desde = lado === 'ofrecido' ? s.ofrecido_desde : s.buscado_desde
    const hasta = lado === 'ofrecido' ? s.ofrecido_hasta : s.buscado_hasta
    const vDesde = lado === 'ofrecido' ? s.ofrecido_ventana_desde : s.buscado_ventana_desde
    const vHasta = lado === 'ofrecido' ? s.ofrecido_ventana_hasta : s.buscado_ventana_hasta
    const num = s.num_dias
    if (flexible) return `${num} días entre el ${fmt(vDesde)} y el ${fmt(vHasta)}`
    return `${fmt(desde)} → ${fmt(hasta)} (${desde && hasta ? diasEntre(desde, hasta) : '?'} días)`
  }

  const aceptarIntercambio = async () => {
    if (!modalAceptar) return
    const err = validarAceptacion()
    if (err) { alert(`⚠️ ${err}`); return }
    setAceptando(true)
    const caso = tipoCaso(modalAceptar)
    let ofDesde: string | null = null, ofHasta: string | null = null
    let ofVentDesde: string | null = null, ofVentHasta: string | null = null
    let numD = modalAceptar.num_dias, esFlexible = false
    if (caso === 'exacto-exacto') { ofDesde = modalAceptar.buscado_desde; ofHasta = modalAceptar.buscado_hasta }
    else if (caso === 'exacto-flexible' || caso === 'flexible-exacto') { ofDesde = aceptDesde; ofHasta = aceptHasta; numD = diasEntre(aceptDesde, aceptHasta) }
    else { ofVentDesde = aceptVentanaDesde; ofVentHasta = aceptVentanaHasta; numD = aceptNumDias; esFlexible = true }

    await supabase.rpc('aceptar_vacacion', {
      p_solicitud_id: modalAceptar.id, p_aceptante_id: miId,
      p_ofrecido_desde: ofDesde, p_ofrecido_hasta: ofHasta,
      p_ofrecido_ventana_desde: ofVentDesde, p_ofrecido_ventana_hasta: ofVentHasta,
      p_num_dias: numD, p_flexible: esFlexible,
    })
    const { data: miPerfil } = await supabase.from('profiles').select('nombre, apellidos, chapa, telefono').eq('id', miId).single()
    const { data: perfilSolicitante } = await supabase.from('profiles').select('nombre, apellidos, telefono').eq('id', modalAceptar.user_id).single()
    if (miPerfil) {
      const loDaA = descripcionLado(modalAceptar, 'ofrecido')
      const loRecibeA = esFlexible ? `${numD} días entre el ${fmt(ofVentDesde || '')} y el ${fmt(ofVentHasta || '')}` : `${fmt(ofDesde || '')} → ${fmt(ofHasta || '')}`
      const waMio = miPerfil.telefono ? `<br><br>Contacta con tu compañero:<br>${waBtn(miPerfil.telefono, `${miPerfil.nombre} ${miPerfil.apellidos}`)}` : ''
      const waSol = perfilSolicitante?.telefono ? `<br><br>Contacta con tu compañero:<br>${waBtn(perfilSolicitante.telefono, `${perfilSolicitante.nombre} ${perfilSolicitante.apellidos}`)}` : ''
      await supabase.from('notificaciones').insert({
        user_id: modalAceptar.user_id, tipo: 'aceptacion',
        titulo: '🏖️ Alguien acepta tu intercambio de vacaciones',
        mensaje: `${miPerfil.nombre} ${miPerfil.apellidos} (chapa ${miPerfil.chapa}) acepta tu intercambio. Tú das: ${loDaA}. Tú recibes: ${loRecibeA}. Entra en Vacaciones para confirmarlo.`,
        leida: false,
      })
      const { data: emailA } = await supabase.rpc('get_user_email', { p_user_id: modalAceptar.user_id })
      const { data: emailMio } = await supabase.rpc('get_user_email', { p_user_id: miId })
      if (emailA) await enviarEmail(emailA, '✅ Alguien acepta tu intercambio de vacaciones - DescansApp',
        templateNotificacion('¡Alguien acepta tu intercambio!',
          `<strong>${miPerfil.nombre} ${miPerfil.apellidos}</strong> (chapa ${miPerfil.chapa}) acepta el intercambio contigo.<br><br>Tú das: <strong>${loDaA}</strong><br>Tú recibes: <strong>${loRecibeA}</strong><br><br>Entra en DescansApp en la sección Vacaciones para confirmar el intercambio.${waMio}`))
      if (emailMio) await enviarEmail(emailMio, '✅ Has aceptado un intercambio de vacaciones - DescansApp',
        templateNotificacion('Has aceptado un intercambio',
          `Has aceptado el intercambio con <strong>${perfilSolicitante?.nombre} ${perfilSolicitante?.apellidos}</strong>.<br><br>Tú das: <strong>${loRecibeA}</strong><br>Tú recibes: <strong>${loDaA}</strong><br><br>Espera a que tu compañero confirme el intercambio.${waSol}`))
    }
    await cargar(); setModalAceptar(null); setModalDetalle(null); resetAceptar(); setAceptando(false)
  }

  const waBtn = (tel: string, nombre: string) =>
    `<a href="https://wa.me/34${tel.replace(/\s/g,'')}" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin:8px 0">
      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="18" height="18" style="vertical-align:middle"/> Contactar con ${nombre}
    </a>`

  const confirmarIntercambio = async (solicitudId: string) => {
    setConfirmando(solicitudId)
    await supabase.from('vacaciones_solicitudes').update({ estado: 'confirmada' }).eq('id', solicitudId)
    const acept = aceptaciones.find(a => a.solicitud_id === solicitudId)
    const sol = solicitudes.find(s => s.id === solicitudId)
    if (acept && sol) {
      const { data: perfilA } = await supabase.from('profiles').select('nombre, apellidos, chapa, telefono').eq('id', miId).single()
      const { data: perfilB } = await supabase.from('profiles').select('nombre, apellidos, chapa, telefono').eq('id', acept.aceptante_id).single()
      const { data: emailB } = await supabase.rpc('get_user_email', { p_user_id: acept.aceptante_id })
      const { data: emailA } = await supabase.rpc('get_user_email', { p_user_id: miId })
      if (perfilA) {
        const loDaB = descripcionLado(sol, 'ofrecido')
        const loRecibeB = acept.flexible ? `${acept.num_dias} días entre el ${fmt(acept.ofrecido_ventana_desde)} y el ${fmt(acept.ofrecido_ventana_hasta)}` : `${fmt(acept.ofrecido_desde)} → ${fmt(acept.ofrecido_hasta)}`
        const waBtnA = perfilA.telefono ? `<br><br>${waBtn(perfilA.telefono, `${perfilA.nombre} ${perfilA.apellidos}`)}` : ''
        const waBtnB = perfilB?.telefono ? `<br><br>${waBtn(perfilB.telefono, `${perfilB.nombre} ${perfilB.apellidos}`)}` : ''
        await supabase.from('notificaciones').insert({ user_id: acept.aceptante_id, tipo: 'completado', titulo: '✅ Intercambio de vacaciones confirmado', mensaje: `${perfilA.nombre} ${perfilA.apellidos} ha confirmado el intercambio. Tú das: ${loRecibeB}. Tú recibes: ${loDaB}. Recuerda tramitarlo con el Dpto. de Asignación de Personal.`, leida: false })
        if (emailB) await enviarEmail(emailB, '✅ Intercambio de vacaciones confirmado - DescansApp',
          templateNotificacion('¡Intercambio de vacaciones confirmado!',
            `<strong>${perfilA.nombre} ${perfilA.apellidos}</strong> (chapa ${perfilA.chapa}) ha confirmado el intercambio contigo.<br><br>Tú das: <strong>${loRecibeB}</strong><br>Tú recibes: <strong>${loDaB}</strong><br><br>Recuerda tramitar el cambio con el Departamento de Asignación de Personal.${waBtnA}`))
        if (emailA) await enviarEmail(emailA, '✅ Intercambio de vacaciones confirmado - DescansApp',
          templateNotificacion('¡Intercambio de vacaciones confirmado!',
            `Has confirmado el intercambio con <strong>${perfilB?.nombre} ${perfilB?.apellidos}</strong> (chapa ${perfilB?.chapa}).<br><br>Tú das: <strong>${loDaB}</strong><br>Tú recibes: <strong>${loRecibeB}</strong><br><br>Recuerda tramitar el cambio con el Departamento de Asignación de Personal.${waBtnB}`))
      }
    }
    await cargar(); setConfirmando(null)
  }

  const confirmarCadena = async (cadenaId: string, cadena: any) => {
    setConfirmandoCadena(cadenaId)
    await supabase.rpc('confirmar_cadena_vacaciones', { p_cadena_id: cadenaId, p_user_id: miId })
    const { data: cadenaActualizada } = await supabase.from('vacaciones_cadenas').select('*').eq('id', cadenaId).single()
    if (cadenaActualizada?.estado === 'confirmada') {
      const uids = [cadena.usuario1_id, cadena.usuario2_id, cadena.usuario3_id, cadena.usuario4_id].filter(Boolean)
      // Obtener perfiles con teléfono de todos los participantes
      const { data: perfiles } = await supabase.from('profiles').select('id, nombre, apellidos, chapa, telefono').in('id', uids)
      const perfilesMap: Record<string, any> = {}
      ;(perfiles || []).forEach((p: any) => { perfilesMap[p.id] = p })
      for (const uid of uids) {
        await supabase.from('notificaciones').insert({ user_id: uid, tipo: 'completado', titulo: '✅ Cadena de vacaciones confirmada', mensaje: `Todos los participantes han confirmado. Recuerda tramitar el cambio con el Departamento de Asignación de Personal.`, leida: false })
        const { data: emailP } = await supabase.rpc('get_user_email', { p_user_id: uid })
        if (!emailP) continue
        // Botones WhatsApp de los otros participantes
        const otrosWa = uids
          .filter(oId => oId !== uid)
          .map(oId => {
            const p = perfilesMap[oId]
            return p?.telefono ? waBtn(p.telefono, `${p.nombre} ${p.apellidos}`) : ''
          })
          .filter(Boolean)
          .join('')
        const waSeccion = otrosWa ? `<br><br>Contacta con tus compañeros por WhatsApp:<br>${otrosWa}` : ''
        await enviarEmail(emailP, '✅ Cadena de vacaciones confirmada - DescansApp',
          templateNotificacion('¡Cadena de vacaciones confirmada!',
            `Todos los participantes han confirmado el intercambio en cadena.<br><br>Recuerda tramitar el cambio con el Departamento de Asignación de Personal.${waSeccion}`))
      }
    }
    await cargar(); setConfirmandoCadena(null)
  }

  const renderLado = (flexible: boolean, desde: string, hasta: string, numDias: number, ventDesde: string, ventHasta: string) => {
    if (!flexible) {
      if (!desde || !hasta) return <span style={{ color: '#8a8070' }}>—</span>
      return <strong>{fmt(desde)} → {fmt(hasta)} <span style={{ color: '#8a8070', fontWeight: 400 }}>({diasEntre(desde, hasta)} días)</span></strong>
    }
    if (!ventDesde || !ventHasta) return <span style={{ color: '#8a8070' }}>—</span>
    return <strong>{numDias} días <span style={{ color: '#8a8070', fontWeight: 400 }}>entre el {fmt(ventDesde)} y el {fmt(ventHasta)}</span></strong>
  }

  const Aviso = ({ desde, hasta }: { desde: string, hasta: string }) => {
    if (!desde || !hasta || desde > hasta) return null
    const err = validarRango(desde, hasta)
    if (err) return <div style={{ fontSize: '0.75rem', color: '#c04040', background: '#fde8e8', borderRadius: '3px', padding: '0.35rem 0.6rem', marginTop: '0.3rem' }}>⚠️ {err}</div>
    const numD = diasEntre(desde, hasta)
    const todoVac = todosEnPeriodoVacacional(desde, hasta)
    const tieneFinde = incluyeFindeSemana(desde, hasta)
    return <div style={{ fontSize: '0.72rem', color: '#2060a0', background: '#eff6ff', borderRadius: '2px', padding: '0.3rem 0.5rem', marginTop: '0.25rem' }}>
      {numD} días · {todoVac ? '🌴 Periodo vacacional' : '📅 Fuera de periodo'}{tieneFinde ? ' · incluye fin de semana' : ''}
    </div>
  }

  const InfoDiasAuto = ({ dias, texto }: { dias: number, texto: string }) => (
    <div style={{ fontSize: '0.78rem', color: '#166534', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '3px', padding: '0.4rem 0.6rem', marginBottom: '0.5rem' }}>
      {texto} <strong>{dias} días</strong> (igual que el otro lado)
    </div>
  )

  // Helpers de fechas para DatePicker
  const mesDesdeOfrecido = ofrecidoDesde ? new Date(ofrecidoDesde + 'T00:00:00') : undefined
  const mesDesdeVentanaOfrecido = ofrecidoVentanaDesde ? new Date(ofrecidoVentanaDesde + 'T00:00:00') : undefined
  const mesDesdeBuscado = buscadoDesde ? new Date(buscadoDesde + 'T00:00:00') : undefined
  const mesDesdeVentanaBuscado = buscadoVentanaDesde ? new Date(buscadoVentanaDesde + 'T00:00:00') : undefined
  const mesDesdeAcept = aceptDesde ? new Date(aceptDesde + 'T00:00:00') : undefined
  const mesDesdeVentanaAcept = aceptVentanaDesde ? new Date(aceptVentanaDesde + 'T00:00:00') : undefined

  // Cadena de un usuario: obtener su posición y datos
  const miPosicionEnCadena = (cadena: any) => {
    if (cadena.usuario1_id === miId) return 1
    if (cadena.usuario2_id === miId) return 2
    if (cadena.usuario3_id === miId) return 3
    if (cadena.usuario4_id === miId) return 4
    return 0
  }

  const yoConfirmeEnCadena = (cadena: any) => {
    const pos = miPosicionEnCadena(cadena)
    if (pos === 1) return cadena.confirmado1
    if (pos === 2) return cadena.confirmado2
    if (pos === 3) return cadena.confirmado3
    if (pos === 4) return cadena.confirmado4
    return false
  }

  const diasParaExpirar = (cadena: any) => {
    if (!cadena.expira_at) return 0
    const diff = Math.ceil((new Date(cadena.expira_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  if (loading) return <div style={{ background: '#f5f0eb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4a520', fontFamily: 'sans-serif', fontSize: '1.5rem', letterSpacing: '3px' }}>CARGANDO...</div>

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
        .mis-sols { background: #fff; border: 1px solid #e0d8d0; border-radius: 4px; padding: 1.25rem; margin-bottom: 2rem; }
        .mis-sols-titulo { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; color: #c4a520; margin-bottom: 1rem; }
        .mis-sols-vacio { color: #8a8070; font-size: 0.85rem; }
        .mis-sol-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; background: #f5f0eb; border: 1px solid #e0d8d0; border-left: 3px solid #c4a520; border-radius: 3px; padding: 0.75rem; margin-bottom: 0.5rem; }
        .cadena-card { background: #f5f0eb; border: 1px solid #a78bfa; border-left: 3px solid #a78bfa; border-radius: 3px; padding: 0.75rem; margin-bottom: 0.5rem; }
        .cadena-titulo { font-family: 'Bebas Neue', sans-serif; font-size: 0.85rem; letter-spacing: 2px; color: #a78bfa; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; justify-content: space-between; }
        .cadena-participante { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: #4a4038; padding: 0.3rem 0; border-bottom: 1px solid #e0d8d0; }
        .cadena-participante:last-child { border-bottom: none; }
        .check-icon { font-size: 0.75rem; color: #34d399; }
        .pending-icon { font-size: 0.75rem; color: #f5c518; }
        .mis-sol-info { flex: 1; font-size: 0.82rem; color: #4a4038; line-height: 1.9; }
        .mis-sol-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1px; color: #8a8070; display: block; }
        .mis-sol-valor { color: #1a1612; font-weight: 500; }
        .mis-sol-acciones { display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end; flex-shrink: 0; }
        .btn-eliminar-sol { background: transparent; color: #e05050; border: 1px solid #e05050; padding: 0.35rem 0.8rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.75rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; white-space: nowrap; }
        .btn-eliminar-sol:hover:not(:disabled) { background: #fde8e8; }
        .btn-eliminar-sol:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-confirmar-sol { background: #34d399; color: #0f0f0f; border: none; padding: 0.35rem 0.8rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.75rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; white-space: nowrap; }
        .btn-confirmar-sol:hover:not(:disabled) { background: #10b981; }
        .btn-confirmar-sol:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-confirmar-cadena { background: #a78bfa; color: #0f0f0f; border: none; padding: 0.35rem 0.8rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.75rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; white-space: nowrap; margin-top: 0.5rem; }
        .btn-confirmar-cadena:disabled { opacity: 0.4; cursor: not-allowed; }
        .estado-pill { font-size: 0.62rem; padding: 0.15rem 0.5rem; border-radius: 2px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; white-space: nowrap; }
        .acept-aviso { margin-top: 0.5rem; background: #f0fdf4; border: 1px solid #86efac; border-radius: 3px; padding: 0.4rem 0.6rem; font-size: 0.78rem; color: #166534; }
        .cadena-aviso { margin-top: 0.5rem; background: #f5f0ff; border: 1px solid #a78bfa; border-radius: 3px; padding: 0.4rem 0.6rem; font-size: 0.78rem; color: #5b21b6; }
        .meses-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .mes { background: #fff; border: 1px solid #e0d8d0; border-radius: 4px; padding: 1rem; position: relative; }
        .mes.vacacional { border-color: #f5c518; }
        .mes-titulo { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; color: #c4a520; margin-bottom: 0.75rem; text-align: center; }
        .mes-badge-vac { font-size: 0.55rem; background: #f5c518; color: #0f0f0f; border-radius: 2px; padding: 0.1rem 0.4rem; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; position: absolute; top: 0.75rem; right: 0.75rem; }
        .dias-semana { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 0.25rem; }
        .dia-semana { text-align: center; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1px; color: #8a8070; padding: 0.2rem 0; }
        .dias-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dia { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.7rem; border-radius: 3px; cursor: default; position: relative; border: 1px solid transparent; background: #f0ebe5; color: #4a4038; overflow: hidden; transition: transform 0.1s; }
        .dia.clickable { cursor: pointer; }
        .dia.clickable:hover { transform: scale(1.15); z-index: 10; }
        .dia.vacio { cursor: default; pointer-events: none; background: transparent; border: none; }
        .dia.hoy { border-color: #f5c518 !important; }
        .dia.bloqueado { background: #e8e4e0 !important; color: #b8b0a8 !important; }
        .dia-num { font-size: 0.7rem; line-height: 1; position: relative; z-index: 2; }
        .dia-barras { position: absolute; bottom: 0; left: 0; right: 0; display: flex; flex-direction: column; gap: 1px; }
        .dia-barra { height: 4px; width: 100%; }
        .sols-titulo { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; color: #c4a520; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e0d8d0; }
        .vac-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .vac-card { background: #fff; border: 1px solid #e0d8d0; border-radius: 4px; padding: 1rem; border-left: 3px solid; cursor: pointer; transition: box-shadow 0.15s; }
        .vac-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .vac-card-usuario { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.75rem; flex-wrap: wrap; }
        .vac-card-rango { font-size: 0.82rem; color: #4a4038; line-height: 1.9; }
        .vac-card-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1px; color: #8a8070; display: block; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
        .modal { background: #fff; border: 1px solid #e0d8d0; border-left: 3px solid #c4a520; padding: 1.5rem; width: 100%; max-width: 500px; border-radius: 4px; max-height: 85vh; overflow-y: auto; }
        .modal h3 { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 2px; color: #c4a520; margin-bottom: 1rem; }
        .seccion-titulo { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; margin-bottom: 0.5rem; border-bottom: 1px solid #e0d8d0; padding-bottom: 0.3rem; margin-top: 1rem; }
        .solicitud-card { background: #f5f0eb; border: 1px solid #e0d8d0; border-radius: 3px; padding: 0.75rem; margin-bottom: 0.5rem; }
        .sol-usuario { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .tag { font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 2px; font-weight: 500; }
        .tag-yo { background: #2a2010; color: #f5c518; }
        .modal-btns { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
        .btn-amarillo { background: #f5c518; color: #0f0f0f; border: none; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-amarillo:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-verde { background: #34d399; color: #0f0f0f; border: none; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-verde:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-gris { background: transparent; color: #8a8070; border: 1px solid #d0c8c0; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
        .field label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; }
        .field input[type=number] { background: #f0ebe5; border: 1px solid #d0c8c0; color: #1a1612; padding: 0.6rem 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; border-radius: 2px; width: 100%; }
        .field input:focus { border-color: #f5c518; }
        .toggle-flexible { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; cursor: pointer; font-size: 0.8rem; color: #4a4038; }
        .toggle-flexible input { cursor: pointer; accent-color: #f5c518; width: 16px; height: 16px; }
        .bloque-lado { background: #f5f0eb; border: 1px solid #e0d8d0; border-radius: 3px; padding: 0.75rem; margin-bottom: 0.75rem; }
        .bloque-lado-titulo { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; margin-bottom: 0.5rem; font-weight: 600; }
        .error-form { color: #c04040; font-size: 0.8rem; background: #fde8e8; border-radius: 3px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; }
        .ventana-aviso { font-size: 0.72rem; color: #2060a0; background: #eff6ff; border-radius: 2px; padding: 0.3rem 0.5rem; margin-top: 0.25rem; }
        .resumen-intercambio { background: #f5f0eb; border: 1px solid #e0d8d0; border-radius: 3px; padding: 0.85rem; margin-bottom: 1rem; font-size: 0.85rem; color: #4a4038; line-height: 2; }
        .ventana-info { background: #fffbf0; border: 1px solid #f5c518; border-radius: 3px; padding: 0.6rem 0.8rem; font-size: 0.8rem; color: #4a4038; margin-bottom: 0.75rem; }
        .barra-movil { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #1a1612; border-top: 1px solid #2a2420; padding: 0.5rem 1rem; gap: 0.5rem; z-index: 50; flex-wrap: wrap; justify-content: center; }
        .barra-movil button { flex: 1; min-width: 80px; padding: 0.5rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.8rem; letter-spacing: 1px; border: none; border-radius: 2px; cursor: pointer; }
        @media (max-width: 1100px) { .meses-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { .meses-grid { grid-template-columns: repeat(2, 1fr); } .vac-page { padding: 1rem; padding-bottom: 80px; } .barra-movil { display: flex !important; } }
        @media (max-width: 500px) { .meses-grid { grid-template-columns: 1fr; } .vac-header { flex-direction: column; } .mis-sol-card { flex-direction: column; } }
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
              <div className="leyenda-item"><div className="leyenda-dot" style={{ background: '#f5c518', border: '1px solid #d4a500' }} />Periodo vacacional</div>
              <div className="leyenda-item"><div className="leyenda-dot" style={{ background: '#60a5fa' }} />Días ofrecidos</div>
              <div className="leyenda-item"><div className="leyenda-dot" style={{ background: '#f87171' }} />Días buscados</div>
            </div>
          </div>
        </div>

        {/* INTERCAMBIOS RECIENTES */}
        {recientes.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button onClick={() => setRecientesAbierto(!recientesAbierto)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '2px', color: '#c4a520', padding: '0.5rem 0' }}>
              <span>📋 INTERCAMBIOS RECIENTES ({recientes.length})</span>
              <span style={{ fontSize: '0.8rem', color: '#8a8070' }}>{recientesAbierto ? '▲ CERRAR' : '▼ VER'}</span>
            </button>
            {recientesAbierto && (
              <div style={{ background: '#fff', border: '1px solid #e0d8d0', borderRadius: '4px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recientes.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: '#f5f0eb', border: '1px solid #e0d8d0', borderLeft: '3px solid #34d399', borderRadius: '3px', padding: '0.6rem 0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.82rem', color: '#4a4038' }}>
                      <div style={{ fontWeight: 600, color: '#1a1612' }}>{r.companyero?.nombre} {r.companyero?.apellidos} <span style={{ color: '#8a8070', fontWeight: 400 }}>chapa {r.companyero?.chapa}</span></div>
                      <div style={{ fontSize: '0.75rem', color: '#8a8070', marginTop: '0.2rem' }}>
                        {r.desc} · {new Date(r.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    {r.companyero?.telefono && (
                      <a href={`https://wa.me/34${r.companyero.telefono.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#25D366', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="16" height="16" style={{ verticalAlign: 'middle' }} />
                        WhatsApp
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MIS SOLICITUDES + CADENAS */}
        <div className="mis-sols">
          <div className="mis-sols-titulo">MIS SOLICITUDES ({mySolicitudes.length}) {cadenas.length > 0 && `· 🔗 ${cadenas.length} CADENA${cadenas.length > 1 ? 'S' : ''} PENDIENTE${cadenas.length > 1 ? 'S' : ''}`}</div>

          {/* CADENAS PENDIENTES */}
          {cadenas.map(cadena => {
            const pos = miPosicionEnCadena(cadena)
            const yaConfirme = yoConfirmeEnCadena(cadena)
            const dias = diasParaExpirar(cadena)
            const participantes = [
              { uid: cadena.usuario1_id, perfil: cadena.p1, sol: cadena.s1, conf: cadena.confirmado1 },
              { uid: cadena.usuario2_id, perfil: cadena.p2, sol: cadena.s2, conf: cadena.confirmado2 },
              { uid: cadena.usuario3_id, perfil: cadena.p3, sol: cadena.s3, conf: cadena.confirmado3 },
              cadena.tipo === 4 ? { uid: cadena.usuario4_id, perfil: cadena.p4, sol: cadena.s4, conf: cadena.confirmado4 } : null,
            ].filter(Boolean)

            return (
              <div key={cadena.id} className="cadena-card">
                <div className="cadena-titulo">
                  <span>🔗 CADENA DE {cadena.tipo} · {dias} días para confirmar</span>
                  {!yaConfirme && (
                    <button className="btn-confirmar-cadena" disabled={confirmandoCadena === cadena.id}
                      onClick={() => confirmarCadena(cadena.id, cadena)}>
                      {confirmandoCadena === cadena.id ? '...' : '✓ CONFIRMAR MI PARTE'}
                    </button>
                  )}
                  {yaConfirme && <span style={{ fontSize: '0.75rem', color: '#34d399' }}>✓ Ya confirmaste</span>}
                </div>
                {participantes.map((p: any, i) => (
                  <div key={i} className="cadena-participante">
                    <span>{p.conf ? '✅' : '⏳'}</span>
                    <span style={{ fontWeight: p.uid === miId ? 600 : 400 }}>
                      {p.perfil?.nombre} {p.perfil?.apellidos} <span style={{ color: '#8a8070', fontSize: '0.75rem' }}>(chapa {p.perfil?.chapa})</span>
                      {p.uid === miId && <span className="tag tag-yo" style={{ marginLeft: '0.4rem' }}>YO</span>}
                    </span>
                    {p.sol && (
                      <span style={{ fontSize: '0.75rem', color: '#8a8070', marginLeft: 'auto' }}>
                        Da: {p.sol.flexible_ofrecido
                          ? `${p.sol.num_dias}d entre ${fmt(p.sol.ofrecido_ventana_desde)}-${fmt(p.sol.ofrecido_ventana_hasta)}`
                          : `${fmt(p.sol.ofrecido_desde)}→${fmt(p.sol.ofrecido_hasta)}`}
                      </span>
                    )}
                  </div>
                ))}
                <div style={{ fontSize: '0.75rem', color: '#8a8070', marginTop: '0.5rem' }}>
                  ⚠️ Si no confirman todos en {dias} días, la cadena se cancelará automáticamente.
                </div>
              </div>
            )
          })}

          {/* MIS SOLICITUDES NORMALES */}
          {mySolicitudes.length === 0 && cadenas.length === 0 ? (
            <p className="mis-sols-vacio">No tienes solicitudes activas. Pulsa "+ NUEVO INTERCAMBIO" para publicar una.</p>
          ) : mySolicitudes.map(s => {
            const acept = aceptaciones.find(a => a.solicitud_id === s.id)
            const enCadena = s.estado === 'en_cadena'
            return (
              <div key={s.id} className="mis-sol-card" style={{ borderLeftColor: enCadena ? '#a78bfa' : '#c4a520' }}>
                <div className="mis-sol-info">
                  <span className="mis-sol-label">Ofrezco</span>
                  <span className="mis-sol-valor">{s.flexible_ofrecido
                    ? `${s.num_dias} días entre el ${fmt(s.ofrecido_ventana_desde)} y el ${fmt(s.ofrecido_ventana_hasta)}`
                    : `${fmt(s.ofrecido_desde)} → ${fmt(s.ofrecido_hasta)} (${s.ofrecido_desde && s.ofrecido_hasta ? diasEntre(s.ofrecido_desde, s.ofrecido_hasta) : '?'} días)`}</span>
                  <span className="mis-sol-label" style={{ marginTop: '0.3rem' }}>Busco</span>
                  <span className="mis-sol-valor">{s.flexible_buscado
                    ? `${s.num_dias} días entre el ${fmt(s.buscado_ventana_desde)} y el ${fmt(s.buscado_ventana_hasta)}`
                    : `${fmt(s.buscado_desde)} → ${fmt(s.buscado_hasta)} (${s.buscado_desde && s.buscado_hasta ? diasEntre(s.buscado_desde, s.buscado_hasta) : '?'} días)`}</span>
                  {enCadena && <div className="cadena-aviso">🔗 Esta solicitud está incluida en una cadena pendiente de confirmación.</div>}
                  {acept && !enCadena && (
                    <div className="acept-aviso">
                      ✓ <strong>{acept.profiles?.nombre} {acept.profiles?.apellidos}</strong> (chapa {acept.profiles?.chapa}) acepta:{' '}
                      {acept.flexible ? `${acept.num_dias} días entre el ${fmt(acept.ofrecido_ventana_desde)} y el ${fmt(acept.ofrecido_ventana_hasta)}` : `${fmt(acept.ofrecido_desde)} → ${fmt(acept.ofrecido_hasta)}`}
                    </div>
                  )}
                </div>
                <div className="mis-sol-acciones">
                  {s.estado === 'esperando_confirmacion' && <span className="estado-pill" style={{ background: '#fef3c7', color: '#92400e' }}>ESPERANDO</span>}
                  {enCadena && <span className="estado-pill" style={{ background: '#f5f0ff', color: '#5b21b6' }}>EN CADENA</span>}
                  {s.estado === 'esperando_confirmacion' && acept && (
                    <button className="btn-confirmar-sol" disabled={confirmando === s.id} onClick={() => confirmarIntercambio(s.id)}>
                      {confirmando === s.id ? '...' : '✓ CONFIRMAR'}
                    </button>
                  )}
                  {!enCadena && (
                    <button className="btn-eliminar-sol" disabled={eliminando === s.id} onClick={() => eliminarSolicitud(s.id)}>
                      {eliminando === s.id ? '...' : '✕ ELIMINAR'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* CALENDARIO ANUAL */}
        <div className="meses-grid">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
            const esVacacional = MESES_VACACIONAL.includes(mes)
            const anyo = new Date().getFullYear()
            const fecha = new Date(anyo, mes - 1, 1)
            const diasEnMes = getDaysInMonth(fecha)
            const primerDia = (getDay(startOfMonth(fecha)) + 6) % 7
            return (
              <div key={mes} className={`mes${esVacacional ? ' vacacional' : ''}`}>
                {esVacacional && <span className="mes-badge-vac">VACACIONAL</span>}
                <div className="mes-titulo">{NOMBRES_MESES[mes - 1]}</div>
                <div className="dias-semana">{['L','M','X','J','V','S','D'].map(d => <div key={d} className="dia-semana">{d}</div>)}</div>
                <div className="dias-grid">
                  {Array.from({ length: primerDia }, (_, i) => <div key={`v${i}`} className="dia vacio" />)}
                  {Array.from({ length: diasEnMes }, (_, i) => {
                    const dia = i + 1
                    const fechaStr = `${anyo}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                    const esHoyDia = isToday(new Date(anyo, mes - 1, dia))
                    const estaBloqueado = new Date(anyo, mes - 1, dia) <= limite7dias
                    const solsDelDia = solicitudesPorFecha[fechaStr] || []
                    const ofrece = solsDelDia.filter(s => s.rol === 'ofrece')
                    const busca = solsDelDia.filter(s => s.rol === 'busca')
                    const tieneInfo = solsDelDia.length > 0
                    return (
                      <div key={dia}
                        className={`dia${esHoyDia ? ' hoy' : ''}${estaBloqueado ? ' bloqueado' : ''}${tieneInfo && !estaBloqueado ? ' clickable' : ''}`}
                        onClick={() => tieneInfo && !estaBloqueado && setModalDia({ fecha: fechaStr, solicitudes: solsDelDia })}>
                        <span className="dia-num">{dia}</span>
                        {tieneInfo && !estaBloqueado && (
                          <div className="dia-barras">
                            {ofrece.length > 0 && <div className="dia-barra" style={{ background: '#60a5fa' }} />}
                            {busca.length > 0 && <div className="dia-barra" style={{ background: '#f87171' }} />}
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

        {/* SOLICITUDES COMPAÑEROS */}
        {solicitudes.filter(s => s.user_id !== miId && s.estado === 'abierta').length > 0 && (
          <>
            <div className="sols-titulo">SOLICITUDES DE COMPAÑEROS ({solicitudes.filter(s => s.user_id !== miId && s.estado === 'abierta').length})</div>
            <div className="vac-cards">
              {solicitudes.filter(s => s.user_id !== miId && s.estado === 'abierta').map(s => {
                const color = colorPorUsuario[s.user_id] || '#8a8070'
                return (
                  <div key={s.id} className="vac-card" style={{ borderLeftColor: color }} onClick={() => setModalDetalle(s)}>
                    <div className="vac-card-usuario">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span>{s.profiles?.nombre} {s.profiles?.apellidos}</span>
                      <span style={{ color: '#8a8070', fontSize: '0.75rem' }}>chapa {s.profiles?.chapa}</span>
                    </div>
                    <div className="vac-card-rango">
                      <span className="vac-card-label">Ofrece</span>
                      {renderLado(s.flexible_ofrecido, s.ofrecido_desde, s.ofrecido_hasta, s.num_dias, s.ofrecido_ventana_desde, s.ofrecido_ventana_hasta)}
                      <span className="vac-card-label" style={{ marginTop: '0.3rem' }}>Busca</span>
                      {renderLado(s.flexible_buscado, s.buscado_desde, s.buscado_hasta, s.num_dias, s.buscado_ventana_desde, s.buscado_ventana_hasta)}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL: Día */}
      {modalDia && (
        <div className="overlay" onClick={() => setModalDia(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>📅 {fmt(modalDia.fecha)}</h3>
            <div className="seccion-titulo">Solicitudes en este día</div>
            {[...new Map(modalDia.solicitudes.map(s => [s.id, s])).values()].map(s => (
              <div key={s.id} className="solicitud-card" style={{ borderLeft: `3px solid ${colorPorUsuario[s.user_id] || '#8a8070'}`, cursor: 'pointer' }}
                onClick={() => { setModalDetalle(s); setModalDia(null) }}>
                <div className="sol-usuario">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorPorUsuario[s.user_id] || '#8a8070', flexShrink: 0 }} />
                  {s.profiles?.nombre} {s.profiles?.apellidos}
                  {s.user_id === miId && <span className="tag tag-yo">YO</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4a4038', lineHeight: 1.8 }}>
                  <strong>Ofrece:</strong> {s.flexible_ofrecido ? `${s.num_dias} días entre el ${fmt(s.ofrecido_ventana_desde)} y el ${fmt(s.ofrecido_ventana_hasta)}` : `${fmt(s.ofrecido_desde)} → ${fmt(s.ofrecido_hasta)}`}<br />
                  <strong>Busca:</strong> {s.flexible_buscado ? `${s.num_dias} días entre el ${fmt(s.buscado_ventana_desde)} y el ${fmt(s.buscado_ventana_hasta)}` : `${fmt(s.buscado_desde)} → ${fmt(s.buscado_hasta)}`}
                </div>
              </div>
            ))}
            <div className="modal-btns"><button className="btn-gris" onClick={() => setModalDia(null)}>CERRAR</button></div>
          </div>
        </div>
      )}

      {/* MODAL: Detalle */}
      {modalDetalle && (
        <div className="overlay" onClick={() => setModalDetalle(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>INTERCAMBIO DE VACACIONES</h3>
            <div className="solicitud-card" style={{ borderLeft: `3px solid ${colorPorUsuario[modalDetalle.user_id] || '#8a8070'}`, cursor: 'default' }}>
              <div className="sol-usuario">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorPorUsuario[modalDetalle.user_id] || '#8a8070', flexShrink: 0 }} />
                <strong>{modalDetalle.profiles?.nombre} {modalDetalle.profiles?.apellidos}</strong>
                <span style={{ color: '#8a8070', fontSize: '0.78rem' }}>chapa {modalDetalle.profiles?.chapa}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#4a4038', lineHeight: 2 }}>
                <div><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#8a8070' }}>Ofrece </span>{renderLado(modalDetalle.flexible_ofrecido, modalDetalle.ofrecido_desde, modalDetalle.ofrecido_hasta, modalDetalle.num_dias, modalDetalle.ofrecido_ventana_desde, modalDetalle.ofrecido_ventana_hasta)}</div>
                <div><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#8a8070' }}>Busca </span>{renderLado(modalDetalle.flexible_buscado, modalDetalle.buscado_desde, modalDetalle.buscado_hasta, modalDetalle.num_dias, modalDetalle.buscado_ventana_desde, modalDetalle.buscado_ventana_hasta)}</div>
              </div>
            </div>
            <div className="modal-btns">
              {modalDetalle.user_id !== miId && modalDetalle.estado === 'abierta' && (
                <button className="btn-amarillo" onClick={() => { setModalAceptar(modalDetalle); setModalDetalle(null); resetAceptar() }}>
                  {tipoCaso(modalDetalle) === 'exacto-exacto' ? 'ACEPTAR INTERCAMBIO' : 'PROPONER INTERCAMBIO'}
                </button>
              )}
              <button className="btn-gris" onClick={() => setModalDetalle(null)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Aceptar */}
      {modalAceptar && (() => {
        const caso = tipoCaso(modalAceptar)
        const numExacto = caso === 'exacto-flexible' ? diasEntre(modalAceptar.ofrecido_desde, modalAceptar.ofrecido_hasta)
          : caso === 'flexible-exacto' ? diasEntre(modalAceptar.buscado_desde, modalAceptar.buscado_hasta)
          : modalAceptar.num_dias
        return (
          <div className="overlay" onClick={() => { setModalAceptar(null); resetAceptar() }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{caso === 'exacto-exacto' ? 'ACEPTAR INTERCAMBIO' : 'PROPONER INTERCAMBIO'}</h3>
              {caso === 'exacto-exacto' && (
                <>
                  <p style={{ fontSize: '0.82rem', color: '#8a8070', marginBottom: '1rem' }}>Confirma el intercambio con <strong style={{ color: '#1a1612' }}>{modalAceptar.profiles?.nombre} {modalAceptar.profiles?.apellidos}</strong>:</p>
                  <div className="resumen-intercambio">
                    <div><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#8a8070' }}>Tú recibes </span><strong style={{ color: '#c4a520' }}>{fmt(modalAceptar.ofrecido_desde)} → {fmt(modalAceptar.ofrecido_hasta)}</strong></div>
                    <div><span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#8a8070' }}>Tú das </span><strong style={{ color: '#c4a520' }}>{fmt(modalAceptar.buscado_desde)} → {fmt(modalAceptar.buscado_hasta)}</strong></div>
                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#8a8070' }}>{modalAceptar.num_dias} días cada uno</div>
                  </div>
                </>
              )}
              {(caso === 'exacto-flexible' || caso === 'flexible-exacto') && (
                <>
                  <p style={{ fontSize: '0.82rem', color: '#8a8070', marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#1a1612' }}>{modalAceptar.profiles?.nombre}</strong> ofrece{' '}
                    {caso === 'exacto-flexible' ? renderLado(false, modalAceptar.ofrecido_desde, modalAceptar.ofrecido_hasta, modalAceptar.num_dias, '', '') : renderLado(true, '', '', modalAceptar.num_dias, modalAceptar.ofrecido_ventana_desde, modalAceptar.ofrecido_ventana_hasta)}
                    {' '}y busca{' '}
                    {caso === 'exacto-flexible' ? renderLado(true, '', '', modalAceptar.num_dias, modalAceptar.buscado_ventana_desde, modalAceptar.buscado_ventana_hasta) : renderLado(false, modalAceptar.buscado_desde, modalAceptar.buscado_hasta, modalAceptar.num_dias, '', '')}.
                  </p>
                  <div className="ventana-info">📅 Elige <strong>{numExacto} días exactos</strong> dentro de la ventana: <strong>{caso === 'exacto-flexible' ? `${fmt(modalAceptar.buscado_ventana_desde)} — ${fmt(modalAceptar.buscado_ventana_hasta)}` : `${fmt(modalAceptar.ofrecido_ventana_desde)} — ${fmt(modalAceptar.ofrecido_ventana_hasta)}`}</strong></div>
                  <DatePicker label="Desde" value={aceptDesde} abreHacia="arriba" onChange={v => { setAceptDesde(v); if (aceptHasta && v > aceptHasta) setAceptHasta('') }}
                    minDate={caso === 'exacto-flexible' ? new Date(modalAceptar.buscado_ventana_desde + 'T00:00:00') : new Date(modalAceptar.ofrecido_ventana_desde + 'T00:00:00')}
                    maxDate={caso === 'exacto-flexible' ? new Date(modalAceptar.buscado_ventana_hasta + 'T00:00:00') : new Date(modalAceptar.ofrecido_ventana_hasta + 'T00:00:00')} />
                  <DatePicker label="Hasta" value={aceptHasta} abreHacia="arriba" onChange={setAceptHasta} mesInicial={mesDesdeAcept}
                    minDate={aceptDesde ? parseISO(aceptDesde) : limite7dias}
                    maxDate={caso === 'exacto-flexible' ? new Date(modalAceptar.buscado_ventana_hasta + 'T00:00:00') : new Date(modalAceptar.ofrecido_ventana_hasta + 'T00:00:00')} />
                  <Aviso desde={aceptDesde} hasta={aceptHasta} />
                  {aceptDesde && aceptHasta && aceptDesde <= aceptHasta && diasEntre(aceptDesde, aceptHasta) !== numExacto && (
                    <div style={{ fontSize: '0.75rem', color: '#c04040', background: '#fde8e8', borderRadius: '3px', padding: '0.35rem 0.6rem', marginTop: '0.3rem' }}>⚠️ Has seleccionado {diasEntre(aceptDesde, aceptHasta)} días, necesitas exactamente {numExacto}</div>
                  )}
                </>
              )}
              {caso === 'flexible-flexible' && (
                <>
                  <p style={{ fontSize: '0.82rem', color: '#8a8070', marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#1a1612' }}>{modalAceptar.profiles?.nombre}</strong> ofrece{' '}
                    {renderLado(true, '', '', modalAceptar.num_dias, modalAceptar.ofrecido_ventana_desde, modalAceptar.ofrecido_ventana_hasta)}
                    {' '}y busca{' '}{renderLado(true, '', '', modalAceptar.num_dias, modalAceptar.buscado_ventana_desde, modalAceptar.buscado_ventana_hasta)}.
                  </p>
                  <div className="field"><label>Número de días que ofreces / buscas</label><input type="number" min={1} max={30} value={aceptNumDias} onChange={e => setAceptNumDias(Number(e.target.value))} /></div>
                  <DatePicker label="Tu ventana desde" value={aceptVentanaDesde} abreHacia="arriba" onChange={setAceptVentanaDesde} minDate={limite7dias} />
                  <DatePicker label="Tu ventana hasta" value={aceptVentanaHasta} abreHacia="arriba" onChange={setAceptVentanaHasta} mesInicial={mesDesdeVentanaAcept} minDate={aceptVentanaDesde ? parseISO(aceptVentanaDesde) : limite7dias} />
                  {aceptVentanaDesde && aceptVentanaHasta && <div className="ventana-aviso">💡 El otro elegirá {aceptNumDias} días dentro de tu ventana</div>}
                </>
              )}
              <div className="modal-btns">
                <button className={caso === 'exacto-exacto' ? 'btn-verde' : 'btn-amarillo'} disabled={aceptando} onClick={aceptarIntercambio}>
                  {aceptando ? 'PROCESANDO...' : caso === 'exacto-exacto' ? '✓ CONFIRMAR INTERCAMBIO' : 'ENVIAR PROPUESTA'}
                </button>
                <button className="btn-gris" onClick={() => { setModalAceptar(null); resetAceptar() }}>CANCELAR</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL: Nueva */}
      {modalNueva && (
        <div className="overlay" onClick={() => { setModalNueva(false); resetForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>NUEVO INTERCAMBIO</h3>
            <p style={{ fontSize: '0.8rem', color: '#8a8070', marginBottom: '1rem' }}>Indica qué días ofreces y qué días buscas. Mínimo 7 días de antelación.</p>
            <div className="bloque-lado">
              <div className="bloque-lado-titulo">📤 LO QUE OFRECES</div>
              <label className="toggle-flexible"><input type="checkbox" checked={ofrecidoFlexible} onChange={e => setOfrecidoFlexible(e.target.checked)} />Flexible (indico una ventana de fechas)</label>
              {ofrecidoFlexible ? (
                <>
                  {buscadoFlexible ? <div className="field"><label>Número de días que ofreces</label><input type="number" min={1} max={30} value={ofrecidoNumDias} onChange={e => setOfrecidoNumDias(Number(e.target.value))} /></div>
                    : buscadoDesde && buscadoHasta ? <InfoDiasAuto dias={diasEntre(buscadoDesde, buscadoHasta)} texto="Ofrecerás" /> : null}
                  <DatePicker label="Ventana desde" value={ofrecidoVentanaDesde} abreHacia="abajo" onChange={setOfrecidoVentanaDesde} minDate={limite7dias} />
                  <DatePicker label="Ventana hasta" value={ofrecidoVentanaHasta} abreHacia="abajo" onChange={setOfrecidoVentanaHasta} mesInicial={mesDesdeVentanaOfrecido} minDate={ofrecidoVentanaDesde ? parseISO(ofrecidoVentanaDesde) : limite7dias} />
                  {ofrecidoVentanaDesde && ofrecidoVentanaHasta && ofrecidoVentanaDesde <= ofrecidoVentanaHasta && <div className="ventana-aviso">💡 {numDiasOfrecido} días a elegir dentro de esa ventana</div>}
                </>
              ) : (
                <>
                  <DatePicker label="Desde" value={ofrecidoDesde} abreHacia="abajo" onChange={v => { setOfrecidoDesde(v); if (ofrecidoHasta && v > ofrecidoHasta) setOfrecidoHasta('') }} minDate={limite7dias} />
                  <DatePicker label="Hasta" value={ofrecidoHasta} abreHacia="abajo" onChange={setOfrecidoHasta} mesInicial={mesDesdeOfrecido} minDate={ofrecidoDesde ? parseISO(ofrecidoDesde) : limite7dias} />
                  <Aviso desde={ofrecidoDesde} hasta={ofrecidoHasta} />
                </>
              )}
            </div>
            <div className="bloque-lado">
              <div className="bloque-lado-titulo">📥 LO QUE BUSCAS</div>
              <label className="toggle-flexible"><input type="checkbox" checked={buscadoFlexible} onChange={e => setBuscadoFlexible(e.target.checked)} />Flexible (indico una ventana de fechas)</label>
              {buscadoFlexible ? (
                <>
                  {ofrecidoFlexible ? <div className="field"><label>Número de días que buscas</label><input type="number" min={1} max={30} value={buscadoNumDias} onChange={e => setBuscadoNumDias(Number(e.target.value))} /></div>
                    : ofrecidoDesde && ofrecidoHasta ? <InfoDiasAuto dias={diasEntre(ofrecidoDesde, ofrecidoHasta)} texto="Buscarás" /> : null}
                  <DatePicker label="Ventana desde" value={buscadoVentanaDesde} abreHacia="arriba" onChange={setBuscadoVentanaDesde} minDate={limite7dias} />
                  <DatePicker label="Ventana hasta" value={buscadoVentanaHasta} abreHacia="arriba" onChange={setBuscadoVentanaHasta} mesInicial={mesDesdeVentanaBuscado} minDate={buscadoVentanaDesde ? parseISO(buscadoVentanaDesde) : limite7dias} />
                  {buscadoVentanaDesde && buscadoVentanaHasta && buscadoVentanaDesde <= buscadoVentanaHasta && <div className="ventana-aviso">💡 {numDiasBuscado} días a elegir dentro de esa ventana</div>}
                </>
              ) : (
                <>
                  <DatePicker label="Desde" value={buscadoDesde} abreHacia="arriba" onChange={v => { setBuscadoDesde(v); if (buscadoHasta && v > buscadoHasta) setBuscadoHasta('') }} minDate={limite7dias} />
                  <DatePicker label="Hasta" value={buscadoHasta} abreHacia="arriba" onChange={setBuscadoHasta} mesInicial={mesDesdeBuscado} minDate={buscadoDesde ? parseISO(buscadoDesde) : limite7dias} />
                  <Aviso desde={buscadoDesde} hasta={buscadoHasta} />
                </>
              )}
            </div>
            {errorForm && <div className="error-form">⚠️ {errorForm}</div>}
            <div className="modal-btns">
              <button className="btn-amarillo" disabled={guardando} onClick={crearSolicitud}>{guardando ? 'PUBLICANDO...' : 'PUBLICAR SOLICITUD'}</button>
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
    <Suspense fallback={<div style={{ background: '#f5f0eb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4a520', fontFamily: 'sans-serif', fontSize: '1.5rem', letterSpacing: '3px' }}>CARGANDO...</div>}>
      <VacacionesContent />
    </Suspense>
  )
}