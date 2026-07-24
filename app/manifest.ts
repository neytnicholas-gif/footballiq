import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    start_url: '/',
    display: 'standalone',
    background_color: BRAND.themeColor,
    theme_color: BRAND.themeColor,
    icons: [
      {
        src: BRAND.socialImage,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
