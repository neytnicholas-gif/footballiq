'use client'

import { useAuth } from '@/components/auth-provider'
import { PortfolioPanel } from '@/components/market/portfolio-panel'

export function MarketPortfolioAccess() {
  const { user, loading } = useAuth()
  return <PortfolioPanel initialPortfolio={null} authRequired={loading || !user} />
}
