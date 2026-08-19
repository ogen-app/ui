import { MEASURES } from '@/components/analytics/types'
import { PostMeasureCard } from '@/components/analytics/PostPerformance'
import { HarnessShell, Specimen } from '../../../chrome-page'
import { POST_STATES } from '../../-states'
import { isPostMeasure } from '../-measures'
import { Route } from './index'

/**
 * One measure card, against every state of a post.
 *
 * What to read for is the switch. Each card owns its own, so the review is
 * whether the default — the running total — is the right opening picture *for
 * this measure*: it is, for reach; it is arguable for saves, which arrive in a
 * handful of bursts and say more per day than as a smooth climb.
 *
 * The states that break these cards are the two absences. A measure the platform
 * never reported has no card here at all, so its specimen is empty — that is the
 * finding, not a rendering fault. A measure with a figure but no history keeps
 * its card and says what is missing.
 */
export function PostMeasureHarness() {
  const { measure } = Route.useParams()
  // A typo in the URL lands on reach rather than on a blank page: this is a
  // bench, and being told which measures exist beats an error boundary.
  const id = isPostMeasure(measure) ? measure : 'reach'
  const meta = MEASURES[id]

  return (
    <HarnessShell
      title={meta.label}
      lede={`${meta.hint ?? meta.label} — one card, one measure, its own switch. Every specimen below is the same card handed a different post; where a specimen is empty, that post's platform never reported this measure, and a card that would have to draw zeroes is a card we don't draw.`}
    >
      {POST_STATES.map((state) => (
        <Specimen key={state.id} label={state.label} note={state.note}>
          {state.view.metrics.some((m) => m.measure === id) ||
          state.view.series.some((s) => s.measure === id) ? (
            <PostMeasureCard view={state.view} measure={id} />
          ) : (
            <p className="text-sm text-tertiary-foreground">
              Not reported on this post — no card.
            </p>
          )}
        </Specimen>
      ))}
    </HarnessShell>
  )
}
