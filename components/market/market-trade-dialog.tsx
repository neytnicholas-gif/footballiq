'use client'

import { useEffect, useId } from 'react'

export function MarketTradeDialog({
  action,
  playerName,
  details,
  onCancel,
  onConfirm,
}: {
  action: 'buy' | 'sell'
  playerName: string
  details: Array<{ label: string; value: string }>
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const isBuy = action === 'buy'

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-[1.75rem] border border-emerald-900/15 bg-white p-5 text-slate-950 shadow-2xl sm:p-6"
      >
        <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Confirm {action}</p>
        <h2 id={titleId} className="mt-2 text-2xl font-black">{isBuy ? 'Buy' : 'Sell'} {playerName}?</h2>
        <p id={descriptionId} className="mt-2 text-sm text-slate-600">
          Review the FootballIQ game-value details before confirming. No real money is involved.
        </p>

        <dl className="mt-5 space-y-2 rounded-2xl border border-emerald-900/10 bg-emerald-50/70 p-4">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-start justify-between gap-4 text-sm">
              <dt className="text-slate-500">{detail.label}</dt>
              <dd className="text-right font-semibold text-slate-900">{detail.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            Cancel
          </button>
          <button type="button" autoFocus onClick={onConfirm} className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            Confirm {action}
          </button>
        </div>
      </section>
    </div>
  )
}
