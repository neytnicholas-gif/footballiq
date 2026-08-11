export type SponsorPlacement = 'home' | 'quizzes' | 'daily' | 'market-summary'

export type SponsorCampaign = {
  name: string
  label: 'Advertisement' | 'Sponsored by'
  message: string
  href: string
  logoUrl?: string
  placements: SponsorPlacement[]
}

// Keep this empty until a signed campaign has approved copy and artwork.
// Sponsor messages are contextual only: no behavioural targeting or tracking pixels.
export const ACTIVE_SPONSOR_CAMPAIGNS: SponsorCampaign[] = []

export function getSponsorForPlacement(placement: SponsorPlacement) {
  return ACTIVE_SPONSOR_CAMPAIGNS.find((campaign) => campaign.placements.includes(placement)) ?? null
}
