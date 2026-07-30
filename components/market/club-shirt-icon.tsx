type ClubShirtIconProps = {
  primaryColour: string
  secondaryColour: string
  label: string
}

export function ClubShirtIcon({ primaryColour, secondaryColour, label }: ClubShirtIconProps) {
  return (
    <div
      role="img"
      aria-label={`${label} abstract shirt icon`}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70"
      style={{
        background: `linear-gradient(145deg, ${primaryColour}, ${secondaryColour})`,
      }}
    >
      <div className="pointer-events-none absolute inset-[6px] rounded-md border border-white/30" />
      <div className="pointer-events-none absolute -top-[1px] left-1/2 h-2 w-4 -translate-x-1/2 rounded-b-sm bg-black/25" />
      <div className="pointer-events-none absolute bottom-1 right-1 size-1.5 rounded-full bg-white/65" />
    </div>
  )
}
