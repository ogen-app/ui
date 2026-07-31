import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { ZIndex } from '@/config/zIndex.ts'
import { cn } from '@/lib'

/**
 * Covers the app while the session is being rebound to another workspace.
 *
 * Switching ends in a full page load, so the truthful thing to show is not a
 * spinner tucked into the row that was clicked — it's the app going away. The
 * page fades out under an opaque layer, the spinner arrives a beat later, and
 * the next thing on screen is the new workspace's index.
 *
 * Portalled to the body for two reasons: it has to sit above modals (the
 * create dialog switches too), and a `fixed` layer inside a transformed
 * ancestor would position against that ancestor rather than the viewport.
 */
export function WorkspaceSwitchOverlay({ active }: { active: boolean }) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!active) {
      setShown(false)
      return
    }
    // One frame at opacity 0 first, so the browser has a value to animate
    // from — mounting straight into the end state doesn't transition.
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [active])

  if (!active) return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-background',
        'transition-opacity duration-300',
        shown ? 'opacity-100' : 'opacity-0',
      )}
      style={{ zIndex: ZIndex.appLoader }}
    >
      {/* `PageLoader` rather than a spinner of its own: a switch is the app
          waiting on data like any other surface, and it should say so in the
          same line, the same type and the same capitals.

          Held back against the cover's own fade so the two read in order: the
          page leaves, then the loader arrives. `MIN_SWITCH_MS` in
          useSwitchWorkspace is set against this delay to keep it on screen for
          a full second once it's there. */}
      <div
        className={cn(
          'h-full w-full transition-opacity duration-300 delay-200',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      >
        <PageLoader message="SWITCHING" />
      </div>
    </div>,
    document.body,
  )
}
