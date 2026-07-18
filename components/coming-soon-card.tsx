'use client'

interface ComingSoonCardProps {
  title: string
  description: string
  icon?: React.ReactNode
}

export function ComingSoonCard({ title, description, icon }: ComingSoonCardProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border/50 bg-secondary/20 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <p className="mt-3 inline-block text-xs font-medium uppercase tracking-widest text-primary/60">
            Coming soon
          </p>
        </div>
        {icon && <div className="text-2xl opacity-50">{icon}</div>}
      </div>
    </div>
  )
}
