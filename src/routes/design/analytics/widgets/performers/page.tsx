import { PerformersSection } from '@/components/analytics/PerformersSection'
import { HarnessShell, Specimen } from '../../chrome-page'
import { PERFORMERS_STATES } from '../-states'

/**
 * "Performers and outliers", in every state it has to survive.
 *
 * The card to review with the picker in hand rather than by looking at it: its
 * whole argument is that "best" is a question and not a fact, and the only way
 * to see whether that holds is to switch criteria on the same eleven posts and
 * watch the order change.
 */
export function PerformersHarness() {
  return (
    <HarnessShell
      title="Performers and outliers"
      lede="Both ends of the period, by whichever question is being asked. Every criterion here survives being asked of posts of different ages — a ratio because both halves of it arrive together, a total because it is divided through how much of its life has landed."
    >
      <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <h2 className="font-grotesk text-sm font-medium">The rules it holds to</h2>
        <ul className="flex max-w-2xl list-disc flex-col gap-1.5 pl-4 text-sm text-secondary-foreground">
          <li>
            <strong className="font-medium text-foreground">Refuse, never rank last.</strong>{' '}
            A post whose platform reports no saves, or that was seen by too few
            people for a rate to mean anything, leaves the list and is counted at
            the foot. Sinking it to the bottom would blame the post for a gap in
            the data.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              Every figure against your own typical.
            </strong>{' '}
            5.0% is a good engagement rate or a poor one depending entirely on
            what yours normally is, so the bar sits under the figure it
            qualifies and diverges from the centre.
          </li>
          <li>
            <strong className="font-medium text-foreground">Never the same post twice.</strong>{' '}
            Best five and worst five out of nine would list one post at both
            ends. Under four ranked posts there are no two ends, and the card
            says so.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              One row, one account, one platform.
            </strong>{' '}
            The same post sent to four accounts is four rows. Totalling them
            would add a LinkedIn impression to an Instagram reach, and it would
            hide the finding — that the words worked on one account and nowhere
            else.
          </li>
          <li>
            <strong className="font-medium text-foreground">The denominator travels.</strong>{' '}
            A rate carries how many people it is over; a total carries its share
            of the period. Neither number is readable without the other.
          </li>
        </ul>
      </div>

      {PERFORMERS_STATES.map((state) => (
        <Specimen key={state.id} label={state.label} note={state.note}>
          <PerformersSection view={state.view} />
        </Specimen>
      ))}
    </HarnessShell>
  )
}
