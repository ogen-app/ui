import { PostIdentityCard } from '@/components/analytics/PostPerformance'
import { HarnessShell, Specimen } from '../../../chrome-page'
import { POST_STATES } from '../../-states'

/**
 * The identity card, alone.
 *
 * The only card here that renders identically in all eight states, which is
 * exactly what makes it worth a bench: everything else on the surface withdraws
 * under thin data, and this is the one thing a reader can always be told. Read
 * down the column and it should be eight different posts — different platform,
 * different format, different date — because if the specimens look alike here,
 * the card is not carrying enough to tell them apart.
 *
 * What changes is the date row: a scheduled post, a post forty minutes old, and
 * one from June.
 */
export function PostIdentityHarness() {
  return (
    <HarnessShell
      title="The post"
      lede="Which post this is — the first card on the surface, above the figures. Platform, account, format, when it went out, and the way through to the real thing. No figure and no finding: it is the caption on the surface rather than the first of its cards."
    >
      {POST_STATES.map((state) => (
        <Specimen key={state.id} label={state.label} note={state.note}>
          <PostIdentityCard post={state.view.post} />
        </Specimen>
      ))}
    </HarnessShell>
  )
}
