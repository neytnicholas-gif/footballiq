'use client'

import { Turnstile } from '@marsidev/react-turnstile'

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ''

type TurnstileChallengeProps = {
  onTokenChange: (token: string) => void
  resetKey: number
}

export function TurnstileChallenge({ onTokenChange, resetKey }: TurnstileChallengeProps) {
  if (!TURNSTILE_SITE_KEY) return null

  return (
    <div className="rounded-xl border border-border bg-secondary/25 p-3">
      <p className="mb-3 text-sm font-medium text-foreground">Quick safety check</p>
      <Turnstile
        key={resetKey}
        siteKey={TURNSTILE_SITE_KEY}
        onSuccess={onTokenChange}
        onExpire={() => onTokenChange('')}
        onError={() => onTokenChange('')}
        options={{ theme: 'auto', size: 'flexible' }}
      />
      <p className="mt-2 text-xs text-muted-foreground">This helps keep bots away from player accounts.</p>
    </div>
  )
}
