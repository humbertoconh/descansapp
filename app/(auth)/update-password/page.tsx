'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const actualizar = async () => {
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setCargando(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setCargando(false); return }
    router.push('/calendario')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0f0f; color: #e8e0d4; font-family: 'DM Sans', sans-serif; }
        .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .card { background: #1a1612; border: 1px solid #2a2420; border-left: 3px solid #f5c518; padding: 2rem; width: 100%; max-width: 400px; border-radius: 4px; }
        .card h1 { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 3px; color: #f5c518; margin-bottom: 0.5rem; }
        .card p { font-size: 0.85rem; color: #6a6058; margin-bottom: 1.5rem; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
        .field label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; }
        .field input { background: #221e18; border: 1px solid #2e2820; color: #e8e0d4; padding: 0.7rem 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; outline: none; border-radius: 2px; }
        .field input:focus { border-color: #f5c518; }
        .btn { background: #f5c518; color: #0f0f0f; border: none; padding: 0.75rem; font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; cursor: pointer; border-radius: 2px; width: 100%; margin-top: 0.5rem; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { background: #2a1a1a; border: 1px solid #e05050; border-radius: 3px; padding: 0.75rem; color: #e05050; font-size: 0.82rem; margin-bottom: 1rem; }
      `}</style>
      <div className="page">
        <div className="card">
          <h1>NUEVA CONTRASEÑA</h1>
          <p>Introduce tu nueva contraseña.</p>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label>Nueva contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="field">
            <label>Repetir contraseña</label>
            <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && actualizar()} />
          </div>
          <button className="btn" disabled={cargando || !password || !password2} onClick={actualizar}>
            {cargando ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA'}
          </button>
        </div>
      </div>
    </>
  )
}