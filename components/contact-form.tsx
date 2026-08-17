'use client'

import { FormEvent, useState } from 'react'
import { CheckCircle2, LoaderCircle, Send } from 'lucide-react'

const topics = ['General question', 'Beta feedback', 'Technical problem', 'Content or safety', 'Privacy request']

export function ContactForm({ initialTopic = 'General question', initialSubject = '', initialMessage = '' }: { initialTopic?: string; initialSubject?: string; initialMessage?: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setError('')
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form).entries())
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const result = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) {
      setError(result.error || 'Your message could not be sent. Please try again.')
      setStatus('error')
      return
    }
    form.reset()
    setStatus('sent')
  }

  if (status === 'sent') return (
    <section className="flex min-h-[28rem] flex-col items-center justify-center rounded-[2rem] border border-emerald-300/25 bg-emerald-300/[.08] p-8 text-center shadow-2xl shadow-black/20">
      <CheckCircle2 className="size-14 text-emerald-300" />
      <h2 className="mt-5 text-3xl font-black">Message sent</h2>
      <p className="mt-3 max-w-md text-slate-300">Thank you. Your message has reached Early Shout and we’ll reply to the email you entered.</p>
      <button onClick={() => setStatus('idle')} className="mt-7 min-h-11 rounded-xl border border-white/15 px-5 font-bold hover:bg-white/10">Send another message</button>
    </section>
  )

  return (
    <form onSubmit={submit} className="rounded-[2rem] border border-white/10 bg-[#0d2230]/95 p-6 shadow-2xl shadow-black/20 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name"><input name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" /></Field>
        <Field label="Your email"><input name="email" required type="email" maxLength={160} autoComplete="email" className="field" /></Field>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="What is this about?"><select name="topic" defaultValue={initialTopic} className="field">{topics.map((topic) => <option key={topic}>{topic}</option>)}</select></Field>
        <Field label="Subject"><input name="subject" required minLength={3} maxLength={120} defaultValue={initialSubject} className="field" /></Field>
      </div>
      <div className="mt-5"><Field label="Your message"><textarea name="message" required minLength={10} maxLength={4000} rows={8} defaultValue={initialMessage} className="field resize-y" placeholder="Tell us what happened or what you would like to know…" /></Field></div>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {status === 'error' ? <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
      <button disabled={status === 'sending'} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70">
        {status === 'sending' ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      <p className="mt-4 text-center text-xs text-slate-400">Your email is used only to reply to this message.</p>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-slate-100"><span className="mb-2 block">{label}</span>{children}</label>
}
