export const BRAND = {
  name: 'Verdict XI',
  shortName: 'Verdict XI',
  description:
    'Build your XI, make the big calls and prove how well you read the game.',
  supportEmail: 'hello@footballiq.app',
  themeColor: '#07111f',
  socialImage: '/images/hero-pitch.png',
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://footballiq-tau.vercel.app'
  },
}
