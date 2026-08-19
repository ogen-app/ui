import { useState } from 'react'
import { ComparisonBar, type ComparisonAxis } from '@/components/analytics/ComparisonBar'
import { SideBySideSection } from '@/components/analytics/ComparisonSections'
import { OutcomesSection } from '@/components/analytics/OutcomesSection'
import { NextSection, PatternsSection } from '@/components/analytics/StandingSections'
import type { MeasureId, SleeveDimension } from '@/components/analytics/types'
import {
  CAMPAIGN_SCOPE,
  HarnessShell,
  LiveSurface,
  OutOfScope,
  Specimen,
} from '../chrome-page'
import { campaignBounded, DEFAULT_PERIOD, PERIODS } from '../-fixtures'

/**
 * The campaign surface, built out of the widgets that exist.
 *
 * Three cards under one scope line — platforms and period on the same row:
 * **what happened**, **which posts carried it and which dragged**, and **was
 * the score we gave them worth anything**. Each has its own page under
 * `/design/analytics/widgets`, where it is reviewed against the states a
 * surface can only ever show one of at a time.
 *
 * The third is the one that leaves the lens. Everything above it is the last 28
 * days; quality against results is every post this campaign ever scored, because
 * three bands need more posts than a four-week window holds — and the card's
 * header carries that rather than the reader having to notice it.
 *
 * Everything else that was designed for this surface is parked below, under
 * "Not in scope". That line is the point of the page: the top half is what a
 * campaign owner would actually be handed, and the bottom half is a reading
 * room.
 */
export function CampaignAnalyticsHarness() {
  return (
    <HarnessShell
      title="Campaign analytics"
      lede="Everything a campaign can currently be told, and nothing that is still an argument. One scope line — which platforms, over what window — three cards, the last of which steps outside that window and says so, and the sections designed alongside them parked underneath where they can be read without being promised."
    >
      <Specimen
        label="In scope — mid-flight, driveable"
        note="Drive it: change the period, switch platforms off, switch the measure on the tiles, change what “best” means on the performers card — and on the quality card, change what “did better” means and watch Delivery and Engagement swap ends. Every card runs the same beats — a header, the figures, the selected one drawn out, what we make of it in a box, then the notes in plain grey — and the boxes are the only place a status mark is allowed. The order genuinely changes with the question: a two-day-old post at 9.6K sits ahead of a ten-day-old one at 12.9K once both are read against the workspace’s maturation curve."
      >
        <LiveSurface scope={CAMPAIGN_SCOPE} data={campaignBounded} />
      </Specimen>

      <OutOfScope
        note={
          <>
            Designed, built and argued over — but not shipping with this surface.
            Two of these have no data path at all (Outcomes needs a goal the API
            has no field for; What we've learned needs the add-on-gated insight
            endpoints), and two are decisions rather than gaps. They stay
            rendered so the thinking survives; they stay off the surface because
            a card on a real screen is a promise that the number in it is being
            maintained.
          </>
        }
      >
        <Specimen
          label="Side by side — the second axis"
          note="The switch at the top is why the surface above has no axis control: with only one destination it would be a two-way control that always reports the state it is already in. The card itself is the “where does the next hour go” question — several sleeves, one period, ranked, with a per-post column so a platform can't lead purely on having received three times as many posts."
        >
          <LiveComparison />
        </Specimen>

        <Specimen
          label="Outcomes — did any of it do anything"
          note="The section that would make this surface about the business rather than about the posts. It carries the rung it is currently measured at and never claims one above it — a goal watched through link clicks says “clicks through to /book”, never “bookings”. Out of scope because nothing on the API side declares a goal yet."
        >
          <OutcomesSection view={campaignBounded.outcomes} />
        </Specimen>

        <Specimen
          label="What we've learned — standing knowledge"
          note="Deliberately outside the date lens, and it says so on itself: “your posts land on Tuesday evenings” is not a fact about the last 28 days. Best times and the shelf-life curve come from Zernio's add-on-gated insight endpoints, which answer available: false for a tenant without the add-on — so the card has to be designed around not being answerable, not merely around being empty."
        >
          <PatternsSection view={campaignBounded.patterns} />
        </Specimen>

        <Specimen
          label="What's next — the way back into work"
          note="The only forward-looking card, and the only one that is useful on day one: a campaign has a plan before it has a single measured post. Every action names where it would be done, because analytics that only leads to more analytics is a dead end."
        >
          <NextSection view={campaignBounded.next} />
        </Specimen>
      </OutOfScope>
    </HarnessShell>
  )
}

/** Side by side with its own controls, since the surface above no longer has them. */
function LiveComparison() {
  const [axis, setAxis] = useState<ComparisonAxis>('sleeve')
  const [period, setPeriod] = useState(DEFAULT_PERIOD)
  const [dimension, setDimension] = useState<SleeveDimension>(
    campaignBounded.sideBySide.dimension,
  )
  const [measure, setMeasure] = useState<MeasureId>(campaignBounded.sideBySide.measure)

  return (
    <div className="flex flex-col gap-3">
      <ComparisonBar
        axis={axis}
        onAxisChange={setAxis}
        period={period}
        periods={PERIODS}
        onPeriodChange={setPeriod}
        dimension={dimension}
        onDimensionChange={setDimension}
        measure={measure}
        onMeasureChange={setMeasure}
      />
      {/*
        The pickers move the labels, not the figures — these are fixtures, and
        the one thing this harness cannot show is the numbers following a
        control. Don't read the totals after switching.
      */}
      <SideBySideSection view={{ ...campaignBounded.sideBySide, dimension, measure }} />
    </div>
  )
}
