import { PostOverviewCard } from '@/components/analytics/PostPerformance'
import { HarnessShell, Specimen } from '../../../chrome-page'
import { POST_STATES } from '../../-states'

/**
 * The overview card, alone.
 *
 * The one card on the post surface that renders in every state, including the
 * two where no measure card can: a draft, and a post the platform has said
 * nothing about. Those two are the review — everything else here is the card
 * doing its ordinary job, and the question is whether a row of tiles and a rank
 * are enough to open a surface with once the charts have moved off it.
 *
 * The other thing to read down the column is the *width* of the tile row. Six
 * measures on one post and seven on the next is the surface working as intended,
 * and it is also the thing most likely to look like a rendering fault.
 */
export function PostOverviewHarness() {
  return (
    <HarnessShell
      title="Performance overview"
      lede="Every figure the platform reported, what we make of the post, and the notes on one line — no chart. It is the index of the surface: the whole answer without scrolling, and the order the cards below it stack. A shape here would compete with the card below carrying the same shape larger."
    >
      {POST_STATES.map((state) => (
        <Specimen key={state.id} label={state.label} note={state.note}>
          <PostOverviewCard view={state.view} />
        </Specimen>
      ))}
    </HarnessShell>
  )
}
