import { readFlagOverrides } from '@/config/flagOverrides'
import { demoMode } from '@/services/api/analytics.demo'
import { ZIndex } from '@/config/zIndex'

/**
 * A standing marker, above the assistant trigger, whenever this browser is
 * not seeing the build's own flags.
 *
 * Without it the failure mode is obvious in hindsight: an override left on
 * weeks ago makes staging behave differently for one person, and it gets
 * reported as a bug that nobody else can reproduce. The marker makes the state
 * self-evident and doubles as the way back to the panel — which is what lets
 * `/flags` stay unlinked from the app proper.
 *
 * It stacks directly above the assistant trigger rather than taking the
 * bottom-left corner the layout contract (CON-178) keeps empty — that corner
 * is only empty in the *content* column, and a viewport-fixed badge lands on
 * the sidebar's account row instead. Sharing the trigger's right edge is the
 * next-least-occupied place, and being visibly smaller keeps it an annotation
 * rather than a second control on that line. It displaces nothing in
 * production, where this module does not exist at all.
 *
 * Simulated analytics is announced here too, and it is the more important of
 * the two: a forced flag shows you a screen that exists, while demo analytics
 * puts invented figures about this workspace's own posts where real ones go.
 * Nothing else on the page distinguishes them, so this line is the only thing
 * that does.
 *
 * Its copy is literal English for the same reason the panel's is.
 */
export default function OverrideMarker() {
  const count = Object.keys(readFlagOverrides()).length
  const analytics = demoMode()
  if (count === 0 && analytics === 'live') return null

  const label = [
    count > 0 &&
      (count === 1 ? '1 flag overridden' : `${count} flags overridden`),
    analytics !== 'live' && `analytics: ${analytics}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    // A plain anchor, not a router `Link`: this mounts beside `RouterProvider`
    // rather than under it, so there is no router context to read. A hard
    // navigation to a dev panel costs nothing and can't be broken by the
    // routing state that sent someone looking for this badge.
    <a
      href="/flags"
      className="fixed right-4 bottom-20 flex h-8 items-center rounded-md border border-warning bg-background px-3 text-xs text-foreground hover:bg-secondary"
      style={{ zIndex: ZIndex.devToolsMarker }}
    >
      {label}
    </a>
  )
}
