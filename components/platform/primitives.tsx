import Link from 'next/link'
import { ArrowRight, Lock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14', className)}>{children}</section>
}

export const PageContainer = PageShell

export function SectionHeader({
  eyebrow,
  title,
  copy,
  actions,
}: {
  eyebrow?: string
  title: string
  copy?: string
  actions?: React.ReactNode
}) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div className="max-w-3xl">{eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{eyebrow}</p> : null}<h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">{title}</h2>{copy ? <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{copy}</p> : null}</div>{actions}</div>
}

export const SectionHeading = SectionHeader

export function SurfaceCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-[1.75rem] border border-border/80 bg-card shadow-[0_18px_50px_-36px_rgba(17,28,38,.28)]', className)}>{children}</div>
}

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'info' | 'pro' }) {
  const toneClass = tone === 'good'
    ? 'border-emerald-300/80 bg-emerald-100 text-emerald-800'
    : tone === 'warn'
      ? 'border-amber-300/80 bg-amber-100 text-amber-900'
      : tone === 'info'
        ? 'border-sky-300/80 bg-sky-100 text-sky-800'
        : tone === 'pro'
          ? 'border-indigo-300/80 bg-indigo-100 text-indigo-800'
          : 'border-border bg-muted/70 text-foreground'

  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold', toneClass)}>{tone === 'pro' ? <Sparkles className="size-3.5" /> : null}{label}</span>
}

export function StatCard({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <SurfaceCard className={cn('p-5', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </SurfaceCard>
  )
}

export function ProgressCard({ label, value, percent, hint, accent = 'bg-primary' }: { label: string; value: string; percent: number; hint?: string; accent?: string }) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{value}</p>
        </div>
        <p className="text-sm font-semibold text-primary">{percent}%</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary/80">
        <div className={cn('h-full rounded-full transition-all duration-500', accent)} style={{ width: `${percent}%` }} />
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </SurfaceCard>
  )
}

export function ProBadge() {
  return <StatusBadge label="Pro" tone="pro" />
}

export function ModeCard({
  title,
  description,
  href,
  icon,
  accent = 'neutral',
  meta,
  playable = true,
  className,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  accent?: 'neutral' | 'scout' | 'referee' | 'duels' | 'daily' | 'higher' | 'career' | 'mystery'
  meta?: string[]
  playable?: boolean
  className?: string
}) {
  const accentClass = accent === 'scout'
    ? 'from-emerald-100 to-cyan-50 text-emerald-800'
    : accent === 'referee'
      ? 'from-amber-100 to-rose-50 text-amber-800'
      : accent === 'duels'
        ? 'from-sky-100 to-indigo-50 text-sky-800'
        : accent === 'daily'
          ? 'from-amber-100 to-orange-50 text-orange-800'
          : accent === 'higher'
            ? 'from-rose-100 to-orange-50 text-rose-700'
            : accent === 'career'
              ? 'from-sky-100 to-cyan-50 text-sky-800'
              : accent === 'mystery'
                ? 'from-violet-100 to-sky-50 text-violet-800'
                : 'from-secondary to-background text-foreground'

  const content = (
    <div className={cn('group relative overflow-hidden rounded-[1.6rem] border border-border/80 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_50px_-34px_rgba(17,28,38,.32)]', !playable && 'opacity-85', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className={cn('flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-gradient-to-br', accentClass)}>{icon}</div>
        <StatusBadge label={playable ? 'Playable now' : 'Unavailable'} tone={playable ? 'good' : 'neutral'} />
      </div>
      <h3 className="mt-4 text-2xl font-black tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {meta?.length ? <div className="mt-4 flex flex-wrap gap-2">{meta.map((item) => <span key={item} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">{item}</span>)}</div> : null}
      <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open mode <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></p>
    </div>
  )

  return playable ? <Link href={href}>{content}</Link> : content
}

export function LockedPanel({
  title,
  copy,
  ctaHref,
  ctaLabel = 'Explore Pro',
  preview,
}: {
  title: string
  copy: string
  ctaHref?: string
  ctaLabel?: string
  preview?: React.ReactNode
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-border bg-[linear-gradient(135deg,rgba(84,123,255,.12),rgba(56,206,163,.08))] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Premium Experience</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
            <Lock className="size-3" />
            Pro required
          </span>
        </div>
        <h3 className="mt-2 text-2xl font-black tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
      </div>
      {preview ? <div className="p-5">{preview}</div> : null}
      {ctaHref ? (
        <div className="border-t border-border p-5 pt-0">
          <Link href={ctaHref} className="inline-flex rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100">
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </SurfaceCard>
  )
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <SurfaceCard className="p-8 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </SurfaceCard>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>
}

export function CallToAction({
  title,
  copy,
  primary,
  secondary,
}: {
  title: string
  copy: string
  primary: React.ReactNode
  secondary?: React.ReactNode
}) {
  return (
    <SurfaceCard className="overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Call to action</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{copy}</p>
        </div>
        <div className="flex flex-wrap gap-3">{primary}{secondary}</div>
      </div>
    </SurfaceCard>
  )
}
