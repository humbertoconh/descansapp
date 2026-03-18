export const enviarEmail = async (to: string, subject: string, html: string) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
    return await response.json()
  } catch (error) {
    console.error('Error enviando email:', error)
  }
}

export const templateNotificacion = (titulo: string, mensaje: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #e8e0d4; padding: 2rem; border-radius: 8px;">
    <div style="border-bottom: 2px solid #f5c518; padding-bottom: 1rem; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.5rem; color: #f5c518; margin: 0; letter-spacing: 3px;">DESCANSAPP</h1>
      <p style="color: #6a6058; font-size: 0.8rem; margin: 0.25rem 0 0;">Sistema de intercambio de descansos</p>
    </div>
    <h2 style="color: #e8e0d4; font-size: 1.2rem; margin-bottom: 1rem;">${titulo}</h2>
    <p style="color: #8a8070; line-height: 1.6; font-size: 0.95rem;">${mensaje}</p>
    <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #2a2420;">
      <p style="color: #4a4038; font-size: 0.75rem;">Este es un mensaje automático de DescansApp. No respondas a este email.</p>
    </div>
  </div>
`