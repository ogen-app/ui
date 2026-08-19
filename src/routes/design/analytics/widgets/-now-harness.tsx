import { NowSection } from '@/components/analytics/ComparisonSections'
import { MEASURES, type MeasureId } from '@/components/analytics/types'
import { HarnessShell, Specimen } from '../chrome-page'
import { CAMPAIGN_NOW_STATES } from './-states'

/**
 * "What happened", pinned to one of its tabs, in every state that tab has to
 * survive.
 *
 * One page per tab rather than one page for the card, because the tabs are not
 * four skins of the same chart. A cumulative total, a daily rate and a standing
 * follower count are three different pictures with three different ways of
 * lying — a running total that starts anywhere but zero, a rate joined into a
 * trend it doesn't have, a level squashed against a zero baseline it never goes
 * near. Reviewing them together is how one of those ships.
 */
const LEDE: Record<string, string> = {
  reach: 'A running total, climbing from nothing to the figure on the tile. It ends exactly on the headline number, and the cone behind it is where this workspace normally lands by the end of a window this long — so leaving the cone means unusual, not merely different.',
  interactions:
    'The same running total, one measure down. Worth its own page because it is the tab most often read straight after reach, and the two have to agree: a cumulative curve that climbs while reach flattens is a real finding, and it has to be visible as one.',
  engagement_rate:
    'Columns, not a line. A rate is re-derived every day and carries nothing over from yesterday, so joining the days claims a continuity that does not exist — and a day with nothing published has no rate at all, which a line would bridge straight over.',
  followers:
    'A level: where the count stood each day. The one chart here that must not be forced to a zero baseline — a follower count moving between 13.5K and 14.2K flattens into the top two pixels of an axis that starts at nothing.',
}

export function NowWidgetHarness({ measure }: { measure: MeasureId }) {
  const meta = MEASURES[measure]

  return (
    <HarnessShell title={`What happened · ${meta.periodLabel}`} lede={LEDE[measure]}>
      <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <h2 className="font-grotesk text-sm font-medium">What each state is testing</h2>
        <ul className="flex max-w-2xl list-disc flex-col gap-1.5 pl-4 text-sm text-secondary-foreground">
          <li>
            <strong className="font-medium text-foreground">Each fact once.</strong>{' '}
            The tile says whether the figure is unusual, the band draws what it
            is being held against, the finding says what neither can. Nothing
            under the chart restates the chart.
          </li>
          <li>
            <strong className="font-medium text-foreground">Absence is a state.</strong>{' '}
            No comparison, no usual range, nothing reported: each removes a
            piece, and the rest has to still read as a finished card rather than
            as something that failed to load.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              The chart matches the quantity.
            </strong>{' '}
            Running total, daily columns or a standing level — chosen by the
            measure, so no card can accidentally draw a cumulative rate.
          </li>
          <li>
            <strong className="font-medium text-foreground">Dated ticks.</strong> The
            chart names the days under it, so a screenshot of it is still
            dateable a week later.
          </li>
        </ul>
      </div>

      {CAMPAIGN_NOW_STATES.map((state) => (
        <Specimen key={state.id} label={state.label} note={state.note}>
          <NowSection view={state.view} initialMeasure={measure} />
        </Specimen>
      ))}
    </HarnessShell>
  )
}
