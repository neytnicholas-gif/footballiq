'use server'

import { createClient } from '@/lib/supabase/server'
import { assertMarketAdminUser } from '@/lib/market/admin-auth'
import { saveImportReviewDecision } from '@/lib/market/import-review'

export async function saveMarketImportReviewDecisionAction(formData: FormData): Promise<void> {
  const providerPlayerId = String(formData.get('providerPlayerId') ?? '').trim()
  const activeClubProviderId = String(formData.get('activeClubProviderId') ?? '').trim()
  const reviewerNote = String(formData.get('reviewerNote') ?? '').trim()

  if (!providerPlayerId || !activeClubProviderId) {
    return
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  assertMarketAdminUser(user?.id)

  await saveImportReviewDecision({
    providerPlayerId,
    activeClubProviderId,
    reviewerId: user!.id,
    reviewerNote: reviewerNote || undefined,
  })

}
