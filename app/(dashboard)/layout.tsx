'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { enviarEmail, templateNotificacion } from '@/lib/email'

type Notificacion = {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
  referencia_id?: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [nombre, setNombre] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [mostrarNotifs, setMostrarNotifs] = useState(false)
  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      const panel = document.getElementById('notif-panel')
      const btn = document.getElementById('notif-btn')
      if (panel && !panel.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setMostrarNotifs(false)
      }
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])
  const [miId, setMiId] = useState('')

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMiId(user.id)
    const { data: profile } = await supabase.from('profiles').select('nombre, is_admin').eq('id', user.id).single()
    if (profile) { setNombre(profile.nombre); setIsAdmin(profile.is_admin) }
    const { data: n } = await supabase.from('notificaciones').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    setNotifs(n || [])
  }

  useEffect(() => {
    cargar()
    const channel = supabase.channel('notifs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, () => cargar()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }
  const enviarEmailNotificacion = async (userId: string, titulo: string, mensaje: string) => {
    const supabase = createClient()
    const { data } = await supabase.rpc('get_user_email', { p_user_id: userId })
    if (data) {
      await enviarEmail(data, titulo, templateNotificacion(titulo, mensaje))
    }
  }
  const marcarLeida = async (n: Notificacion) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', n.id)
    setNotifs(prev => prev.map(notif => notif.id === n.id ? { ...notif, leida: true } : notif))
    setMostrarNotifs(false)
    if (n.referencia_id) {
      const { data: sol } = await supabase.from('solicitudes').select('dia_pedido').eq('id', n.referencia_id).single()
      if (sol) {
        window.location.href = `/calendario?dia=${sol.dia_pedido}`
      }
    }
  }

  const noLeidas = notifs.filter(n => !n.leida).length
  const enlaces = [
    { href: '/calendario', label: 'CALENDARIO' },
    ...(isAdmin ? [{ href: '/admin/usuarios', label: 'USUARIOS' }] : []),
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f0f; color: #e8e0d4; font-family: 'DM Sans', sans-serif; }
        .nav { background: #141210; border-bottom: 1px solid #2a2420; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 50; }
        .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 3px; color: #f5c518; text-decoration: none; }
        .nav-links { display: flex; gap: 0; }
        .nav-link { font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 2px; color: #6a6058; text-decoration: none; padding: 0 1rem; height: 56px; display: flex; align-items: center; border-bottom: 2px solid transparent; transition: color 0.15s; }
        .nav-link:hover { color: #e8e0d4; }
        .nav-link.active { color: #f5c518; border-bottom-color: #f5c518; }
        .nav-right { display: flex; align-items: center; gap: 1rem; }
        .nav-usuario { font-size: 0.8rem; color: #6a6058; }
        .nav-usuario span { color: #e8e0d4; font-weight: 500; }
        .btn-salir { background: transparent; border: 1px solid #2a2420; color: #6a6058; padding: 0.3rem 0.8rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.8rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; transition: color 0.15s, border-color 0.15s; }
        .btn-salir:hover { color: #e05050; border-color: #5a2020; }
        .notif-btn { position: relative; background: none; border: none; cursor: pointer; color: #6a6058; font-size: 1.2rem; padding: 0.25rem; transition: color 0.15s; }
        .notif-btn:hover { color: #e8e0d4; }
        .notif-badge { position: absolute; top: -2px; right: -4px; background: #e05050; color: #fff; font-size: 0.6rem; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; }
        .notif-panel { position: absolute; top: 56px; right: 1rem; width: 320px; background: #1a1612; border: 1px solid #2a2420; border-radius: 4px; z-index: 100; max-height: 400px; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
        .notif-header { padding: 0.75rem 1rem; border-bottom: 1px solid #2a2420; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; letter-spacing: 2px; color: #f5c518; }
        .notif-item { padding: 0.75rem 1rem; border-bottom: 1px solid #1e1a16; cursor: pointer; transition: background 0.1s; }
        .notif-item:hover { background: #221e18; }
        .notif-item.no-leida { border-left: 2px solid #f5c518; }
        .notif-titulo { font-size: 0.85rem; font-weight: 500; color: #e8e0d4; margin-bottom: 0.2rem; }
        .notif-mensaje { font-size: 0.78rem; color: #8a8070; line-height: 1.4; }
        .notif-fecha { font-size: 0.7rem; color: #4a4038; margin-top: 0.2rem; }
        .notif-vacia { padding: 2rem; text-align: center; color: #4a4038; font-size: 0.85rem; }
        .hamburger { display: none; background: none; border: none; color: #e8e0d4; cursor: pointer; font-size: 1.5rem; padding: 0.25rem; }
        .menu-movil { display: none; }
        @media (max-width: 640px) {
          .nav { padding: 0 1rem; justify-content: space-between; }
.notif-panel { background: #fff !important; border-color: #e0d8d0 !important; position: fixed !important; left: 1rem !important; right: 1rem !important; top: 56px !important; width: auto !important; }
.notif-item { border-bottom-color: #e0d8d0 !important; }
.notif-item.no-leida { border-left-color: #c4a520 !important; }
.notif-titulo { color: #1a1612 !important; }
.notif-mensaje { color: #4a4038 !important; }
.notif-fecha { color: #8a8070 !important; }
.notif-header { color: #1a1612 !important; border-bottom-color: #e0d8d0 !important; }
.notif-vacia { color: #8a8070 !important; }
.nav-centro { display: flex !important; position: absolute; left: 50%; transform: translateX(-50%); font-size: 0.8rem; color: #4a4038; white-space: nowrap; }
.nav-centro span { color: #c4a520; font-weight: 500; }
          .nav-links { display: none; }
          .nav-right { display: none; }
          .nav-campana-movil { display: flex !important; }
          .hamburger { display: block; }
          .menu-movil { display: flex; flex-direction: column; background: #141210; border-bottom: 1px solid #2a2420; padding: 1rem; gap: 0.5rem; }
          .menu-movil.cerrado { display: none; }
          .nav-link-movil { font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; color: #6a6058; text-decoration: none; padding: 0.75rem 1rem; border-radius: 2px; transition: background 0.15s, color 0.15s; }
          .nav-link-movil:hover { background: #1a1612; color: #e8e0d4; }
          .nav-link-movil.active { color: #f5c518; background: #1a1612; }
          .menu-usuario { font-size: 0.8rem; color: #6a6058; padding: 0.5rem 1rem; border-top: 1px solid #2a2420; margin-top: 0.25rem; }
          .btn-salir-movil { background: transparent; border: 1px solid #2a2420; color: #6a6058; padding: 0.6rem 1rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.85rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; text-align: left; }
          .notif-panel { right: 0; width: 100vw; border-radius: 0; }
          .nav { background: #f5f0eb !important; border-bottom-color: #e0d8d0 !important; }
.nav-logo { color: #c4a520 !important; }
.hamburger { color: #1a1612 !important; }
.menu-movil { background: #f5f0eb !important; border-bottom-color: #e0d8d0 !important; }
.nav-link-movil { color: #4a4038 !important; }
.nav-link-movil.active { color: #c4a520 !important; background: #ede8e0 !important; }
.btn-salir-movil { color: #4a4038 !important; border-color: #e0d8d0 !important; }
.menu-usuario { color: #4a4038 !important; border-top-color: #e0d8d0 !important; }
        }
      `}</style>

      <nav className="nav">
        <Link href="/calendario" className="nav-logo">DESCANSAPP</Link>
        <div className="nav-links">
          {enlaces.map(e => (
            <Link key={e.href} href={e.href} className={`nav-link${pathname === e.href ? ' active' : ''}`}>
              {e.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <div style={{ position: 'relative' }}>
            <button id="notif-btn" className="notif-btn" onClick={() => setMostrarNotifs(!mostrarNotifs)}>
              🔔
              {noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
            </button>
            {mostrarNotifs && (
              <div id="notif-panel" className="notif-panel">
                <div className="notif-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <span>NOTIFICACIONES</span>
  {notifs.some(n => n.tipo === 'completado' || n.tipo === 'dia_asignado' || n.tipo === 'dia_soltado' || n.tipo === 'cadena_completada' || (n.tipo === 'cadena' && n.leida) || (n.tipo === 'aceptacion' && n.leida)) && (
    <button
      style={{ background: 'none', border: '1px solid #2a2420', color: '#6a6058', cursor: 'pointer', fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '2px', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}
      onClick={async (e) => {
        e.stopPropagation()
        const supabase = createClient()
        const borrables = notifs.filter(n => n.tipo === 'completado' || n.tipo === 'dia_asignado' || n.tipo === 'dia_soltado' || n.tipo === 'cadena_completada' || (n.tipo === 'cadena' && n.leida) || (n.tipo === 'aceptacion' && n.leida))
        await supabase.from('notificaciones').delete().in('id', borrables.map(n => n.id))
        setNotifs(prev => prev.filter(n => !borrables.find(b => b.id === n.id)))
      }}
    >BORRAR LEÍDAS</button>
  )}
</div>
                {notifs.length === 0 ? (
                  <div className="notif-vacia">Sin notificaciones</div>
                ) : (
                  notifs.map(n => (
                    <div key={n.id} className={`notif-item${!n.leida ? ' no-leida' : ''}`} onClick={() => marcarLeida(n)}>
                      <div className="notif-titulo">{n.titulo}</div>
<div className="notif-mensaje">{n.mensaje}</div>
{n.tipo === 'cadena' && n.referencia_id && (
  <button
    style={{ marginTop: '0.4rem', background: '#a78bfa', color: '#0f0f0f', border: 'none', padding: '0.3rem 0.8rem', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.75rem', letterSpacing: '1px', cursor: 'pointer', borderRadius: '2px' }}
    onClick={async (e) => {
      e.stopPropagation()
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('confirmar_cadena', { p_cadena_id: n.referencia_id, p_user_id: user.id })
        await marcarLeida(n)
      }
    }}
  >
    ✓ CONFIRMAR CADENA
  </button>
)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
  <div className="notif-fecha">{new Date(n.created_at).toLocaleDateString('es-ES')}</div>
  {(n.tipo === 'completado' || n.tipo === 'dia_asignado' || n.tipo === 'dia_soltado' || n.tipo === 'cadena_completada' || 
    (n.tipo === 'cadena' && n.leida) || (n.tipo === 'aceptacion' && n.leida)) && (
    <button
      style={{ background: 'none', border: 'none', color: '#4a4038', cursor: 'pointer', fontSize: '0.75rem', padding: '0 0.25rem' }}
      onClick={async (e) => {
        e.stopPropagation()
        const supabase = createClient()
        await supabase.from('notificaciones').delete().eq('id', n.id)
        setNotifs(prev => prev.filter(notif => notif.id !== n.id))
      }}
    >✕</button>
  )}
</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="nav-usuario">Hola, <span>{nombre}</span></div>
          <button className="btn-salir" onClick={cerrarSesion}>SALIR</button>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>
  <button id="notif-btn" className="notif-btn" onClick={() => setMostrarNotifs(!mostrarNotifs)} style={{ color: '#1a1612', fontSize: '1.3rem' }}>
    🔔
    {noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
  </button>
  {mostrarNotifs && (
    <div id="notif-panel" className="notif-panel" style={{ right: 0 }}>
      <div className="notif-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>NOTIFICACIONES</span>
                {notifs.some(n => n.tipo === 'completado' || n.tipo === 'dia_asignado' || n.tipo === 'dia_soltado' || n.tipo === 'cadena_completada' || (n.tipo === 'cadena' && n.leida) || (n.tipo === 'aceptacion' && n.leida)) && (
                  <button style={{ background: 'none', border: '1px solid #2a2420', color: '#6a6058', cursor: 'pointer', fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '2px', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '1px' }}
                    onClick={async (e) => {
                      e.stopPropagation()
                      const supabase = createClient()
                      const borrables = notifs.filter(n => n.tipo === 'completado' || n.tipo === 'dia_asignado' || n.tipo === 'dia_soltado' || n.tipo === 'cadena_completada' || (n.tipo === 'cadena' && n.leida) || (n.tipo === 'aceptacion' && n.leida))
                      await supabase.from('notificaciones').delete().in('id', borrables.map(n => n.id))
                      setNotifs(prev => prev.filter(n => !borrables.find(b => b.id === n.id)))
                    }}>BORRAR LEÍDAS</button>
                )}
              </div>
              {notifs.length === 0 ? (
                <div className="notif-vacia">Sin notificaciones</div>
              ) : (
                notifs.map(n => (
                  <div key={n.id} className={`notif-item${!n.leida ? ' no-leida' : ''}`} onClick={() => marcarLeida(n)}>
                    <div className="notif-titulo">{n.titulo}</div>
                    <div className="notif-mensaje">{n.mensaje}</div>
                    {n.tipo === 'cadena' && n.referencia_id && (
                      <button style={{ marginTop: '0.4rem', background: '#a78bfa', color: '#0f0f0f', border: 'none', padding: '0.3rem 0.8rem', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.75rem', letterSpacing: '1px', cursor: 'pointer', borderRadius: '2px' }}
                        onClick={async (e) => {
                          e.stopPropagation()
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (user) {
                            await supabase.rpc('confirmar_cadena', { p_cadena_id: n.referencia_id, p_user_id: user.id })
                            await marcarLeida(n)
                          }
                        }}>
                        ✓ CONFIRMAR CADENA
                      </button>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                      <div className="notif-fecha">{new Date(n.created_at).toLocaleDateString('es-ES')}</div>
                      {(n.tipo === 'completado' || n.tipo === 'dia_asignado' || n.tipo === 'dia_soltado' || n.tipo === 'cadena_completada' || (n.tipo === 'cadena' && n.leida) || (n.tipo === 'aceptacion' && n.leida)) && (
                        <button style={{ background: 'none', border: 'none', color: '#4a4038', cursor: 'pointer', fontSize: '0.75rem', padding: '0 0.25rem' }}
                          onClick={async (e) => {
                            e.stopPropagation()
                            const supabase = createClient()
                            await supabase.from('notificaciones').delete().eq('id', n.id)
                            setNotifs(prev => prev.filter(notif => notif.id !== n.id))
                          }}>✕</button>
                      )}
                    </div>
                  </div>
                ))
              )}
    </div>
  )}
</div>
<div className="nav-centro" style={{ pointerEvents: 'none' }}>Hola, <span>{nombre}</span></div>
<button className="hamburger" onClick={() => setMenuAbierto(!menuAbierto)}>
          {menuAbierto ? '✕' : '☰'}
        </button>
      </nav>

      <div className={`menu-movil${menuAbierto ? '' : ' cerrado'}`}>
        {enlaces.map(e => (
          <Link key={e.href} href={e.href}
            className={`nav-link-movil${pathname === e.href ? ' active' : ''}`}
            onClick={() => setMenuAbierto(false)}>
            {e.label}
          </Link>
        ))}
        <div className="menu-usuario">Hola, <strong>{nombre}</strong></div>
        <button className="btn-salir-movil" onClick={cerrarSesion}>CERRAR SESIÓN</button>
      </div>

      <main>{children}</main>
    </>
  )
}