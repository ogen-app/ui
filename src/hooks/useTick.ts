import { useEffect, useState } from 'react'

/**
 * Re-renders on an interval while `active`. Used by the assistant to keep
 * elapsed-time labels moving during a run without putting a clock in a store.
 */
export function useTick(active: boolean, intervalMs = 200) {
  const [, force] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => force((n) => n + 1), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
}
