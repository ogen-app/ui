import { useEffect } from 'react'
import { subscribeToEvents } from '@/stores/eventStreamStore'

/**
 * Keeps the broadcast event stream open for as long as this is mounted.
 *
 * Mount it once, at the authenticated layout: the stream is session-wide, and
 * the subscriber count in the store means a second caller would join the same
 * connection rather than open another. Unmounting it (logging out) closes the
 * stream — which matters, because the connection is authenticated and the next
 * user of this browser must not inherit it.
 */
export function useEventStream(): void {
  useEffect(() => subscribeToEvents(), [])
}
