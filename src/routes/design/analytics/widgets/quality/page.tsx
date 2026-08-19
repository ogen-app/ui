import { QualitySection } from '@/components/analytics/QualitySection'
import { HarnessShell, Specimen } from '../../chrome-page'
import { QUALITY_STATES } from '../-states'

/**
 * "Quality against results", in every state it has to survive.
 *
 * The card to review with the picker in hand rather than by looking at it. Its
 * argument is that the four elements of the quality check are four different
 * claims and any of them may be worthless — so the review is: switch what "did
 * better" means on the first specimen and watch Delivery and Engagement change
 * places. If the card only ever agreed with the score, it would be a card that
 * confirms whatever it is shown.
 */
export function QualityHarness() {
  return (
    <HarnessShell
      title="Quality against results"
      lede="The one thing this workspace knows about a post before publishing is the score it gave it. This card asks whether that score had anything to do with what happened next — element by element, because the four are four separate claims and they do not have to agree."
    >
      <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <h2 className="font-grotesk text-sm font-medium">The rules it holds to</h2>
        <ul className="flex max-w-2xl list-disc flex-col gap-1.5 pl-4 text-sm text-secondary-foreground">
          <li>
            <strong className="font-medium text-foreground">It has to be able to say no.</strong>{' '}
            A flat element reads as flat and an inverted one as inverted, in the
            same clothes as the one that works. The score is advisory; a card
            that could only find agreement would be worthless as evidence for
            keeping it.
          </li>
          <li>
            <strong className="font-medium text-foreground">Bands, not a coefficient.</strong>{' '}
            Thirteen posts do not support a correlation, and nobody can read one
            anyway. Three bands turn it into "these posts against those posts" —
            a claim the reader can check by opening two of them.
          </li>
          <li>
            <strong className="font-medium text-foreground">Medians, not averages.</strong>{' '}
            One post at a quarter of the campaign lands in whichever band it
            lands in and would drag that band's average wherever it liked. The
            finding would then be an artefact of a single post.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              Compared on the performers card's criteria.
            </strong>{' '}
            The bands hold posts of every age by construction, so ranking them on
            a raw total would rank them by seniority. "Which of these did better"
            is one question and gets one vocabulary across the surface.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              No variance is not the same as no sample.
            </strong>{' '}
            An element every post clears is a floor, not a lever, and the advice
            it deserves is nothing like "publish more posts" — so the tile says
            which of the two it is.
          </li>
          <li>
            <strong className="font-medium text-foreground">Outside the date lens.</strong>{' '}
            Whether an element predicts anything is a property of the content,
            not of the last 28 days — and three bands need more posts than a
            four-week window holds.
          </li>
        </ul>
      </div>

      {QUALITY_STATES.map((state) => (
        <Specimen key={state.id} label={state.label} note={state.note}>
          <QualitySection view={state.view} />
        </Specimen>
      ))}
    </HarnessShell>
  )
}
