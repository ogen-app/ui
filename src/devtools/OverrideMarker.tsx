import { FLAG_IDS } from '@/config/featureFlags'
import { readFlagOverrides } from '@/config/flagOverrides'
import { demoMode } from '@/services/api/analytics.demo'
import { ZIndex } from '@/config/zIndex'

/**
 * A standing marker in the bottom-right corner whenever this browser is not
 * seeing the build's own flags.
 *
 * Without it the failure mode is obvious in hindsight: an override left on
 * weeks ago makes staging behave differently for one person, and it gets
 * reported as a bug that nobody else can reproduce. The marker makes the state
 * self-evident and doubles as the way back to the panel — which is what lets
 * `/flags` stay unlinked from the app proper.
 *
 * Bottom-right rather than bottom-left: the layout contract (CON-178) keeps
 * both bottom corners of the *content* column empty, but a viewport-fixed
 * badge on the left lands on the rail's collapse row. The right corner has
 * been free since the assistant's mark moved into the top bar. It sits 80px
 * up rather than in the corner itself, which is clear of the right column's
 * composer and its send button when the assistant is open. It displaces
 * nothing in production, where this module does not exist at all.
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
  // Only overrides for flags this build actually has: storage can retain
  // entries for flags that have since been deleted, and those do nothing —
  // counting them would make the marker warn about a state with no effect.
  const overrides = readFlagOverrides()
  const count = FLAG_IDS.filter((flag) => flag in overrides).length
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
