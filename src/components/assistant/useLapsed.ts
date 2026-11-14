import { useEffect, useState } from 'react'

/** Whether an offer's expiry has passed, turning true when it does. */
export function useLapsed(expiresAt: string | undefined): boolean {
  const at = expiresAt ? Date.parse(expiresAt) : NaN
  const [lapsedAt, setLapsedAt] = useState<number | null>(() =>
    !Number.isNaN(at) && at <= Date.now() ? at : null,
  )
  useEffect(() => {
    if (Number.isNaN(at)) return
    // Already past (a new expiry since mount) lapses on the next tick; a
    // timer longer than this would overflow, and an offer lives a day.
    const left = Math.max(0, at - Date.now())
    if (left > 2 ** 31 - 1) return
    const id = setTimeout(() => setLapsedAt(at), left)
    return () => clearTimeout(id)
  }, [at])
  return lapsedAt !== null && lapsedAt === at
}
