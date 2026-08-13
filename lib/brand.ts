export const BRAND = {
  name: 'Early Shout',
  shortName: 'Early Shout',
  initials: 'ES',
  tagline: 'See it early. Make the call.',
  description:
    'Spot talent early, make the call and prove how well you read football.',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'hello@earlyshout.com',
  legalOperatorName: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME?.trim() ?? '',
  legalOperatorAddress: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS?.trim() ?? '',
  themeColor: '#07111f',
  socialImage: '/images/hero-pitch.png',
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://footballiq-git-fix-clean-auth-04c2fd-neytnicholas-gifs-projects.vercel.app'
  },
}
