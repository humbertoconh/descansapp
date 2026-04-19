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

// ─── SELECTOR DE FECHA CON POSICIÓN FIXED ───────────────────────────────────
function DatePicker({ value, onChange, label, mesInicial, minDate, maxDate }: {
  value: string
  onChange: (v: string) => void
  label: string
  mesInicial?: Date
  minDate?: Date
  maxDate?: Date
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
      if (btnRef.current && !btnRef.current.closest('[data-datepicker]')?.contains(e.target as Node)) {
        setAbierto(false)
      }
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
    if (minDate && fecha <= minDate) return false
    if (maxDate && fecha > maxDate) return false
    return true
  }

  const seleccionar = (dia: number) => {
    if (!esDiaValido(dia)) return
    onChange(toDateStr(new Date(anyo, mes, dia)))
    setAbierto(false)
  }

  const calendarStyle: React.CSSProperties = rect ? {
    position: 'fixed',
    left: rect.left,
    width: rect.width,
    bottom: window.innerHeight - rect.top + 4,
    zIndex: 9999,
    background: '#fff',
    border: '1px solid #e0d8d0',
    borderRadius: '4px',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    padding: '0.75rem',
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
            <button type="button" onClick={() => setMesActual(subMonths(mesActual, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4038', fontSize: '1.2rem', padding: '0.25rem 0.5rem', borderRadius: '2px' }}>‹</button>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '2px', color: '#c4a520' }}>{NOMBRES_MESES[mes]} {anyo}</span>
            <button type="button" onClick={() => setMesActual(addMonths(mesActual, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4038', fontSize: '1.2rem', padding: '0.25rem 0.5rem', borderRadius: '2px' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.25rem' }}>
            {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', color: '#8a8070', textTransform: 'uppercase', letterSpacing: '1px', padding: '0.2rem 0' }}>{d}</div>)}
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
                  style={{ aspectRatio: '1', border: seleccionado ? '2px solid #f5c518' : esHoyDia ? '1px solid #c4a520' : '1px solid transparent', borderRadius: '3px', cursor: valido ? 'pointer' : 'default', background: seleccionado ? '#f5c518' : esVac ? '#fffbf0' : '#f0ebe5', color: seleccionado ? '#0f0f0f' : !valido ? '#c8c0b8' : '#1a1612', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}>
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
// ─────────────────────────────────────────────────────────────────────────────

function VacacionesContent() {
  const supabase = createClient()
  const [miId, setMiId] = useState('')
  const [miGrupo, setMiGrupo] = useState('')
  const [companyeros, setCompanyeros] = useState<any[]>([])
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [aceptaciones, setAceptaciones] = useState<any[]>([])
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

  const validarFormulario = () => {
    if (!ofrecidoFlexible) {
      if (!ofrecidoDesde || !ofrecidoHasta) return 'Indica las fechas que ofreces'
      if (parseISO(ofrecidoDesde) <= limite7dias) return 'Los días ofrecidos deben ser con más de 7 días de antelación'
      const err = validarRango(ofrecidoDesde, ofrecidoHasta)
      if (err) return `Lo que ofreces: ${err}`
    } else {
      if (!ofrecidoVentanaDesde || !ofrecidoVentanaHasta) return 'Indica la ventana de fechas que ofreces'
      if (parseISO(ofrecidoVentanaDesde) <= limite7dias) return 'La ventana ofrecida debe ser con más de 7 días de antelación'
      if (diasEntre(ofrecidoVentanaDesde, ofrecidoVentanaHasta) < ofrecidoNumDias) return `La ventana debe tener al menos ${ofrecidoNumDias} días`
    }
    if (!buscadoFlexible) {
      if (!buscadoDesde || !buscadoHasta) return 'Indica las fechas que buscas'
      if (parseISO(buscadoDesde) <= limite7dias) return 'Los días buscados deben ser con más de 7 días de antelación'
      const err = validarRango(buscadoDesde, buscadoHasta)
      if (err) return `Lo que buscas: ${err}`
    } else {
      if (!buscadoVentanaDesde || !buscadoVentanaHasta) return 'Indica la ventana de fechas que buscas'
      if (diasEntre(buscadoVentanaDesde, buscadoVentanaHasta) < buscadoNumDias) return `La ventana debe tener al menos ${buscadoNumDias} días`
    }
    const dO = ofrecidoFlexible ? ofrecidoNumDias : diasEntre(ofrecidoDesde, ofrecidoHasta)
    const dB = buscadoFlexible ? buscadoNumDias : diasEntre(buscadoDesde, buscadoHasta)
    if (dO !== dB) return `Los días ofrecidos (${dO}) y buscados (${dB}) deben ser la misma cantidad`
    return ''
  }

  const validarAceptacion = (): string => {
    if (!modalAceptar) return ''
    const caso = tipoCaso(modalAceptar)
    if (caso === 'exacto-exacto') return ''
    if (caso === 'exacto-flexible' || caso === 'flexible-exacto') {
      if (!aceptDesde || !aceptHasta) return 'Indica las fechas que ofreces'
      if (aceptDesde > aceptHasta) return 'La fecha inicio debe ser anterior a la de fin'
      if (parseISO(aceptDesde) <= limite7dias) return 'Los días deben ser con más de 7 días de antelación'
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
    const numDias = ofrecidoFlexible ? ofrecidoNumDias : diasEntre(ofrecidoDesde, ofrecidoHasta)
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
    let ofDesde: string | null = null
    let ofHasta: string | null = null
    let ofVentDesde: string | null = null
    let ofVentHasta: string | null = null
    let numD = modalAceptar.num_dias
    let esFlexible = false

    if (caso === 'exacto-exacto') {
      ofDesde = modalAceptar.buscado_desde
      ofHasta = modalAceptar.buscado_hasta
    } else if (caso === 'exacto-flexible' || caso === 'flexible-exacto') {
      ofDesde = aceptDesde
      ofHasta = aceptHasta
      numD = diasEntre(aceptDesde, aceptHasta)
    } else {
      ofVentDesde = aceptVentanaDesde
      ofVentHasta = aceptVentanaHasta
      numD = aceptNumDias
      esFlexible = true
    }

    await supabase.rpc('aceptar_vacacion', {
      p_solicitud_id: modalAceptar.id,
      p_aceptante_id: miId,
      p_ofrecido_desde: ofDesde,
      p_ofrecido_hasta: ofHasta,
      p_ofrecido_ventana_desde: ofVentDesde,
      p_ofrecido_ventana_hasta: ofVentHasta,
      p_num_dias: numD,
      p_flexible: esFlexible,
    })

    const { data: miPerfil } = await supabase.from('profiles').select('nombre, apellidos, chapa').eq('id', miId).single()

    if (miPerfil) {
      // Lo que A da (sus días ofrecidos en la solicitud)
      const loDaA = descripcionLado(modalAceptar, 'ofrecido')
      // Lo que B ofrece a A
      const loRecibeA = esFlexible
        ? `${numD} días entre el ${fmt(ofVentDesde || '')} y el ${fmt(ofVentHasta || '')}`
        : `${fmt(ofDesde || '')} → ${fmt(ofHasta || '')}`

      // Notificación campana para A
      await supabase.from('notificaciones').insert({
        user_id: modalAceptar.user_id,
        tipo: 'aceptacion',
        titulo: '🏖️ Alguien acepta tu intercambio de vacaciones',
        mensaje: `${miPerfil.nombre} ${miPerfil.apellidos} (chapa ${miPerfil.chapa}) acepta tu intercambio. Tú das: ${loDaA}. Tú recibes: ${loRecibeA}. Entra en Vacaciones para confirmarlo.`,
        leida: false,
      })

      // Email a A con los dos lados
      const { data: emailA } = await supabase.rpc('get_user_email', { p_user_id: modalAceptar.user_id })
      if (emailA) {
        await enviarEmail(emailA,
          '✅ Alguien acepta tu intercambio de vacaciones - DescansApp',
          templateNotificacion('¡Alguien acepta tu intercambio!',
            `<strong>${miPerfil.nombre} ${miPerfil.apellidos}</strong> (chapa ${miPerfil.chapa}) acepta el intercambio contigo.<br><br>
            Tú das: <strong>${loDaA}</strong><br>
            Tú recibes: <strong>${loRecibeA}</strong><br><br>
            Entra en DescansApp en la sección Vacaciones para confirmar el intercambio.`))
      }
    }

    await cargar()
    setModalAceptar(null)
    setModalDetalle(null)
    resetAceptar()
    setAceptando(false)
  }

  const confirmarIntercambio = async (solicitudId: string) => {
    setConfirmando(solicitudId)
    await supabase.from('vacaciones_solicitudes').update({ estado: 'confirmada' }).eq('id', solicitudId)

    const acept = aceptaciones.find(a => a.solicitud_id === solicitudId)
    const sol = solicitudes.find(s => s.id === solicitudId)

    if (acept && sol) {
      const { data: perfilA } = await supabase.from('profiles').select('nombre, apellidos, chapa').eq('id', miId).single()
      const { data: emailB } = await supabase.rpc('get_user_email', { p_user_id: acept.aceptante_id })

      if (perfilA) {
        const loDaB = descripcionLado(sol, 'ofrecido') // lo que A ofrece = lo que B recibe
        const loRecibeB = acept.flexible
          ? `${acept.num_dias} días entre el ${fmt(acept.ofrecido_ventana_desde)} y el ${fmt(acept.ofrecido_ventana_hasta)}`
          : `${fmt(acept.ofrecido_desde)} → ${fmt(acept.ofrecido_hasta)}`

        // Notificación campana para B
        await supabase.from('notificaciones').insert({
          user_id: acept.aceptante_id,
          tipo: 'completado',
          titulo: '✅ Intercambio de vacaciones confirmado',
          mensaje: `${perfilA.nombre} ${perfilA.apellidos} (chapa ${perfilA.chapa}) ha confirmado el intercambio. Tú das: ${loRecibeB}. Tú recibes: ${loDaB}. Recuerda tramitarlo con el Dpto. de Asignación de Personal.`,
          leida: false,
        })

        // Email a B con los dos lados
        if (emailB) {
          await enviarEmail(emailB,
            '✅ Intercambio de vacaciones confirmado - DescansApp',
            templateNotificacion('¡Intercambio de vacaciones confirmado!',
              `<strong>${perfilA.nombre} ${perfilA.apellidos}</strong> (chapa ${perfilA.chapa}) ha confirmado el intercambio contigo.<br><br>
              Tú das: <strong>${loRecibeB}</strong><br>
              Tú recibes: <strong>${loDaB}</strong><br><br>
              Recuerda tramitar el cambio con el Departamento de Asignación de Personal.`))
        }
      }
    }

    await cargar()
    setConfirmando(null)
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

  const mesDesdeOfrecido = ofrecidoDesde ? new Date(ofrecidoDesde + 'T00:00:00') : undefined
  const mesDesdeVentanaOfrecido = ofrecidoVentanaDesde ? new Date(ofrecidoVentanaDesde + 'T00:00:00') : undefined
  const mesDesdeBuscado = buscadoDesde ? new Date(buscadoDesde + 'T00:00:00') : undefined
  const mesDesdeVentanaBuscado = buscadoVentanaDesde ? new Date(buscadoVentanaDesde + 'T00:00:00') : undefined
  const mesDesdeAcept = aceptDesde ? new Date(aceptDesde + 'T00:00:00') : undefined
  const mesDesdeVentanaAcept = aceptVentanaDesde ? new Date(aceptVentanaDesde + 'T00:00:00') : undefined

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
        .estado-pill { font-size: 0.62rem; padding: 0.15rem 0.5rem; border-radius: 2px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; white-space: nowrap; }
        .acept-aviso { margin-top: 0.5rem; background: #f0fdf4; border: 1px solid #86efac; border-radius: 3px; padding: 0.4rem 0.6rem; font-size: 0.78rem; color: #166534; }
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

        {/* MIS SOLICITUDES */}
        <div className="mis-sols">
          <div className="mis-sols-titulo">MIS SOLICITUDES ({mySolicitudes.length})</div>
          {mySolicitudes.length === 0 ? (
            <p className="mis-sols-vacio">No tienes solicitudes activas. Pulsa "+ NUEVO INTERCAMBIO" para publicar una.</p>
          ) : mySolicitudes.map(s => {
            const acept = aceptaciones.find(a => a.solicitud_id === s.id)
            return (
              <div key={s.id} className="mis-sol-card">
                <div className="mis-sol-info">
                  <span className="mis-sol-label">Ofrezco</span>
                  <span className="mis-sol-valor">{descripcionLado(s, 'ofrecido')}</span>
                  <span className="mis-sol-label" style={{ marginTop: '0.3rem' }}>Busco</span>
                  <span className="mis-sol-valor">{descripcionLado(s, 'buscado')}</span>
                  {acept && (
                    <div className="acept-aviso">
                      ✓ <strong>{acept.profiles?.nombre} {acept.profiles?.apellidos}</strong> (chapa {acept.profiles?.chapa}) acepta:{' '}
                      {acept.flexible
                        ? `${acept.num_dias} días entre el ${fmt(acept.ofrecido_ventana_desde)} y el ${fmt(acept.ofrecido_ventana_hasta)}`
                        : `${fmt(acept.ofrecido_desde)} → ${fmt(acept.ofrecido_hasta)}`}
                    </div>
                  )}
                </div>
                <div className="mis-sol-acciones">
                  {s.estado === 'esperando_confirmacion' && (
                    <span className="estado-pill" style={{ background: '#fef3c7', color: '#92400e' }}>ESPERANDO</span>
                  )}
                  {s.estado === 'esperando_confirmacion' && acept && (
                    <button className="btn-confirmar-sol" disabled={confirmando === s.id} onClick={() => confirmarIntercambio(s.id)}>
                      {confirmando === s.id ? '...' : '✓ CONFIRMAR'}
                    </button>
                  )}
                  <button className="btn-eliminar-sol" disabled={eliminando === s.id} onClick={() => eliminarSolicitud(s.id)}>
                    {eliminando === s.id ? '...' : '✕ ELIMINAR'}
                  </button>
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
        {solicitudes.filter(s => s.user_id !== miId).length > 0 && (
          <>
            <div className="sols-titulo">SOLICITUDES DE COMPAÑEROS ({solicitudes.filter(s => s.user_id !== miId).length})</div>
            <div className="vac-cards">
              {solicitudes.filter(s => s.user_id !== miId).map(s => {
                const color = colorPorUsuario[s.user_id] || '#8a8070'
                return (
                  <div key={s.id} className="vac-card" style={{ borderLeftColor: color }} onClick={() => setModalDetalle(s)}>
                    <div className="vac-card-usuario">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span>{s.profiles?.nombre} {s.profiles?.apellidos}</span>
                      <span style={{ color: '#8a8070', fontSize: '0.75rem' }}>chapa {s.profiles?.chapa}</span>
                      {s.estado === 'esperando_confirmacion' && <span className="estado-pill" style={{ background: '#fef3c7', color: '#92400e' }}>ESPERANDO</span>}
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
                  <strong>Ofrece:</strong> {descripcionLado(s, 'ofrecido')}<br />
                  <strong>Busca:</strong> {descripcionLado(s, 'buscado')}
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
            {modalDetalle.estado === 'esperando_confirmacion' && (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '3px', padding: '0.6rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#92400e' }}>
                ⏳ Pendiente de confirmación por el solicitante.
              </div>
            )}
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
        const numExacto = caso === 'exacto-flexible'
          ? diasEntre(modalAceptar.ofrecido_desde, modalAceptar.ofrecido_hasta)
          : caso === 'flexible-exacto'
          ? diasEntre(modalAceptar.buscado_desde, modalAceptar.buscado_hasta)
          : modalAceptar.num_dias

        return (
          <div className="overlay" onClick={() => { setModalAceptar(null); resetAceptar() }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{caso === 'exacto-exacto' ? 'ACEPTAR INTERCAMBIO' : 'PROPONER INTERCAMBIO'}</h3>

              {caso === 'exacto-exacto' && (
                <>
                  <p style={{ fontSize: '0.82rem', color: '#8a8070', marginBottom: '1rem' }}>
                    Confirma el intercambio con <strong style={{ color: '#1a1612' }}>{modalAceptar.profiles?.nombre} {modalAceptar.profiles?.apellidos}</strong>:
                  </p>
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
                    {caso === 'exacto-flexible'
                      ? renderLado(false, modalAceptar.ofrecido_desde, modalAceptar.ofrecido_hasta, modalAceptar.num_dias, '', '')
                      : renderLado(true, '', '', modalAceptar.num_dias, modalAceptar.ofrecido_ventana_desde, modalAceptar.ofrecido_ventana_hasta)
                    }
                    {' '}y busca{' '}
                    {caso === 'exacto-flexible'
                      ? renderLado(true, '', '', modalAceptar.num_dias, modalAceptar.buscado_ventana_desde, modalAceptar.buscado_ventana_hasta)
                      : renderLado(false, modalAceptar.buscado_desde, modalAceptar.buscado_hasta, modalAceptar.num_dias, '', '')
                    }.
                  </p>
                  <div className="ventana-info">
                    📅 Elige <strong>{numExacto} días exactos</strong> dentro de la ventana:{' '}
                    <strong>
                      {caso === 'exacto-flexible'
                        ? `${fmt(modalAceptar.buscado_ventana_desde)} — ${fmt(modalAceptar.buscado_ventana_hasta)}`
                        : `${fmt(modalAceptar.ofrecido_ventana_desde)} — ${fmt(modalAceptar.ofrecido_ventana_hasta)}`
                      }
                    </strong>
                  </div>
                  <DatePicker label="Desde" value={aceptDesde}
                    onChange={v => { setAceptDesde(v); if (aceptHasta && v > aceptHasta) setAceptHasta('') }}
                    minDate={caso === 'exacto-flexible'
                      ? new Date(modalAceptar.buscado_ventana_desde + 'T00:00:00')
                      : new Date(modalAceptar.ofrecido_ventana_desde + 'T00:00:00')
                    }
                    maxDate={caso === 'exacto-flexible'
                      ? new Date(modalAceptar.buscado_ventana_hasta + 'T00:00:00')
                      : new Date(modalAceptar.ofrecido_ventana_hasta + 'T00:00:00')
                    }
                  />
                  <DatePicker label="Hasta" value={aceptHasta} onChange={setAceptHasta}
                    mesInicial={mesDesdeAcept}
                    minDate={aceptDesde ? parseISO(aceptDesde) : limite7dias}
                    maxDate={caso === 'exacto-flexible'
                      ? new Date(modalAceptar.buscado_ventana_hasta + 'T00:00:00')
                      : new Date(modalAceptar.ofrecido_ventana_hasta + 'T00:00:00')
                    }
                  />
                  <Aviso desde={aceptDesde} hasta={aceptHasta} />
                  {aceptDesde && aceptHasta && aceptDesde <= aceptHasta && diasEntre(aceptDesde, aceptHasta) !== numExacto && (
                    <div style={{ fontSize: '0.75rem', color: '#c04040', background: '#fde8e8', borderRadius: '3px', padding: '0.35rem 0.6rem', marginTop: '0.3rem' }}>
                      ⚠️ Has seleccionado {diasEntre(aceptDesde, aceptHasta)} días, necesitas exactamente {numExacto}
                    </div>
                  )}
                </>
              )}

              {caso === 'flexible-flexible' && (
                <>
                  <p style={{ fontSize: '0.82rem', color: '#8a8070', marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#1a1612' }}>{modalAceptar.profiles?.nombre}</strong> ofrece{' '}
                    {renderLado(true, '', '', modalAceptar.num_dias, modalAceptar.ofrecido_ventana_desde, modalAceptar.ofrecido_ventana_hasta)}
                    {' '}y busca{' '}
                    {renderLado(true, '', '', modalAceptar.num_dias, modalAceptar.buscado_ventana_desde, modalAceptar.buscado_ventana_hasta)}.
                  </p>
                  <div className="field">
                    <label>Número de días que ofreces / buscas</label>
                    <input type="number" min={1} max={30} value={aceptNumDias} onChange={e => setAceptNumDias(Number(e.target.value))} />
                  </div>
                  <DatePicker label="Tu ventana desde" value={aceptVentanaDesde} onChange={setAceptVentanaDesde} minDate={limite7dias} />
                  <DatePicker label="Tu ventana hasta" value={aceptVentanaHasta} onChange={setAceptVentanaHasta} mesInicial={mesDesdeVentanaAcept} minDate={aceptVentanaDesde ? parseISO(aceptVentanaDesde) : limite7dias} />
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

      {/* MODAL: Nueva solicitud */}
      {modalNueva && (
        <div className="overlay" onClick={() => { setModalNueva(false); resetForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>NUEVO INTERCAMBIO</h3>
            <p style={{ fontSize: '0.8rem', color: '#8a8070', marginBottom: '1rem' }}>
              Indica qué días ofreces y qué días buscas. Mínimo 7 días de antelación.
            </p>
            <div className="bloque-lado">
              <div className="bloque-lado-titulo">📤 LO QUE OFRECES</div>
              <label className="toggle-flexible"><input type="checkbox" checked={ofrecidoFlexible} onChange={e => setOfrecidoFlexible(e.target.checked)} />Flexible (indico una ventana de fechas)</label>
              {ofrecidoFlexible ? (
                <>
                  <div className="field"><label>Número de días que ofreces</label><input type="number" min={1} max={30} value={ofrecidoNumDias} onChange={e => setOfrecidoNumDias(Number(e.target.value))} /></div>
                  <DatePicker label="Ventana desde" value={ofrecidoVentanaDesde} onChange={setOfrecidoVentanaDesde} minDate={limite7dias} />
                  <DatePicker label="Ventana hasta" value={ofrecidoVentanaHasta} onChange={setOfrecidoVentanaHasta} mesInicial={mesDesdeVentanaOfrecido} minDate={ofrecidoVentanaDesde ? parseISO(ofrecidoVentanaDesde) : limite7dias} />
                  {ofrecidoVentanaDesde && ofrecidoVentanaHasta && ofrecidoVentanaDesde <= ofrecidoVentanaHasta && <div className="ventana-aviso">💡 {ofrecidoNumDias} días a elegir dentro de esa ventana</div>}
                </>
              ) : (
                <>
                  <DatePicker label="Desde" value={ofrecidoDesde} onChange={v => { setOfrecidoDesde(v); if (ofrecidoHasta && v > ofrecidoHasta) setOfrecidoHasta('') }} minDate={limite7dias} />
                  <DatePicker label="Hasta" value={ofrecidoHasta} onChange={setOfrecidoHasta} mesInicial={mesDesdeOfrecido} minDate={ofrecidoDesde ? parseISO(ofrecidoDesde) : limite7dias} />
                  <Aviso desde={ofrecidoDesde} hasta={ofrecidoHasta} />
                </>
              )}
            </div>
            <div className="bloque-lado">
              <div className="bloque-lado-titulo">📥 LO QUE BUSCAS</div>
              <label className="toggle-flexible"><input type="checkbox" checked={buscadoFlexible} onChange={e => setBuscadoFlexible(e.target.checked)} />Flexible (indico una ventana de fechas)</label>
              {buscadoFlexible ? (
                <>
                  <div className="field"><label>Número de días que buscas</label><input type="number" min={1} max={30} value={buscadoNumDias} onChange={e => setBuscadoNumDias(Number(e.target.value))} /></div>
                  <DatePicker label="Ventana desde" value={buscadoVentanaDesde} onChange={setBuscadoVentanaDesde} minDate={limite7dias} />
                  <DatePicker label="Ventana hasta" value={buscadoVentanaHasta} onChange={setBuscadoVentanaHasta} mesInicial={mesDesdeVentanaBuscado} minDate={buscadoVentanaDesde ? parseISO(buscadoVentanaDesde) : limite7dias} />
                  {buscadoVentanaDesde && buscadoVentanaHasta && buscadoVentanaDesde <= buscadoVentanaHasta && <div className="ventana-aviso">💡 {buscadoNumDias} días a elegir dentro de esa ventana</div>}
                </>
              ) : (
                <>
                  <DatePicker label="Desde" value={buscadoDesde} onChange={v => { setBuscadoDesde(v); if (buscadoHasta && v > buscadoHasta) setBuscadoHasta('') }} minDate={limite7dias} />
                  <DatePicker label="Hasta" value={buscadoHasta} onChange={setBuscadoHasta} mesInicial={mesDesdeBuscado} minDate={buscadoDesde ? parseISO(buscadoDesde) : limite7dias} />
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