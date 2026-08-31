import {
  MEASURES,
  type Coverage,
  type Insight,
  type MeasureId,
  type MeasureReading,
  type NowView,
  type Period,
  type Point,
} from '@/components/analytics/types'
import { relativeTime } from '@/lib/relativeTime'
import type {
  AnalyticsInsight,
  AnalyticsOverview,
  OverviewCard,
  OverviewMetric,
  OverviewSeries,
} from '@/types/analytics'

/**
 * `GET /api/analytics/overview` (CON-237) onto the view the "What happened"
 * card already speaks.
 *
 * The card was designed before the endpoint existed and the two very nearly
 * agree, which is exactly why this file is worth reading: the places they
 * *don't* agree are all places where a plausible-looking mapping would put a
 * number on screen that means something other than what it says.
 *
 * Four of them, in order of how quietly they would go wrong:
 *
 * 1. **The wire's flow series are already cumulative; the view's are not.**
 *    `NowSection` accumulates a flow itself and scales the result onto the
 *    tile's figure, so handing it a running total draws the sum of a sum. The
 *    flows are differenced back to per-bucket here — see {@link perBucket}.
 * 2. **`previous` is not one quantity.** The server compares each metric
 *    against a different basis, and only three of the five can be read back off
 *    the series. See {@link previousValue}.
 * 3. **`delta_pct: 0` is ambiguous** — the server sends it both for "flat" and
 *    for "there was nothing to compare against" (`pct()` returns 0 when the
 *    previous value is 0). The view distinguishes them, so each metric decides
 *    from its own series which of the two it is.
 * 4. **`severity` is not polarity.** `info`/`note` say how loudly to render a
 *    sentence, never whether its news is good, so the tone comes from a table
 *    keyed by rule id — see {@link TONE}.
 *
 * What the endpoint does not carry at all is the *usual range*. Every card
 * comes back `baseline: "insufficient_history"` and no `band`, because the
 * long-retention rollup the band needs has no tenant with enough history behind
 * it yet (`analytics/overview/overview.go` says so in its package comment). So
 * `expected` is null throughout, and the card drops its verdict lines, its cone
 * and the "usual range" key on its own. {@link readExpected} is written against
 * the field rather than against today's absence, so the day a band arrives this
 * mapper does not need editing.
 */

/** The wire's five metric keys onto the view's vocabulary. */
const MEASURE_OF: Record<OverviewMetric, MeasureId> = {
  reach: 'reach',
  interactions: 'interactions',
  engagement_rate: 'engagement_rate',
  followers: 'followers',
  // The one rename. The view has carried `published` since before the endpoint
  // existed and it is the id every fixture and harness state is written
  // against; renaming the view to match the wire would be a larger edit than
  // this line, for no reader-visible gain.
  posts_published: 'published',
}

/**
 * Which way each rule's news cuts.
 *
 * Ours, not the server's, and it has to be: the wire's `severity` is a
 * loudness, and nothing on it says whether a sentence is good news. Keyed by
 * rule id because that is the only stable thing about an insight — the text is
 * templated with live numbers and the severity is reused across rules.
 *
 * `reinforcing` is missing on purpose: it is the one rule that fires both ways
 * (reach and interactions both up, or both down), and the server separates
 * those two by severity. It is resolved in {@link readInsight}.
 */
const TONE: Record<string, Insight['tone']> = {
  // A mechanic, not a judgement — "rate fell because reach rose" is the card
  // explaining arithmetic, and colouring it red would make a definition look
  // like bad news.
  rate_vs_reach: 'neutral',
  cadence_output: 'positive',
  follower_streak: 'positive',
  // A caveat about concentration: one huge day is not itself good or bad, it
  // is a reason to distrust the window's average.
  peak_bucket: 'neutral',
}

/**
 * The Go zero time, which is what `updated_at` carries when nothing behind the
 * window has ever been checked. Rendering it relative produces "2025 years
 * ago", so it is treated as absent.
 */
function checkedAt(iso: string): string | undefined {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1)
    return undefined
  return relativeTime(iso) ?? undefined
}

/**
 * A cumulative series differenced back into what arrived in each bucket.
 *
 * Lossless for the flows, which are running sums of per-bucket totals by
 * construction. Negatives are clamped rather than carried: a flow cannot
 * un-earn reach, so a fall can only come from the server padding a short
 * previous-window array with trailing zeros (`alignLen`), and a negative
 * "arrived this bucket" is not a quantity the chart can draw.
 */
function perBucket(cumulative: number[]): number[] {
  return cumulative.map((value, i) =>
    i === 0 ? value : Math.max(0, value - cumulative[i - 1]),
  )
}

/** Bucket labels and values zipped into the view's points. */
function points(buckets: string[], values: number[]): Point[] {
  return buckets.map((date, i) => ({ date, value: values[i] ?? 0 }))
}

/**
 * The previous window's total for a flow.
 *
 * `Math.max` rather than the last element, because the server pads a short
 * previous-window series with trailing zeros instead of leaving it short. The
 * flows are monotonic, so their maximum *is* their final value, and reading it
 * that way is immune to the padding.
 */
function flowTotal(cumulative: number[]): number {
  return cumulative.length === 0 ? 0 : Math.max(...cumulative)
}

function firstNonZero(values: number[]): number {
  return values.find((v) => v !== 0) ?? 0
}

