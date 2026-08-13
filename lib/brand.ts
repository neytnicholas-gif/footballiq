export const BRAND = {
  name: 'Back Your Eye',
  shortName: 'Back Your Eye',
  initials: 'B/Y',
  tagline: 'Trust what you see.',
  description:
    'Spot talent, make the call and prove how well you read the game.',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'hello@backyoureye.com',
  legalOperatorName: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME?.trim() ?? '',
  legalOperatorAddress: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS?.trim() ?? '',
  themeColor: '#07111f',
  socialImage: '/images/hero-pitch.png',
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://backyoureye.com'
  },
}
