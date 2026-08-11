import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { getSponsorForPlacement, type SponsorPlacement as Placement } from '@/lib/sponsorship'

export function SponsorPlacement({ placement }: { placement: Placement }) {
  const campaign = getSponsorForPlacement(placement)

  if (!campaign) return null

  return (
    <aside aria-label={`${campaign.label}: ${campaign.name}`} className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{campaign.label}</p>
      <a href={campaign.href} target="_blank" rel="sponsored noopener noreferrer" className="mt-2 flex min-h-12 items-center gap-3 rounded-xl outline-none transition hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-primary">
        {campaign.logoUrl ? <Image src={campaign.logoUrl} alt={`${campaign.name} logo`} width={48} height={48} className="size-12 rounded-lg object-contain" /> : null}
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-foreground">{campaign.name}</span>
          <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">{campaign.message}</span>
        </span>
        <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </a>
    </aside>
  )
}
