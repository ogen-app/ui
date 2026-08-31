import { useState, type ReactNode } from 'react'
import { resolvePlatformInfo } from '@/lib/platformDictionary'
import { EmptyChart, PostSeriesChart } from './charts'
import { Segmented } from './ComparisonBar'
import { InsightLine } from './ComparisonSections'
import {
  bucketSeries,
  delta,
  formatMeasure,
  measureMeta,
  rateFloor,
  ratioSeries,
  runningTotal,
  verdict,
} from './format'
import { DeltaChip, PostMeasureTile, VerdictLine } from './MeasureTile'
import { Basis, FigureGrid, NotYet, SectionCard } from './shell'
import {
  readingShape,
  type Insight,
  type MeasureId,
  type PostIdentity,
  type PostMaturity,
  type PostMetric,
  type PostPerformanceView,
  type PostSeriesPoint,
  type PostSeriesReading,
} from './types'

/**
 * A post's numbers, as a surface rather than a card.
 *
 * Which post this is, then an overview carrying every figure it reported and
 * what we make of the post as a whole, then a card per measure with its own
 * history and its own switch for how to read it. That split is not layout — it
 * is the same rule the campaign surface is built on: **a card is a promise that
 * its number is maintained**, so a measure the platform never reported has no
 * card at all, rather than a hole inside one shared card that keeps claiming to
 * cover it.
 *
 * It also fixes what the one-card version got wrong. Four charts stacked under
 * one switch made that switch a page control wearing a card control's clothes,
 * and pinned every measure to one reading — but a running total is the right
 * picture for reach and the wrong one for saves, which arrive in a handful of
 * bursts and say nothing at all as a smooth climb.
 */
export function PostAnalyticsSurface({ view }: { view: PostPerformanceView }) {
  return (
    <div className="flex flex-col gap-3">
      <PostIdentityCard post={view.post} />
      <PostOverviewCard view={view} />
      {chartedMeasures(view).map((measure) => (
        <PostMeasureCard key={measure} view={view} measure={measure} />
      ))}
    </div>
  )
}

/**
 * The measures that get a card, in the order they stack.
 *
 * Not a fixed list of four any more. Zernio's sweep carries impressions, reach,
 * likes, comments, shares, saves, clicks and views, and which of them come back
 * is the platform's business — a card appears because its measure was reported,
 * and a measure that wasn't is silent rather than zero.
 */
const MEASURE_ORDER: MeasureId[] = [
  'reach',
  'impressions',
  'interactions',
  'engagement_rate',
  'saves',
  'clicks',
  'views',
]

/**
 * Which post this is — the first card, and the only one that never withdraws.
 *
 * Everything below it is a claim about a post: "better than 94% of yours",
 * "+34% on a typical post", a line climbing for twelve days. None of it can be
 * read, sent to anyone, or argued with until the reader knows *which* post,
 * where it went, and when — and on a screen reached from a list of eleven
 * similar-looking rows, that is not something to leave to the browser tab.
 *
 * It carries no figure and no finding, which is what keeps it from being the
 * overview's rival: it is the caption on the surface, not the first of its
 * cards. The date is the part that matters most and is easiest to leave out —
 * absolute for the screenshot, relative because "4 hours ago" is the difference
 * between a floor and a result.
 */
