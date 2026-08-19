type PriceStatusPlayer = {
  current_value: number
  previous_value: number
  data_source_label?: string | null
}

type PriceStatusInput = {
  previewExperimentActive: boolean
  latestRevealWeek: string | null
  hasVerifiedMovement: boolean
}

const PREVIEW_LABEL = 'preview valuation experiment'

export function hasVerifiedPriceMovement(players: PriceStatusPlayer[]) {
  return players.some((player) =>
    !player.data_source_label?.includes(PREVIEW_LABEL)
    && player.current_value !== player.previous_value,
  )
}

export function getMarketPriceStatus({
  previewExperimentActive,
  latestRevealWeek,
  hasVerifiedMovement,
}: PriceStatusInput) {
  if (previewExperimentActive) {
    return {
      title: '11-player price test is live',
      description: 'We are testing 11 players with the same rules the full game uses. Test results stay clearly marked and never pretend to be a real match.',
      notice: null,
    }
  }

  if (latestRevealWeek) {
    return {
      title: `The ${latestRevealWeek} update is ready`,
      description: 'Finished-match ratings and minutes have been processed. Open The Reveal to see what changed in your team.',
      notice: null,
    }
  }

  if (hasVerifiedMovement) {
    return {
      title: 'Verified price movements are live',
      description: 'Finished-match ratings and minutes are now moving game prices. Build your team and check each player card to see the latest change.',
      notice: 'The Market has verified price movement. Your personal Reveal appears after players in your team receive an eligible update.',
    }
  }

  return {
    title: 'Opening prices are set',
    description: 'Build your team now. Prices stay at their opening value until finished matches provide trusted player ratings and minutes.',
    notice: 'The season has not produced a price update yet. Prices will start moving after finished matches give us player ratings and minutes.',
  }
}
