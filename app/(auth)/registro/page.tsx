'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getGrupoFromChapa, validarChapa } from '@/lib/types'

type Step = 'form' | 'pendiente'

const GRUPOS_MANIPULADORES = ['G-A', 'G-B', 'G-C', 'G-D', 'G-DA', 'G-DB', 'G-E', 'G-I', 'SIN-F']

export default function RegistroPage() {
  const supabase = createClient()
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: '', apellidos: '', chapa: '', email: '', telefono: '', password: '', confirmar: '',
  })
  const [grupoManipulador, setGrupoManipulador] = useState('')
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)

  const esManipulador = form.chapa.length === 5 && (form.chapa.startsWith('71') || form.chapa.startsWith('72'))

  const grupoPreview = form.chapa.length === 5 && validarChapa(form.chapa)
    ? (esManipulador ? (grupoManipulador || null) : getGrupoFromChapa(form.chapa))
    : null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (e.target.name === 'chapa') setGrupoManipulador('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validarTelefono = (tel: string) => /^[67]\d{8}$/.test(tel)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validarChapa(form.chapa)) {
      setError('La chapa debe tener 5 dígitos y empezar por 24, 63, 71 o 72.')
      return
    }
    if (esManipulador && !grupoManipulador) {
      setError('Debes seleccionar tu grupo.')
      return
    }
    if (!validarTelefono(form.telefono)) {
      setError('El teléfono debe ser un móvil español válido (6XX o 7XX, 9 dígitos).')
      return
    }
    if (!aceptaPrivacidad) { setError('Debes aceptar la política de privacidad para registrarte.'); return }
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden.'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email, password: form.password,
    })
    if (authError || !authData.user) {
      setError(authError?.message || 'Error al crear la cuenta.')
      setLoading(false); return
    }
    const grupo = esManipulador ? grupoManipulador : getGrupoFromChapa(form.chapa)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id, chapa: form.chapa,
      nombre: form.nombre.trim(), apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(), aprobado: false, grupo,
    })
    if (profileError) {
      if (profileError.code === '23505') setError('Esa chapa ya está registrada.')
      else setError(profileError.message)
      await supabase.auth.signOut()
      setLoading(false); return
    }
    await supabase.auth.signOut()
    setStep('pendiente')
    setLoading(false)
  }

  if (step === 'pendiente') return <PantallaPendiente nombre={form.nombre} />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f0f; color: #e8e0d4; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        .page { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
        .panel-izq { background: #1a1612; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; padding: 3rem; }
        .panel-izq::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,200,50,0.06) 39px, rgba(255,200,50,0.06) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,200,50,0.06) 39px, rgba(255,200,50,0.06) 40px); }
        .panel-logo { position: relative; z-index: 1; }
        .panel-logo h1 { font-family: 'Bebas Neue', sans-serif; font-size: 5rem; line-height: 0.9; color: #f5c518; letter-spacing: 2px; }
        .panel-logo p { margin-top: 1rem; color: #e8e0d4; font-size: 0.95rem; max-width: 280px; line-height: 1.6; }
        .grupos-list { margin-top: 2.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .grupo-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: #c8c0b4; }
        .grupo-badge { background: #2a2420; border: 1px solid #3a3028; padding: 0.15rem 0.5rem; font-size: 0.75rem; color: #f5c518; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }
        .panel-der { background: #141210; display: flex; align-items: center; justify-content: center; padding: 3rem 4rem; }
        .form-wrapper { width: 100%; max-width: 420px; }
        .form-header { margin-bottom: 2.5rem; }
        .form-header h2 { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; letter-spacing: 2px; color: #e8e0d4; }
        .form-header p { margin-top: 0.4rem; color: #c8c0b4; font-size: 0.875rem; }
        .form-grid { display: grid; gap: 1rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; }
        .field label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #e8e0d4; font-weight: 500; }
        .field input { background: #1e1a16; border: 1px solid #2e2820; color: #e8e0d4; padding: 0.75rem 0.9rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; transition: border-color 0.15s; border-radius: 2px; }
        .field input:focus { border-color: #f5c518; background: #221e18; }
        .field input::placeholder { color: #a8a098; }
        .field .hint { font-size: 0.7rem; color: #a8a098; margin-top: 0.2rem; }
        .grupo-preview { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.35rem; font-size: 0.75rem; }
        .grupo-preview .dot { width: 6px; height: 6px; border-radius: 50%; background: #f5c518; animation: pulse 1.5s infinite; }
        .grupo-preview span { color: #f5c518; font-weight: 500; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .grupo-selector { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin-top: 0.25rem; }
        .grupo-btn { background: #1e1a16; border: 1px solid #2e2820; color: #a8a098; padding: 0.5rem 0.25rem; font-family: 'Bebas Neue', sans-serif; font-size: 0.85rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; text-align: center; transition: all 0.15s; }
        .grupo-btn:hover { border-color: #f5c518; color: #f5c518; }
        .grupo-btn.selected { background: #2a2010; border-color: #f5c518; color: #f5c518; }
        .grupo-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #e8e0d4; font-weight: 500; margin-bottom: 0.35rem; }
        .error-box { background: #2a1210; border: 1px solid #5a2020; border-left: 3px solid #e05050; padding: 0.75rem 1rem; font-size: 0.85rem; color: #e08080; border-radius: 2px; }
        .btn-submit { width: 100%; background: #f5c518; color: #0f0f0f; border: none; padding: 0.9rem; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; cursor: pointer; transition: background 0.15s; border-radius: 2px; margin-top: 0.5rem; }
        .btn-submit:hover:not(:disabled) { background: #ffd740; }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .divider { display: flex; align-items: center; gap: 0.75rem; color: #3a3028; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #2a2420; }
        .login-link { text-align: center; margin-top: 1.5rem; font-size: 0.82rem; color: #c8c0b4; }
        .login-link a { color: #f5c518; text-decoration: none; font-weight: 500; }
        .logo-movil { display: none; justify-content: center; margin-bottom: 1.5rem; }
        .logo-movil-img { width: 90px; height: 90px; object-fit: contain; border-radius: 50%; background: #fff; padding: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
        .sindicato-logo { position: absolute; top: 2.5rem; left: 50%; transform: translateX(-50%); z-index: 2; }
        .sindicato-logo-img { width: 160px; height: 160px; object-fit: contain; border-radius: 50%; background: #fff; padding: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        @media (max-width: 768px) { .page { grid-template-columns: 1fr; } .panel-izq { display: none; } .panel-der { padding: 2rem 1.5rem; } .logo-movil { display: flex; } }
      `}</style>
      <div className="page">
        <div className="panel-izq">
          <div className="sindicato-logo">
            <img src="/LOGO_SOMT_GANCHO.png" alt="Coordinadora Somt" className="sindicato-logo-img" />
          </div>
          <div className="panel-logo">
            <h1>DESCANS<br />APP</h1>
            <p>Sistema de gestión e intercambio de descansos entre compañeros.</p>
            <div className="grupos-list">
              <div className="grupo-item"><span className="grupo-badge">24XXX</span>Capataces</div>
              <div className="grupo-item"><span className="grupo-badge">63XXX</span>Clasificadores</div>
              <div className="grupo-item"><span className="grupo-badge">71/72XXX</span>G-A, G-B, G-C...</div>
            </div>
          </div>
        </div>
        <div className="panel-der">
          <div className="form-wrapper">
            <div className="logo-movil">
              <img src="/LOGO_SOMT_GANCHO.png" alt="Coordinadora Somt" className="logo-movil-img" />
            </div>
            <div className="form-header">
              <h2>CREAR CUENTA</h2>
              <p>Tu solicitud será revisada por el administrador</p>
            </div>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-row">
                <div className="field">
                  <label>Nombre</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Carlos" required />
                </div>
                <div className="field">
                  <label>Apellidos</label>
                  <input name="apellidos" value={form.apellidos} onChange={handleChange} placeholder="García López" required />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Número de Chapa</label>
                  <input name="chapa" value={form.chapa} onChange={handleChange} placeholder="24001" maxLength={5} required />
                  {grupoPreview && (
                    <div className="grupo-preview">
                      <div className="dot" />
                      <span>{grupoPreview}</span>
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Teléfono móvil</label>
                  <input name="telefono" type="tel" value={form.telefono} onChange={handleChange} placeholder="612345678" maxLength={9} required />
                  <span className="hint">Para notificaciones de intercambios</span>
                </div>
              </div>
              {esManipulador && (
                <div className="field">
                  <div className="grupo-label">Selecciona tu grupo</div>
                  <div className="grupo-selector">
                    {GRUPOS_MANIPULADORES.map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`grupo-btn${grupoManipulador === g ? ' selected' : ''}`}
                        onClick={() => setGrupoManipulador(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="divider">acceso</div>
              <div className="field">
                <label>Correo electrónico</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="carlos@empresa.com" required />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Contraseña</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" required />
                </div>
                <div className="field">
                  <label>Confirmar</label>
                  <input name="confirmar" type="password" value={form.confirmar} onChange={handleChange} placeholder="••••••••" required />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', margin: '0.75rem 0', padding: '0.75rem', background: '#f0ebe5', borderRadius: '3px', border: '1px solid #3a3028' }}>
                <input
                  type="checkbox"
                  id="privacidad"
                  checked={aceptaPrivacidad}
                  onChange={e => setAceptaPrivacidad(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: '#f5c518', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
                />
                <label htmlFor="privacidad" style={{ fontSize: '0.82rem', color: '#c8c0b4', lineHeight: 1.5, cursor: 'pointer' }}>
                  He leído y acepto la{' '}
                  <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: '#f5c518', fontWeight: 600, textDecoration: 'underline' }}>
                    Política de Privacidad
                  </a>
                  {' '}y consiento el tratamiento de mis datos personales, incluyendo el uso de mi número de teléfono para contacto entre compañeros una vez confirmado un intercambio.
                </label>
              </div>
              {error && <div className="error-box">{error}</div>}
              <button type="submit" className="btn-submit" disabled={loading || !aceptaPrivacidad}>
                {loading ? 'ENVIANDO...' : 'SOLICITAR REGISTRO'}
              </button>
            </form>
            <div className="login-link">
              ¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function PantallaPendiente({ nombre }: { nombre: string }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f0f; font-family: 'DM Sans', sans-serif; }
        .pendiente-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f0f0f; padding: 2rem; }
        .pendiente-card { max-width: 480px; width: 100%; text-align: center; }
        .icono-reloj { font-size: 4rem; margin-bottom: 1.5rem; display: block; animation: balanceo 3s ease-in-out infinite; }
        @keyframes balanceo { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        .pendiente-card h2 { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; letter-spacing: 3px; color: #e8e0d4; margin-bottom: 0.75rem; }
        .pendiente-card .nombre { color: #f5c518; }
        .pendiente-card p { color: #e8e0d4; font-size: 0.9rem; line-height: 1.7; margin-bottom: 2rem; }
        .pasos { text-align: left; background: #1a1612; border: 1px solid #2a2420; border-left: 3px solid #f5c518; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; border-radius: 2px; }
        .paso { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.85rem; color: #e8e0d4; }
        .paso-num { background: #2a2420; color: #f5c518; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 2px; }
        .btn-login { display: inline-block; background: transparent; border: 1px solid #f5c518; color: #f5c518; padding: 0.75rem 2rem; font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; text-decoration: none; transition: background 0.15s, color 0.15s; border-radius: 2px; }
        .btn-login:hover { background: #f5c518; color: #0f0f0f; }
      `}</style>
      <div className="pendiente-page">
        <div className="pendiente-card">
          <span className="icono-reloj">⏳</span>
          <h2>SOLICITUD ENVIADA, <span className="nombre">{nombre.toUpperCase()}</span></h2>
          <p>Tu cuenta está pendiente de revisión por el administrador.<br />Te avisarán cuando esté aprobada.</p>
          <div className="pasos">
            <div className="paso"><div className="paso-num">1</div><span>Tu solicitud ha quedado registrada con tus datos y chapa.</span></div>
            <div className="paso"><div className="paso-num">2</div><span>El administrador revisará tu solicitud en los próximos días.</span></div>
            <div className="paso"><div className="paso-num">3</div><span>Recibirás acceso completo cuando seas aprobado.</span></div>
          </div>
          <Link href="/login" className="btn-login">IR AL INICIO DE SESIÓN</Link>
        </div>
      </div>
    </>
  )
}