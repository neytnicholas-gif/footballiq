import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    id: '/',
    scope: '/',
    start_url: '/?source=home-screen',
    display: 'standalone',
    orientation: 'any',
    categories: ['sports', 'games', 'education'],
    background_color: '#06131b',
    theme_color: BRAND.themeColor,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Player Market', short_name: 'Market', url: '/market', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Football Games', short_name: 'Games', url: '/quizzes', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Daily Challenge', short_name: 'Daily', url: '/daily', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
