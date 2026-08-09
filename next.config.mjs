/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com https://*.vercel-insights.com",
      "upgrade-insecure-requests",
    ].join('; ')
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      ],
    }]
  },
}

export default nextConfig
