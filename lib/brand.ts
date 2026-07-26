export const BRAND = {
  name: 'FootballIQ',
  shortName: 'FootballIQ',
  description:
    'Think like a scout, judge like a referee, and train your football knowledge with structured quiz modes.',
  supportEmail: 'hello@footballiq.app',
  themeColor: '#f4f6ef',
  socialImage: '/images/hero-pitch.png',
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://footballiq-tau.vercel.app'
  },
}
