export function isMarketAdminRequest(request: Request) {
  const authorization = request.headers.get('authorization')
  const secrets = [process.env.MARKET_ADMIN_SECRET, process.env.CRON_SECRET].filter((value): value is string => Boolean(value?.trim()))
  return secrets.some((secret) => authorization === `Bearer ${secret}`)
}