export function PostIdentityCard({ post }: { post: PostIdentity }) {
  const info = resolvePlatformInfo(post.platform)
  const Icon = info?.icon

  return (
    <SectionCard
      title="The post"
      status={
        post.permalink ? (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-medium underline underline-offset-2"
          >
            Open on {info?.name ?? post.platform}
          </a>
        ) : undefined
      }
    >
      <div className="flex items-start gap-3">
        {/* The brand mark, at the size it has everywhere else. Which platform a
            post went to changes what every figure below it means — a reel's
            views and a LinkedIn post's impressions are not the same currency. */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
          {Icon ? (
            <Icon
              className="size-6"
              weight="fill"
              style={{ color: info?.color }}
              aria-hidden
            />
          ) : (
            <span className="text-xs font-medium">
              {post.platform.slice(0, 2)}
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium">{post.title}</p>
          <p className="text-xs text-tertiary-foreground">
            {post.format} · {post.account}
          </p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {/* The label carries which of the three this is, so the value can be
            the date and nothing else. "Published / 18 Aug 2026, 08:20" and
            "Scheduled / Friday 21 Aug, 09:00" read as one row of the same
            kind, which is what lets someone scan a column of these. */}
        <Fact label={dateLabel(post)}>
          {post.publishedOn ? (
            <>
              {post.publishedOn}
              {post.publishedAgo && (
                <span className="text-tertiary-foreground">
                  {' '}
                  · {post.publishedAgo}
                </span>
              )}
            </>
          ) : (
            <span className="text-secondary-foreground">
              {post.scheduledFor ?? 'No date set'}
            </span>
          )}
        </Fact>
        {post.campaign && <Fact label="Campaign">{post.campaign}</Fact>}
      </dl>
    </SectionCard>
  )
}

/** Published, or the nearest true thing to it. */
function dateLabel(post: PostIdentity): string {
  if (post.publishedOn) return 'Published'
  return post.scheduledFor ? 'Scheduled' : 'Not scheduled'
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-tertiary-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/**
 * The post's control panel: every figure it reported, the findings, the notes.
 *
 * **Every figure, and no chart.** It is the index of the surface: one row of
 * tiles saying what this post earned on every count the platform reported, in
 * the order the cards below it stack. A reader who wants the whole answer gets
 * it without scrolling, and a reader who wants one of them knows before
 * scrolling that the card is down there — which is what a seven-card surface
 * needs at the top of it and what a two-figure headline could not give.
 *
 * The charts stay below. The moment this card carries a shape it competes with
 * the card carrying the same shape larger, and the tiles stop being comparable
 * with each other, which is the one thing they are for.
 */
export function PostOverviewCard({ view }: { view: PostPerformanceView }) {
  if (view.maturity === 'unpublished') {
    return (
      <SectionCard title="Performance overview">
        <NotYet title="Nothing to measure yet">
          This post hasn't gone out. Once it does, what it earns shows up here —
          and how that compares with what your posts normally do.
        </NotYet>
      </SectionCard>
    )
  }

  // Published, and the platform has said nothing back. Distinct from earning
  // nothing, and the card has to say which: a grid of zeroes here would be a
  // picture of a failed post rather than of a slow API.
  if (view.metrics.length === 0) {
    return (
      // The window still belongs in the header, and here it is most of the
      // answer: forty minutes is why there is nothing to show. What is *not*
      // here is the publication date — that is on the card above, and a header
      // restating it is the same fact in two type sizes.
      <SectionCard title="Performance overview" qualifier={window_(view)}>
        <NotYet title="Nothing back from the platform yet">
          This post is out. The platform hasn't reported any numbers for it —
          that usually takes a few hours.
        </NotYet>
        <Freshness at={view.lastRefreshedAt} />
      </SectionCard>
    )
  }

  // While a post is still counting, "typical" means what a typical post had
  // earned by this age. Same field, different basis — and the tiles say so on
  // the chip, because the two comparisons look identical and mean opposite
  // things on a four-hour-old post.
  const ageCorrected = view.maturity !== 'final'
  const insights = [percentileInsight(view), view.insight].filter(
    (i): i is Insight => i !== null,
  )
  // Every measure that came back, in the order the cards below stack — so the
  // tiles and the scroll tell the same story, and finding the card for a tile
  // is counting downwards rather than hunting.
  const tiles = orderedMetrics(view.metrics)

  return (
    <SectionCard title="Performance overview" qualifier={window_(view)}>
      {/*
        Two rows, deliberately, once there are enough figures to need them.
        Seven tiles across one line are 90px each: every label wraps, "Engagement
        rate" takes three lines of its own, and the row reads as a strip of
        fragments. Split in half they are wide enough to hold a label and a
        figure on one line each, which is the only reason a tile is a tile.
      */}
      <FigureGrid columns={tileColumns(tiles.length)}>
        {tiles.map((metric) => (
          <PostMeasureTile
            key={metric.measure}
            metric={metric}
            ageCorrected={ageCorrected}
          />
        ))}
      </FigureGrid>

      {insights.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {insights.map((insight) => (
            <li key={insight.id}>
              <InsightLine insight={insight} />
            </li>
          ))}
        </ul>
      )}

      {/*
        The two notes share a line. They are both provenance — what the figures
        above are still doing, and when they last moved — and stacked they read
        as a paragraph of small print that grows every time something is added
        to it. Side by side they are one line: the caveat where the reader is
        already looking, the timestamp in the corner where every card on these
        surfaces keeps it.
      */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <Basis>{MATURITY_NOTE[view.maturity]}</Basis>
        <Freshness at={view.lastRefreshedAt} />
      </div>
    </SectionCard>
  )
}

/**
 * One measure, and how the post earned it.
 *
 * The figure sits under the title rather than in a tile: the title already names
 * the measure, and a tile inside a card whose whole subject is that one measure
 * labels it twice and boxes a number with nothing beside it to be compared to.
 *
 * The reading switch takes the header's right-hand corner, alone — the one
 * control a card is allowed. Each card keeps its own, which is half the point of
 * splitting them: reach is read as a running total and saves as a column per
 * day, and one switch above all of them forces the same answer onto both.
 */
export function PostMeasureCard({
  view,
  measure,
}: {
  view: PostPerformanceView
  measure: MeasureId
}) {
  const [reading, setReading] = useState<PostSeriesReading>('total')
  const meta = measureMeta(measure)
  const metric = view.metrics.find((m) => m.measure === measure)
  const points = seriesFor(view, measure, reading)
  const { mode, interval } = readingShape(reading)
  const bucket = BUCKET[interval]

  return (
    <SectionCard
      title={meta.label}
      status={
        <Segmented
          value={reading}
          onChange={setReading}
          options={[
            { value: 'total' as const, label: 'Running total' },
            { value: 'hour' as const, label: '1H' },
            { value: 'day' as const, label: '1D' },
          ]}
        />
      }
    >
      {metric && (
        <MeasureHeadline
          metric={metric}
          ageCorrected={view.maturity !== 'final'}
        />
      )}

      {points === null ? (
        // Nothing recorded how this arrived — a post published before the sweep
        // started, or a platform that only ever hands back a current total. The
        // figure above it is still true, which is why the card stays.
        <div className="flex flex-col gap-2">
          <EmptyChart
            label="No history recorded for this post"
            className="h-32"
          />
          <Basis>
            {meta.label} was collected as a total. Nothing recorded how it
            arrived, so there is no shape to draw.
          </Basis>
        </div>
      ) : peak(points) === 0 ? (
        // Only ever the rate, and only per bucket: on a small post no single
        // hour reaches enough people to divide, so every bucket falls under the
        // floor. Drawing that as a flat axis would be a picture of a post nobody
        // engaged with, when the rate is in the figure above.
        <div className="flex flex-col gap-2">
          <EmptyChart
            label={`No ${bucket.noun} reached enough people to divide`}
            className="h-32"
          />
          <Basis>
            Try the day, or the running total — both have enough behind them to
            divide by.
          </Basis>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <PostSeriesChart points={points} mode={mode} interval={interval} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <Basis>{legend(measure, reading)}</Basis>
            {/*
              The scale, but only where the reader hasn't been given it already.
              On a running total the last point is the figure at the top of the
              card; per bucket the peak is a number nothing else states, and
              without it two cards on two scales invite their heights to be read
              against each other.
            */}
            {mode === 'interval' && (
              <Basis>
                peak {formatMeasure(measure, peak(points))} {bucket.article}{' '}
                {bucket.noun}
              </Basis>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

/**
 * The figure, at the size a card whose whole subject is one measure can give it.
 *
 * The same three parts as the tile — figure, movement against a typical post,
 * which side of usual it lands on — laid along a line rather than stacked in a
 * box, because there is only one of it and nothing beside it to line up with.
 */
function MeasureHeadline({
  metric,
  ageCorrected,
}: {
  metric: PostMetric
  ageCorrected: boolean
}) {
  const d = delta(metric.measure, metric.value, metric.typical ?? null)
  const v = verdict(metric.value, metric.expected ?? null)

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-display text-3xl font-medium leading-none">
        {formatMeasure(metric.measure, metric.value)}
      </span>
      {d ? (
        <DeltaChip
          delta={d}
          title={
            ageCorrected
              ? 'vs a typical post of yours at the same age'
              : 'vs a typical post of yours'
          }
        />
      ) : (
        // Not "nothing to compare": what is missing on a post is a history to
        // compare *against*, and saying so is the difference between a young
        // workspace and a broken card.
        <span className="text-xs text-tertiary-foreground">no typical yet</span>
      )}
      <VerdictLine measure={metric.measure} verdict={v} />
    </div>
  )
}

/**
 * The span the figures cover, as the header's qualifier.
 *
 * "over its first 26 hours" rather than "26 hours": the figures are everything
 * the post has earned so far, and *first* is what says the window starts at
 * publication rather than being a lens someone chose.
 */
function window_(view: PostPerformanceView): string | undefined {
  return view.measuredOver ? `over its first ${view.measuredOver}` : undefined
}

/**
 * How many columns the tile row gets, so that it lands on two lines.
 *
 * Below five it stays one line — four tiles across a content column are already
 * wide enough, and forcing 2×2 there would leave a card with more padding than
 * numbers.
 */
function tileColumns(count: number): number | undefined {
  return count >= 5 ? Math.ceil(count / 2) : undefined
}

/** "an hour" and "a day" — the one that reads "an day" is the one people notice. */
const BUCKET = {
  hour: { noun: 'hour', article: 'an' },
  day: { noun: 'day', article: 'a' },
} as const

function legend(measure: MeasureId, reading: PostSeriesReading): string {
  if (reading === 'total') {
    return measure === 'engagement_rate'
      ? 'The rate so far — interactions divided by everyone reached up to that point.'
      : 'Running total since publishing — the line ends on the figure above.'
  }
  const bucket = BUCKET[readingShape(reading).interval]
  const gap = `A gap is ${bucket.article} ${bucket.noun} with nothing in it`
  return measure === 'engagement_rate'
    ? `The rate it was running at each ${bucket.noun}. ${gap} — or one too quiet to divide.`
    : `What arrived in each ${bucket.noun}. ${gap}.`
}

/**
 * Which measures this post gets a card for.
 *
 * A measure earns one by having been reported — a figure, a history, or both.
 * The engagement rate is the exception at both ends: it is never carried as a
 * series and it is never drawn without the two flows it divides, so it appears
 * when its figure does and charts only when interactions and reach are there.
 */
/**
 * The overview's tiles, in the order their cards appear below.
 *
 * Anything the order doesn't name goes on the end rather than being dropped: a
 * measure this file hasn't been taught about is still a figure the platform
 * reported, and silently losing it is the one failure mode a fixed list has.
 */
function orderedMetrics(metrics: PostMetric[]): PostMetric[] {
  const known = MEASURE_ORDER.map((measure) =>
    metrics.find((m) => m.measure === measure),
  ).filter((m): m is PostMetric => m !== undefined)
  return [
    ...known,
    ...metrics.filter((m) => !MEASURE_ORDER.includes(m.measure)),
  ]
}

function chartedMeasures(view: PostPerformanceView): MeasureId[] {
  if (view.maturity === 'unpublished' || view.metrics.length === 0) return []
  return MEASURE_ORDER.filter(
    (measure) =>
      view.metrics.some((m) => m.measure === measure) ||
      view.series.some((s) => s.measure === measure),
  )
}

/**
 * The points a card draws, shaped for the reading on its switch.
 *
 * `null` means *nothing recorded how this arrived* — a state of its own, and
 * not the same as a series of zeroes.
 *
 * The rate is derived here and never carried, because a rate cannot be summed
 * into a day or accumulated into a running total; "cumulative engagement rate"
 * is the mistake `MeasureMeta.kind` exists to prevent. Divided fresh from the
 * two flows at whatever bucketing is on screen, it is honest at all three
 * readings — and it cannot drift from the reach and interactions cards, because
 * it is made out of them.
 */
function seriesFor(
  view: PostPerformanceView,
  measure: MeasureId,
  reading: PostSeriesReading,
): PostSeriesPoint[] | null {
  const { mode, interval } = readingShape(reading)
  const shape = (points: PostSeriesPoint[]) => {
    const bucketed = bucketSeries(points, interval)
    return mode === 'cumulative' ? runningTotal(bucketed) : bucketed
  }
  const raw = (id: MeasureId) => {
    const found = view.series.find((s) => s.measure === id)
    // Two points is the floor, and it is asked of the **raw** hours rather than
    // of the buckets: a four-hour-old post summed into days is one column, which
    // is a fine thing to draw and emphatically not "no history recorded".
    return found && found.points.length > 1 ? shape(found.points) : null
  }

  if (measure !== 'engagement_rate') return raw(measure)

  const interactions = raw('interactions')
  const reach = raw('reach')
  if (!interactions || !reach) return null
  // The floor is a per-bucket problem and gets a per-bucket answer. A running
  // denominator is the post's whole reach so far, so it is past anything worth
  // flooring by its second point — and zeroing its first would draw a post that
  // started at 0% and jumped, which is not a thing that happened.
  return ratioSeries(
    interactions,
    reach,
    mode === 'interval' ? rateFloor(reach) : 0,
  )
}

function peak(points: PostSeriesPoint[]): number {
  return Math.max(...points.map((p) => p.value), 0)
}

/**
 * The rank, as a finding rather than a figure.
 *
 * "1,240 impressions" is unreadable without a frame of reference; "better than
 * 88% of your posts" is legible to someone who has never opened an analytics
 * screen, and it works from week two rather than needing an industry benchmark
 * nobody has. It is an insight and not a tile because it is a claim about the
 * post as a whole rather than a measure of it — and because a claim is the one
 * beat allowed to carry a tone mark.
 *
 * Derived here rather than carried on the view, so the wording and the
 * threshold live in one place.
 */
function percentileInsight(view: PostPerformanceView): Insight | null {
  if (view.percentile === null) return null
  return {
    id: 'percentile',
    tone:
      view.percentile >= 75
        ? 'positive'
        : view.percentile <= 25
          ? 'negative'
          : 'neutral',
    text: `Better than ${view.percentile}% of your posts.`,
    basis: view.sample
      ? `Ranked on reach against ${view.sample} measured posts`
      : undefined,
  }
}

/**
 * What the figures above are still doing — the method behind them, which is why
 * it is a note and not a badge.
 *
 * This used to be a coloured dot in the header. A dot is a status mark, status
 * marks belong on claims, and "still counting" is a caveat about the data
 * rather than a finding about the post.
 */
const MATURITY_NOTE: Record<PostMaturity, string> = {
  unpublished: '',
  counting:
    'Still counting — every figure above is a floor rather than a result.',
  settling: 'Past its peak, and still adding a little.',
  final: 'This post has stopped earning — these numbers are final.',
}

/** When these numbers last moved. The last beat of every card on these surfaces. */
function Freshness({ at }: { at?: string }) {
  if (!at) return null
  return <Basis>Updated {at}</Basis>
}
