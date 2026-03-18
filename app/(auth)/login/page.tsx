'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (authError || !data.user) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('aprobado')
      .eq('id', data.user.id)
      .single()

    if (!profile?.aprobado) {
      await supabase.auth.signOut()
      setError('Tu cuenta aún no ha sido aprobada por el administrador.')
      setLoading(false)
      return
    }

    router.push('/calendario')
    router.refresh()
  }

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
        .panel-logo p { margin-top: 1rem; color: #8a8070; font-size: 0.95rem; max-width: 280px; line-height: 1.6; }
        .panel-der { background: #141210; display: flex; align-items: center; justify-content: center; padding: 3rem 4rem; }
        .form-wrapper { width: 100%; max-width: 380px; }
        .form-header { margin-bottom: 2.5rem; }
        .form-header h2 { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; letter-spacing: 2px; color: #e8e0d4; }
        .form-header p { margin-top: 0.4rem; color: #6a6058; font-size: 0.875rem; }
        .form-grid { display: grid; gap: 1rem; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; }
        .field label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; font-weight: 500; }
        .field input { background: #1e1a16; border: 1px solid #2e2820; color: #e8e0d4; padding: 0.75rem 0.9rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; transition: border-color 0.15s; border-radius: 2px; }
        .field input:focus { border-color: #f5c518; background: #221e18; }
        .field input::placeholder { color: #4a4038; }
        .error-box { background: #2a1210; border: 1px solid #5a2020; border-left: 3px solid #e05050; padding: 0.75rem 1rem; font-size: 0.85rem; color: #e08080; border-radius: 2px; }
        .btn-submit { width: 100%; background: #f5c518; color: #0f0f0f; border: none; padding: 0.9rem; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; cursor: pointer; transition: background 0.15s; border-radius: 2px; margin-top: 0.5rem; }
        .btn-submit:hover:not(:disabled) { background: #ffd740; }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .registro-link { text-align: center; margin-top: 1.5rem; font-size: 0.82rem; color: #6a6058; }
        .registro-link a { color: #f5c518; text-decoration: none; font-weight: 500; }
        @media (max-width: 768px) { .page { grid-template-columns: 1fr; } .panel-izq { display: none; } .panel-der { padding: 2rem 1.5rem; } }
      `}</style>
      <div className="page">
        <div className="panel-izq">
          <div className="panel-logo">
            <h1>DESCANS<br />APP</h1>
            <p>Gestiona e intercambia tus días de descanso con tus compañeros de grupo.</p>
          </div>
        </div>
        <div className="panel-der">
          <div className="form-wrapper">
            <div className="form-header">
              <h2>INICIAR SESIÓN</h2>
              <p>Accede con tu correo y contraseña</p>
            </div>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="field">
                <label>Correo electrónico</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="carlos@empresa.com" required autoComplete="email" />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" required autoComplete="current-password" />
              </div>
              {error && <div className="error-box">{error}</div>}
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'COMPROBANDO...' : 'ENTRAR'}
              </button>
            </form>
            <div className="registro-link">
              <Link href="/reset-password" style={{ display:'block', marginBottom:'0.5rem' }}>¿Olvidaste tu contraseña?</Link>
              ¿No tienes cuenta? <Link href="/registro">Solicitar acceso</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
