import { resolveMx } from 'node:dns/promises'

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SPORTMONKS_API_TOKEN',
  'CRON_SECRET',
  'MARKET_ADMIN_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPPORT_EMAIL',
  'NEXT_PUBLIC_LEGAL_OPERATOR_NAME',
  'NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS',
]

const errors = []
for (const name of required) {
  const value = process.env[name]?.trim()
  if (!value || /your_|example\.com|here$/i.test(value)) errors.push(`${name} is missing or still a placeholder.`)
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? ''
if (siteUrl && !/^https:\/\//i.test(siteUrl)) errors.push('NEXT_PUBLIC_SITE_URL must use HTTPS.')

const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? ''
const emailParts = email.match(/^[^\s@]+@([^\s@]+)$/)
if (email && !emailParts) {
  errors.push('NEXT_PUBLIC_SUPPORT_EMAIL is not a valid email address.')
} else if (emailParts) {
  try {
    const mx = await resolveMx(emailParts[1])
    if (!mx.length) errors.push(`No MX records were found for ${emailParts[1]}.`)
  } catch {
    errors.push(`The support-email domain ${emailParts[1]} does not resolve to a mail server.`)
  }
}

if (errors.length) {
  console.error('Launch configuration is NOT ready:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Launch configuration passed: required secrets, identity, HTTPS URL and support mail DNS are present.')
