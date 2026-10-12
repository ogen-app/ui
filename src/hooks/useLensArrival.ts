import { useEffect, useState } from 'react'
import { isLensWaiting, lensKey } from '@/lib/assetAnalysis'
import type { AssetAnalysis } from '@/types/assetAnalysis'

/** How long "Insights ready — N ideas added" stays up. */
export const ARRIVAL_MS = 4_000

/**
 * The number of ideas a lens has just landed with, for a few seconds after it
 * lands — or null.
 *
 * Only for a lens seen waiting and then ready *on this page*: it compares
 * with the previous render's view of the same lens, so a first load, or
 * switching to a lens that was already ready, says nothing. Ideas answered
 * "no" are not counted; the list does not show them either.
 */
export function useLensArrival(lens: AssetAnalysis | undefined): number | null {
  const key = lens ? lensKey(lens) : null
  const waiting = lens ? isLensWaiting(lens) : false
  const [seen, setSeen] = useState({ key, waiting })
  const [arrived, setArrived] = useState<number | null>(null)

  if (seen.key !== key || seen.waiting !== waiting) {
    if (seen.key === key && seen.waiting && lens?.status === 'ready') {
      setArrived(lens.ideas.filter((i) => i.verdict !== 'no').length)
    }
    setSeen({ key, waiting })
  }

  useEffect(() => {
    if (arrived === null) return
    const timer = setTimeout(() => setArrived(null), ARRIVAL_MS)
    return () => clearTimeout(timer)
  }, [arrived])

  return arrived
}
