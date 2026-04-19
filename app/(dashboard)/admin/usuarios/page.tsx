'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { enviarEmail, templateNotificacion } from '@/lib/email'

const GRUPO_COLOR: Record<string, string> = {
  'Capataces': '#3b82f6',
  'Clasificadores': '#10b981',
  'G-A': '#f59e0b', 'G-B': '#f59e0b', 'G-C': '#f59e0b', 'G-D': '#f59e0b',
  'G-DA': '#f59e0b', 'G-DB': '#f59e0b', 'G-E': '#f59e0b', 'G-I': '#f59e0b', 'SIN-F': '#f59e0b',
}

const ACCION_COLOR: Record<string, string> = {
  solicitud_creada: '#60a5fa',
  solicitud_cancelada: '#f87171',
  intercambio_aceptado: '#fb923c',
  intercambio_confirmado: '#34d399',
  dia_soltado: '#a78bfa',
  dia_asignado: '#34d399',
  lista_espera_entrada: '#f472b6',
  lista_espera_salida: '#6a6058',
  usuario_registrado: '#60a5fa',
  usuario_aprobado: '#34d399',
  usuario_eliminado: '#f87171',
}

const ACCION_LABEL: Record<string, string> = {
  solicitud_creada: 'Solicitud creada',
  solicitud_cancelada: 'Solicitud cancelada',
  intercambio_aceptado: 'Intercambio aceptado',
  intercambio_confirmado: 'Intercambio confirmado',
  dia_soltado: 'Día soltado',
  dia_asignado: 'Día asignado',
  lista_espera_entrada: 'Lista espera entrada',
  lista_espera_salida: 'Lista espera salida',
  usuario_registrado: 'Usuario registrado',
  usuario_aprobado: 'Usuario aprobado',
  usuario_eliminado: 'Usuario eliminado',
}

const GRUPOS = [
  'Capataces', 'Clasificadores',
  'G-A', 'G-B', 'G-C', 'G-D', 'G-DA', 'G-DB', 'G-E', 'G-I', 'SIN-F'
]

type Auditoria = {
  id: string
  created_at: string
  user_chapa: string
  user_nombre: string
  accion: string
  tabla: string
  descripcion: string
}

