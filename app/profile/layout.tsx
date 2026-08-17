import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Profile',
  description: 'See your Early Shout level, game results, badges and team.',
}

export default function ProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
