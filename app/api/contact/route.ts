import { NextResponse } from 'next/server'
import { claimSharedRateLimit } from '@/lib/server/shared-rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]!)
}

function clientAddress(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim()
  const toEmail = process.env.CONTACT_TO_EMAIL?.trim()
  if (!apiKey || !fromEmail || !toEmail) {
    console.error('Contact email is missing required Production configuration.')
    return NextResponse.json({ error: 'Messages are not available yet. Please try again shortly.' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const name = clean(body.name, 80)
  const email = clean(body.email, 160).toLowerCase()
  const topic = clean(body.topic, 40) || 'General question'
  const subject = clean(body.subject, 120)
  const message = clean(body.message, 4_000)
  const website = clean(body.website, 200)

  if (website) return NextResponse.json({ ok: true })
  if (name.length < 2 || !EMAIL_PATTERN.test(email) || subject.length < 3 || message.length < 10) {
    return NextResponse.json({ error: 'Please complete your name, email, subject and message.' }, { status: 400 })
  }

  try {
    const rateLimit = await claimSharedRateLimit({
      scope: 'contact', subject: clientAddress(request), limit: 5, windowSeconds: 60 * 60,
    })
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many messages from this connection. Please try again later.' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((Date.parse(rateLimit.reset_at) - Date.now()) / 1000))) },
      })
    }
  } catch (error) {
    console.error('Contact rate limiter failed closed', error)
    return NextResponse.json({ error: 'Messages are briefly unavailable. Please try again shortly.' }, { status: 503 })
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: email,
      subject: `[Early Shout · ${topic}] ${subject}`,
      text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
      html: `<h2>${escapeHtml(subject)}</h2><p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p><strong>Topic:</strong> ${escapeHtml(topic)}</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error('Contact email failed', { status: response.status, detail: detail.slice(0, 400) })
    return NextResponse.json({ error: 'Your message could not be sent. Please try again.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