export default function AdminUsuariosPage() {
  const supabase = createClient()
  const [pendientes, setPendientes] = useState<Profile[]>([])
  const [aprobados, setAprobados] = useState<Profile[]>([])
  const [auditoria, setAuditoria] = useState<Auditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAuditoria, setLoadingAuditoria] = useState(false)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [tab, setTab] = useState<'pendientes' | 'aprobados' | 'auditoria'>('pendientes')
  const [confirmarEliminar, setConfirmarEliminar] = useState<Profile | null>(null)
  const [filtroAccion, setFiltroAccion] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [modalCambioGrupo, setModalCambioGrupo] = useState<Profile | null>(null)
  const [nuevoGrupo, setNuevoGrupo] = useState('')
  const [cambiandoGrupo, setCambiandoGrupo] = useState(false)

  const fetchUsuarios = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) {
      setPendientes(data.filter(p => !p.aprobado))
      setAprobados(data.filter(p => p.aprobado))
    }
    setLoading(false)
  }

  const fetchAuditoria = async () => {
    setLoadingAuditoria(true)
    const { data } = await supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(200)
    setAuditoria(data || [])
    setLoadingAuditoria(false)
  }

  useEffect(() => { fetchUsuarios() }, [])
  useEffect(() => { if (tab === 'auditoria') fetchAuditoria() }, [tab])

  const aprobar = async (id: string) => {
    setAccionando(id)
    await supabase.from('profiles').update({ aprobado: true, aprobado_at: new Date().toISOString() }).eq('id', id)
    await fetchUsuarios()
    setAccionando(null)
  }

  const desactivar = async (id: string) => {
    setAccionando(id)
    await supabase.from('profiles').update({ aprobado: false, aprobado_at: null }).eq('id', id)
    await fetchUsuarios()
    setAccionando(null)
  }

  const hacerAdmin = async (id: string, esAdmin: boolean) => {
    setAccionando(id)
    await supabase.from('profiles').update({ is_admin: !esAdmin }).eq('id', id)
    await fetchUsuarios()
    setAccionando(null)
  }

  const eliminarUsuario = async (usuario: Profile) => {
    setAccionando(usuario.id)
    const { data: sols } = await supabase.from('solicitudes').select('id').eq('solicitante_id', usuario.id)
    if (sols && sols.length > 0) {
      const ids = sols.map(s => s.id)
      await supabase.from('aceptaciones').delete().in('solicitud_id', ids)
      await supabase.from('dias_ofrecidos').delete().in('solicitud_id', ids)
      await supabase.from('solicitudes').delete().in('id', ids)
    }
    await supabase.from('lista_espera').delete().eq('user_id', usuario.id)
    await supabase.from('dias_sueltos').delete().eq('user_id', usuario.id)
    await supabase.from('notificaciones').delete().eq('user_id', usuario.id)
    await supabase.from('dias_sueltos').update({ asignado_a: null }).eq('asignado_a', usuario.id)
    await supabase.from('profiles').delete().eq('id', usuario.id)
    try { await supabase.rpc('eliminar_usuario_auth', { p_user_id: usuario.id }) } catch {}
    setConfirmarEliminar(null)
    await fetchUsuarios()
    setAccionando(null)
  }

  const cambiarGrupo = async () => {
    if (!modalCambioGrupo || !nuevoGrupo) return
    setCambiandoGrupo(true)
    try {
      const { data: resultado } = await supabase.rpc('cambiar_grupo_usuario', {
        p_user_id: modalCambioGrupo.id,
        p_nuevo_grupo: nuevoGrupo,
      })

      // Email al usuario
      const { data: emailData } = await supabase.rpc('get_user_email', { p_user_id: modalCambioGrupo.id })
      if (emailData) {
        const partes = []
        if (resultado.solicitudes_canceladas > 0)
          partes.push(`${resultado.solicitudes_canceladas} solicitud(es) de intercambio cancelada(s)`)
        if (resultado.espera_eliminadas > 0)
          partes.push(`${resultado.espera_eliminadas} entrada(s) en lista de espera eliminada(s)`)
        if (resultado.sueltos_eliminados > 0)
          partes.push(`${resultado.sueltos_eliminados} día(s) suelto(s) retirado(s)`)

        const detalle = partes.length > 0
          ? `Como consecuencia del cambio, se han cancelado automáticamente: ${partes.join(', ')}.`
          : 'No tenías registros pendientes, por lo que no se ha cancelado nada.'

        await enviarEmail(
          emailData,
          '📋 Cambio de grupo en DescansApp',
          templateNotificacion(
            'Tu grupo de descansos ha cambiado',
            `Tu grupo ha sido cambiado de <strong>${resultado.grupo_anterior}</strong> a <strong>${resultado.grupo_nuevo}</strong> por un administrador.\n\n${detalle}\n\nA partir de ahora verás el calendario de tu nuevo grupo. Si tienes dudas, contacta con administración.`
          )
        )
      }

      await fetchUsuarios()
      setModalCambioGrupo(null)
      setNuevoGrupo('')
    } finally {
      setCambiandoGrupo(false)
    }
  }

  const auditoriaFiltrada = auditoria.filter(a => {
    const matchAccion = !filtroAccion || a.accion === filtroAccion
    const matchUsuario = !filtroUsuario || (a.user_nombre?.toLowerCase().includes(filtroUsuario.toLowerCase()) || a.user_chapa?.includes(filtroUsuario))
    return matchAccion && matchUsuario
  })

  const lista = tab === 'pendientes' ? pendientes : aprobados

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f0f; font-family: 'DM Sans', sans-serif; }
        .admin-page { min-height: 100vh; background: #0f0f0f; color: #e8e0d4; padding: 2rem; }
        .admin-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #2a2420; }
        .admin-header h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; letter-spacing: 3px; color: #f5c518; }
        .admin-header p { color: #6a6058; font-size: 0.8rem; margin-top: 0.2rem; }
        .badge-count { background: #e05050; color: #fff; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; padding: 0.2rem 0.6rem; border-radius: 2px; }
        .tabs { display: flex; margin-bottom: 1.5rem; border-bottom: 1px solid #2a2420; }
        .tab-btn { background: none; border: none; padding: 0.75rem 1.5rem; font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; cursor: pointer; color: #6a6058; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s; display: flex; align-items: center; gap: 0.5rem; }
        .tab-btn.active { color: #f5c518; border-bottom-color: #f5c518; }
        .tab-num { background: #2a2420; color: #f5c518; font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 2px; }
        .tab-num.rojo { background: #e05050; color: #fff; }
        table { width: 100%; border-collapse: collapse; }
        thead th { text-align: left; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #6a6058; padding: 0.75rem 1rem; border-bottom: 1px solid #2a2420; }
        tbody tr { border-bottom: 1px solid #1e1a16; transition: background 0.1s; }
        tbody tr:hover { background: #1a1612; }
        tbody td { padding: 0.75rem 1rem; font-size: 0.875rem; vertical-align: middle; }
        .chapa { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; color: #f5c518; letter-spacing: 1px; }
        .nombre strong { display: block; color: #e8e0d4; }
        .grupo-pill { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 2px; font-weight: 500; }
        .grupo-dot { width: 6px; height: 6px; border-radius: 50%; }
        .fecha { color: #6a6058; font-size: 0.8rem; }
        .admin-pill { background: #1a2a4a; color: #60a5fa; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 2px; }
        .acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .btn-aprobar { background: #f5c518; color: #0f0f0f; border: none; padding: 0.4rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.85rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-aprobar:hover:not(:disabled) { background: #ffd740; }
        .btn-desactivar { background: transparent; color: #e05050; border: 1px solid #5a2020; padding: 0.4rem 0.9rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.85rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-eliminar { background: #e05050; color: #fff; border: none; padding: 0.4rem 0.9rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.85rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-eliminar:hover:not(:disabled) { background: #c03030; }
        .btn-admin { background: transparent; color: #6a6058; border: 1px solid #2a2420; padding: 0.4rem 0.9rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.75rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-grupo { background: transparent; color: #60a5fa; border: 1px solid #1a3a5a; padding: 0.4rem 0.9rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.75rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-grupo:hover:not(:disabled) { background: #1a3a5a; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        .empty { text-align: center; padding: 4rem 2rem; color: #4a4038; }
        .empty .icono { font-size: 3rem; margin-bottom: 1rem; display: block; }
        .cargando { text-align: center; padding: 4rem; color: #6a6058; font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 2px; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
        .modal-confirmar { background: #1a1612; border: 1px solid #2a2420; border-left: 3px solid #e05050; padding: 2rem; width: 100%; max-width: 420px; border-radius: 4px; }
        .modal-confirmar h3 { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 2px; color: #e05050; margin-bottom: 0.75rem; }
        .modal-confirmar p { font-size: 0.85rem; color: #c8c0b4; line-height: 1.6; margin-bottom: 1.5rem; }
        .modal-confirmar strong { color: #f5c518; }
        .modal-grupo { background: #1a1612; border: 1px solid #2a2420; border-left: 3px solid #60a5fa; padding: 2rem; width: 100%; max-width: 420px; border-radius: 4px; }
        .modal-grupo h3 { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 2px; color: #60a5fa; margin-bottom: 0.75rem; }
        .modal-grupo strong { color: #f5c518; }
        .modal-btns { display: flex; gap: 0.75rem; }
        .filtros { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .filtros input, .filtros select { background: #1a1612; border: 1px solid #2a2420; color: #e8e0d4; padding: 0.5rem 0.75rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; border-radius: 2px; outline: none; }
        .filtros input:focus, .filtros select:focus { border-color: #f5c518; }
        .filtros select option { background: #1a1612; }
        .accion-pill { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 2px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }
        .desc-auditoria { font-size: 0.82rem; color: #c8c0b4; }
        .btn-refresh { background: transparent; border: 1px solid #2a2420; color: #6a6058; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.85rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; }
        .btn-refresh:hover { color: #f5c518; border-color: #f5c518; }
        .aviso-cambio { font-size: 0.8rem; color: #e05050; margin-bottom: 1rem; padding: 0.5rem 0.75rem; background: #2a1010; border-radius: 3px; line-height: 1.5; }
        .select-grupo { background: #1a1612; border: 1px solid #2a2420; color: #e8e0d4; padding: 0.6rem 0.8rem; border-radius: 2px; width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; }
        .select-grupo:focus { border-color: #60a5fa; }
        .select-grupo option { background: #1a1612; }
        .field-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #6a6058; display: block; margin-bottom: 0.4rem; }
      `}</style>

      <div className="admin-page">
        <div className="admin-header">
          <div>
            <h1>PANEL DE ADMINISTRACIÓN</h1>
            <p>Gestión de usuarios y registro de actividad</p>
          </div>
          {pendientes.length > 0 && (
            <span className="badge-count">{pendientes.length} PENDIENTE{pendientes.length > 1 ? 'S' : ''}</span>
          )}
        </div>

        <div className="tabs">
          <button className={`tab-btn ${tab === 'pendientes' ? 'active' : ''}`} onClick={() => setTab('pendientes')}>
            PENDIENTES <span className={`tab-num ${tab === 'pendientes' && pendientes.length > 0 ? 'rojo' : ''}`}>{pendientes.length}</span>
          </button>
          <button className={`tab-btn ${tab === 'aprobados' ? 'active' : ''}`} onClick={() => setTab('aprobados')}>
            APROBADOS <span className="tab-num">{aprobados.length}</span>
          </button>
          <button className={`tab-btn ${tab === 'auditoria' ? 'active' : ''}`} onClick={() => setTab('auditoria')}>
            AUDITORÍA
          </button>
        </div>

        {tab === 'auditoria' ? (
          <>
            <div className="filtros">
              <input
                type="text"
                placeholder="Buscar por nombre o chapa..."
                value={filtroUsuario}
                onChange={e => setFiltroUsuario(e.target.value)}
                style={{ minWidth: '220px' }}
              />
              <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}>
                <option value="">Todas las acciones</option>
                {Object.entries(ACCION_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button className="btn-refresh" onClick={fetchAuditoria}>↻ ACTUALIZAR</button>
            </div>
            {loadingAuditoria ? (
              <div className="cargando">CARGANDO...</div>
            ) : auditoriaFiltrada.length === 0 ? (
              <div className="empty">
                <span className="icono">📋</span>
                <p>No hay registros de actividad</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Chapa</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoriaFiltrada.map(a => {
                    const color = ACCION_COLOR[a.accion] || '#6a6058'
                    const label = ACCION_LABEL[a.accion] || a.accion
                    const fecha = new Date(a.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    return (
                      <tr key={a.id}>
                        <td className="fecha">{fecha}</td>
                        <td className="chapa" style={{ fontSize: '0.9rem' }}>{a.user_chapa || '—'}</td>
                        <td style={{ fontSize: '0.85rem', color: '#e8e0d4' }}>{a.user_nombre || '—'}</td>
                        <td>
                          <span className="accion-pill" style={{ background: `${color}22`, color }}>
                            {label}
                          </span>
                        </td>
                        <td className="desc-auditoria">{a.descripcion}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        ) : loading ? (
          <div className="cargando">CARGANDO...</div>
        ) : lista.length === 0 ? (
          <div className="empty">
            <span className="icono">{tab === 'pendientes' ? '✅' : '👥'}</span>
            <p>{tab === 'pendientes' ? 'No hay solicitudes pendientes' : 'No hay usuarios aprobados aún'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Chapa</th>
                <th>Nombre</th>
                <th>Grupo</th>
                <th>{tab === 'pendientes' ? 'Fecha solicitud' : 'Aprobado'}</th>
                {tab === 'aprobados' && <th>Admin</th>}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(u => {
                const color = GRUPO_COLOR[u.grupo] || '#6a6058'
                const fecha = new Date(tab === 'pendientes' ? u.created_at : (u.aprobado_at || u.created_at)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                return (
                  <tr key={u.id}>
                    <td className="chapa">{u.chapa}</td>
                    <td className="nombre"><strong>{u.nombre} {u.apellidos}</strong></td>
                    <td>
                      <span className="grupo-pill" style={{ background: `${color}18`, color }}>
                        <span className="grupo-dot" style={{ background: color }} />
                        {u.grupo}
                      </span>
                    </td>
                    <td className="fecha">{fecha}</td>
                    {tab === 'aprobados' && <td>{u.is_admin ? <span className="admin-pill">ADMIN</span> : '—'}</td>}
                    <td>
                      <div className="acciones">
                        {tab === 'pendientes' && (
                          <button className="btn-aprobar" disabled={accionando === u.id} onClick={() => aprobar(u.id)}>
                            {accionando === u.id ? '...' : 'APROBAR'}
                          </button>
                        )}
                        {tab === 'aprobados' && (
                          <>
                            <button className="btn-desactivar" disabled={accionando === u.id} onClick={() => desactivar(u.id)}>
                              {accionando === u.id ? '...' : 'DESACTIVAR'}
                            </button>
                            <button className="btn-grupo" disabled={accionando === u.id} onClick={() => { setModalCambioGrupo(u); setNuevoGrupo(u.grupo) }}>
                              CAMBIAR GRUPO
                            </button>
                          </>
                        )}
                        <button className="btn-admin" disabled={accionando === u.id} onClick={() => hacerAdmin(u.id, u.is_admin)}>
                          {u.is_admin ? 'QUITAR ADMIN' : 'HACER ADMIN'}
                        </button>
                        <button className="btn-eliminar" disabled={accionando === u.id} onClick={() => setConfirmarEliminar(u)}>
                          ELIMINAR
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: Confirmar eliminar */}
      {confirmarEliminar && (
        <div className="overlay" onClick={() => setConfirmarEliminar(null)}>
          <div className="modal-confirmar" onClick={e => e.stopPropagation()}>
            <h3>⚠️ ELIMINAR USUARIO</h3>
            <p>
              Vas a eliminar a <strong>{confirmarEliminar.nombre} {confirmarEliminar.apellidos}</strong> (chapa <strong>{confirmarEliminar.chapa}</strong>).<br /><br />
              Se borrarán todas sus solicitudes, días ofrecidos, lista de espera y notificaciones. Esta acción no se puede deshacer.
            </p>
            <div className="modal-btns">
              <button className="btn-eliminar" disabled={accionando === confirmarEliminar.id} onClick={() => eliminarUsuario(confirmarEliminar)}>
                {accionando === confirmarEliminar.id ? 'ELIMINANDO...' : 'SÍ, ELIMINAR'}
              </button>
              <button className="btn-admin" onClick={() => setConfirmarEliminar(null)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar grupo */}
      {modalCambioGrupo && (
        <div className="overlay" onClick={() => { setModalCambioGrupo(null); setNuevoGrupo('') }}>
          <div className="modal-grupo" onClick={e => e.stopPropagation()}>
            <h3>📋 CAMBIAR GRUPO</h3>
            <p style={{ fontSize: '0.85rem', color: '#c8c0b4', lineHeight: 1.6, marginBottom: '1rem' }}>
              Usuario: <strong>{modalCambioGrupo.nombre} {modalCambioGrupo.apellidos}</strong> (chapa <strong>{modalCambioGrupo.chapa}</strong>)<br />
              Grupo actual: <strong style={{ color: '#f5c518' }}>{modalCambioGrupo.grupo}</strong>
            </p>
            <div className="aviso-cambio">
              ⚠️ Sus solicitudes abiertas, entradas en lista de espera y días sueltos disponibles serán cancelados automáticamente. Se le notificará por email.
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="field-label">Nuevo grupo</label>
              <select
                className="select-grupo"
                value={nuevoGrupo}
                onChange={e => setNuevoGrupo(e.target.value)}
              >
                {GRUPOS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="modal-btns">
              <button
                className="btn-aprobar"
                disabled={cambiandoGrupo || nuevoGrupo === modalCambioGrupo.grupo}
                onClick={cambiarGrupo}
              >
                {cambiandoGrupo ? 'CAMBIANDO...' : 'CONFIRMAR CAMBIO'}
              </button>
              <button className="btn-admin" onClick={() => { setModalCambioGrupo(null); setNuevoGrupo('') }}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}