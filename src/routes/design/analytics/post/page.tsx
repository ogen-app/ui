import { PostAnalyticsSurface } from '@/components/analytics/PostPerformance'
import { HarnessShell, Specimen } from '../chrome-page'
import { POST_STATES } from '../widgets/-states'

/**
 * The post surface: the identity card, the overview and every measure card,
 * assembled.
 *
 * The counterpart to the campaign harness, and it answers the question the
 * widget bench can't — a card that survives every state on its own can still
 * make a bad page, and the failure is always the same one: too many cards
 * saying near-enough the same thing, each individually defensible.
 *
 * Read the specimens in order and they are one post ageing. What to watch for is
 * where the stack gets long: the reel is nine cards, which is the most this
 * surface will ever carry, and it is the specimen that decides whether the
 * measures below the fold are worth their scroll.
 */
export function PostAnalyticsHarness() {
  return (
    <HarnessShell
      title="Post"
      lede="One post's numbers, as a stack of cards. Which post this is, then an overview carrying every figure it reported, then a card per measure with its own history and its own switch for how to read it. A measure that came back empty has no card at all, which is why these specimens are different heights."
    >
      {POST_STATES.map((state) => (
        <Specimen key={state.id} label={state.label} note={state.note}>
          <PostAnalyticsSurface view={state.view} />
        </Specimen>
      ))}
    </HarnessShell>
  )
}
