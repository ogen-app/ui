import { Link } from '@tanstack/react-router'
import { HarnessShell } from '../chrome-page'

/**
 * The campaign bench.
 *
 * Separate from the surface harnesses because they answer different questions.
 * A surface answers "does the page hold together"; a widget page answers "does
 * this card survive every shape of data it will be handed" — no comparison
 * yet, no expectation to judge against, half the posts unreported, nothing
 * worth saying. On a surface those states are invisible, because only one of
 * them can be on screen at a time and it is always the flattering one.
 *
 * The post's cards have their own bench next door. They were here while a post
 * was one card; it is a surface of its own now, and a list mixing "What
 * happened · Cumulative reach" with seven post measures stopped saying which
 * screen anything belonged to.
 */
export function CampaignWidgetHub() {
  return (
    <HarnessShell
      title="Campaign widgets"
      lede="Every card the campaign surface is built from, with the states it has to survive. The campaign page shows one arrangement; these show the same card handed thin data, absent data, and the data that makes its copy read wrongly."
    >
      <div className="flex flex-col gap-2">
        {/*
          One entry per tab, not one per card. The tabs of "What happened" share
          a shell and nothing else: a running total, a daily rate and a standing
          level are three pictures with three different ways of lying, and each
          needs reviewing against the same five states on its own.
        */}
        <Widget
          to="/design/analytics/widgets/cumulative-reach"
          title="What happened · Cumulative reach"
          detail="The headline tab. A running total that ends on the figure above it, inside the cone this workspace normally lands in — with the rail of publication marks under it, so a bend can be attributed to a post."
          count="5 states"
        />
        <Widget
          to="/design/analytics/widgets/cumulative-interactions"
          title="What happened · Cumulative interactions"
          detail="The same running total, read straight after reach — the two have to agree, and a curve that climbs while reach flattens is a finding."
          count="5 states"
        />
        <Widget
          to="/design/analytics/widgets/daily-engagement-rate"
          title="What happened · Daily engagement rate"
          detail="Columns. A rate carries nothing over from yesterday, so the days stand apart instead of being joined into a trend."
          count="5 states"
        />
        <Widget
          to="/design/analytics/widgets/current-followers"
          title="What happened · Current followers"
          detail="A level, where the count stood each day — and the one chart here that must not be forced to a zero baseline."
          count="5 states"
        />
        <Widget
          to="/design/analytics/widgets/performers"
          title="Performers and outliers"
          detail="Both ends of the period. Review it with the picker in hand — the order is supposed to change with the question."
          count="5 states"
        />
        <Widget
          to="/design/analytics/widgets/quality"
          title="Quality against results"
          detail="Did the score we gave a post before publishing predict anything? Element by element — and the card has to be able to answer no."
          count="7 states"
        />
        <Widget
          to="/design/analytics/widgets/platform-filter"
          title="Platforms filter"
          detail="The scope line: which platforms are in the numbers, and the period they are taken over. The one row that changes what every figure below it is counting."
          count="5 states"
        />
      </div>

      <p className="max-w-2xl text-xs text-tertiary-foreground">
        Outcomes, Side by side, What we've learned and What's next are out of
        scope and live at the foot of the campaign page. They move here if and
        when one of them comes back.
      </p>
    </HarnessShell>
  )
}

function Widget({
  to,
  title,
  detail,
  count,
}: {
  to: string
  title: string
  detail: string
  count: string
}) {
  return (
    <Link
      to={to}
      className="flex max-w-2xl items-baseline justify-between gap-4 rounded-lg border border-border px-5 py-4 transition-colors hover:bg-quaternary"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-tertiary-foreground">{detail}</span>
      </span>
      <span className="shrink-0 text-xs text-tertiary-foreground">{count}</span>
    </Link>
  )
}
