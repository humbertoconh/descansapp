import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json()
    
    const { data, error } = await resend.emails.send({
      from: 'DescansApp <noreply@ctmvalencia.com>',
      to,
      subject,
      html,
    })

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 })
  }
}