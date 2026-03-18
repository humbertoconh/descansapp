'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)

  const enviarReset = async () => {
    if (!email) return
    setCargando(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setEnviado(true)
    setCargando(false)
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
        .card p { font-size: 0.85rem; color: #6a6058; margin-bottom: 1.5rem; line-height: 1.5; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
        .field label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8a8070; }
        .field input { background: #221e18; border: 1px solid #2e2820; color: #e8e0d4; padding: 0.7rem 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; outline: none; border-radius: 2px; }
        .field input:focus { border-color: #f5c518; }
        .btn { background: #f5c518; color: #0f0f0f; border: none; padding: 0.75rem; font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; cursor: pointer; border-radius: 2px; width: 100%; margin-top: 0.5rem; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .exito { background: #1a2a1a; border: 1px solid #34d399; border-radius: 3px; padding: 1rem; color: #34d399; font-size: 0.85rem; line-height: 1.5; }
        .volver { display: block; text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #6a6058; text-decoration: none; }
        .volver:hover { color: #f5c518; }
      `}</style>
      <div className="page">
        <div className="card">
          <h1>RECUPERAR CONTRASEÑA</h1>
          <p>Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
          {enviado ? (
            <div className="exito">
              ✅ Email enviado. Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
            </div>
          ) : (
            <>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  onKeyDown={e => e.key === 'Enter' && enviarReset()}
                />
              </div>
              <button className="btn" disabled={cargando || !email} onClick={enviarReset}>
                {cargando ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
              </button>
            </>
          )}
          <Link href="/login" className="volver">← Volver al login</Link>
        </div>
      </div>
    </>
  )
}