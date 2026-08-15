import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { QuizLabGame } from '@/components/quiz-lab-game'
import { quizLabFormatById, quizLabFormats, type QuizLabFormat } from '@/lib/quiz-lab'

export function generateStaticParams() {
  return quizLabFormats.map((format) => ({ format: format.id }))
}

export default async function QuizLabPage({ params }: { params: Promise<{ format: string }> }) {
  const { format } = await params
  const meta = quizLabFormatById(format)
  if (!meta) notFound()

  return <main className="min-h-screen bg-[#07111f] text-slate-100">
    <SiteHeader />
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-300">Quiz Lab · {meta.skill}</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{meta.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{meta.description} You get the answer and a simple football lesson after every challenge.</p>
      <div className="mt-7"><QuizLabGame format={format as QuizLabFormat} /></div>
    </section>
  </main>
}