/**
 * What the server actually held this metric against — reconstructed, because
 * the payload sends the *delta* and not the basis.
 *
 * `null` means there was nothing to compare with, and the tile says so rather
 * than drawing a 0% chip. Each metric answers differently because the server
 * compares each one differently (`analytics/overview/overview.go`):
 *
 * - **Flows** (reach, interactions, posts published) are held against the
 *   previous window's total, which is the previous series' own endpoint. Exact.
 * - **Followers** is a level, held against where the count stood at the start
 *   of *this* window — `firstNonZero` of the current series, which is the
 *   server's own `followersStart`. That instant is also the end of the previous
 *   window, so the tile's chip and the ghost line behind the chart agree.
 * - **Engagement rate** is the one that cannot be read off a series at all: the
 *   server compares the ratio of the previous window's *sums*, and a series of
 *   per-bucket ratios cannot be summed back into it. So it is recovered from
 *   the delta instead, which is exact to the one decimal the server rounds to.
 *   A zero delta is read as "no comparison" only when the previous window
 *   reported no rate in any bucket; otherwise it is a genuinely flat window.
 */
function previousValue(
  metric: OverviewMetric,
  card: OverviewCard,
  series: OverviewSeries,
): number | null {
  if (metric === 'followers') {
    const start = firstNonZero(series.current)
    return start === 0 ? null : start
  }

  if (metric === 'engagement_rate') {
    const hadRate = series.previous.some((v) => v > 0)
    if (!hadRate) return null
    if (card.delta_pct === 0) return card.value
    const previous = card.value / (1 + card.delta_pct / 100)
    return Number.isFinite(previous) && previous > 0 ? previous : null
  }

  const total = flowTotal(series.previous)
  return total === 0 ? null : total
}

/**
 * The usual range, as a period total.
 *
 * Absent from every response today. When it arrives it will be a band per
 * bucket, and the tile compares a *window total* — so the range that matters is
 * the one at the end of the window, which is the last bucket's band for a flow
 * and equally the standing range for a level.
 */
function readExpected(
  series: OverviewSeries,
): { low: number; high: number } | null {
  const end = series.band?.[series.band.length - 1]
  return end ? { low: end.lower, high: end.upper } : null
}

function readInsight(insight: AnalyticsInsight): Insight {
  const tone =
    insight.id === 'reinforcing'
      ? insight.severity === 'note'
        ? 'negative'
        : 'positive'
      : (TONE[insight.id] ?? 'neutral')

  return {
    id: insight.id,
    text: insight.text,
    tone,
    // The wire's second line is method — "rate is interactions ÷ reach, so a
    // reach spike depresses it mechanically" — which is precisely what the
    // card's `basis` slot is for.
    basis: insight.note,
  }
}

function readReading(
  card: OverviewCard,
  series: OverviewSeries,
): MeasureReading {
  const measure = MEASURE_OF[card.metric]
  const flow = MEASURES[measure].kind === 'flow'

  return {
    measure,
    value: card.value,
    previous: previousValue(card.metric, card, series),
    expected: readExpected(series),
    series: points(
      series.buckets,
      flow ? perBucket(series.current) : series.current,
    ),
    // Labelled with the *current* window's buckets, which is deliberate and is
    // the only way the ghost lines up: the wire's previous array is
    // index-aligned to this window rather than carrying its own dates, so day 3
    // of then belongs under day 3 of now. Read as calendar dates these points
    // are wrong by exactly one window, and nothing may read them that way.
    previousSeries: points(
      series.buckets,
      flow ? perBucket(series.previous) : series.previous,
    ),
  }
}

/**
 * How much of the workspace the numbers describe.
 *
 * The overview payload carries no count of *measured* posts — it is five
 * aggregates and a set of series — so `measured` is a proxy rather than a
 * figure, and it is only ever asked as a yes/no: the card uses it to decide
 * between drawing the chart and saying nothing has reported yet. Anything that
 * earned reach or interactions was measured, so the two are read as the switch.
 *
 * `published` is a real count, from the main-DB posts table, and is the number
 * the empty-state sentence quotes.
 */
function readCoverage(
  values: Partial<Record<OverviewMetric, number>>,
  updatedAt: string,
): Coverage {
  const published = values.posts_published ?? 0
  const anythingReported =
    (values.reach ?? 0) > 0 || (values.interactions ?? 0) > 0

  return {
    measured: anythingReported ? Math.max(published, 1) : 0,
    published,
    lastRefreshedAt: checkedAt(updatedAt),
  }
}

/** The window as the card's own heading reads it — `over last 28 days`. */
export function readPeriod(overview: AnalyticsOverview): Period {
  const { from, to, days } = overview.window
  return { label: `last ${days} days`, from, to, days }
}

/**
 * The whole card, from one response.
 *
 * Card order is the server's (`metricOrder`), so reach leads and is the measure
 * the chart opens on — `NowView.readings[0]` is the headline by convention.
 *
 * No `publications`: the rail of publish marks under the chart needs one entry
 * per post with its title and date, and this payload counts posts without
 * naming them. The card drops the rail and its legend entry on its own.
 */
export function buildNowView(overview: AnalyticsOverview): NowView {
  const values: Partial<Record<OverviewMetric, number>> = {}
  for (const card of overview.cards) values[card.metric] = card.value

  return {
    period: readPeriod(overview),
    // The day the previous stretch ended, which is the day this one began. The
    // card's legend reads "the stretch to 15 Jul" off it.
    comparedToDate: overview.window.from,
    readings: overview.cards
      .filter((card) => overview.series[card.metric])
      .map((card) => readReading(card, overview.series[card.metric])),
    insights: overview.insights.map(readInsight),
    coverage: readCoverage(values, overview.updated_at),
  }
}
