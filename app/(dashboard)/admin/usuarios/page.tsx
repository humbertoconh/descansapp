'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const GRUPO_COLOR: Record<string, string> = {
  'Capataces': '#3b82f6',
  'Clasificadores': '#10b981',
  'G-A': '#f59e0b',
  'G-B': '#f59e0b',
  'G-C': '#f59e0b',
  'G-D': '#f59e0b',
  'G-DA': '#f59e0b',
  'G-DB': '#f59e0b',
  'G-E': '#f59e0b',
  'G-I': '#f59e0b',
  'SIN-F': '#f59e0b',
}

export default function AdminUsuariosPage() {
  const supabase = createClient()
  const [pendientes, setPendientes] = useState<Profile[]>([])
  const [aprobados, setAprobados] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [tab, setTab] = useState<'pendientes' | 'aprobados'>('pendientes')
  const [confirmarEliminar, setConfirmarEliminar] = useState<Profile | null>(null)

  const fetchUsuarios = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) {
      setPendientes(data.filter(p => !p.aprobado))
      setAprobados(data.filter(p => p.aprobado))
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsuarios() }, [])

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
    await supabase.from('profiles').delete().eq('id', usuario.id)
    try { await supabase.rpc('eliminar_usuario_auth', { p_user_id: usuario.id }) } catch {}
    setConfirmarEliminar(null)
    await fetchUsuarios()
    setAccionando(null)
  }

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
        tbody td { padding: 1rem; font-size: 0.875rem; vertical-align: middle; }
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
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        .empty { text-align: center; padding: 4rem 2rem; color: #4a4038; }
        .empty .icono { font-size: 3rem; margin-bottom: 1rem; display: block; }
        .cargando { text-align: center; padding: 4rem; color: #6a6058; font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 2px; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
        .modal-confirmar { background: #1a1612; border: 1px solid #2a2420; border-left: 3px solid #e05050; padding: 2rem; width: 100%; max-width: 400px; border-radius: 4px; }
        .modal-confirmar h3 { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 2px; color: #e05050; margin-bottom: 0.75rem; }
        .modal-confirmar p { font-size: 0.85rem; color: #c8c0b4; line-height: 1.6; margin-bottom: 1.5rem; }
        .modal-confirmar strong { color: #f5c518; }
        .modal-btns { display: flex; gap: 0.75rem; }
      `}</style>
      <div className="admin-page">
        <div className="admin-header">
          <div>
            <h1>GESTIÓN DE USUARIOS</h1>
            <p>Aprueba o rechaza las solicitudes de registro</p>
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
        </div>
        {loading ? (
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
                          <button className="btn-desactivar" disabled={accionando === u.id} onClick={() => desactivar(u.id)}>
                            {accionando === u.id ? '...' : 'DESACTIVAR'}
                          </button>
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
    </>
  )
}