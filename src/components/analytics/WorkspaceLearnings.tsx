import {
  CalendarBlankIcon,
  ClockIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib'
import { Skeleton } from '@/components/ui/skeleton'
import { DecayCurve, SlotHeatmap } from './charts'
import { Picker } from './ComparisonBar'
import { Basis, NotYet, SectionCard } from './shell'
import { formatHours } from './format'
import {
  DAY_LABELS,
  LEARNINGS_METRICS,
  metricLabel,
  type HeatmapView,
  type LifespanView,
  type PatternView,
} from '@/lib/analyticsLearningsView'
import type { AnalyticsLearningsResult } from '@/hooks/useAnalyticsLearnings'
import type { LearningsMetric } from '@/types/analytics'

/**
 * What we've learned — the workspace's standing lessons (CON-239).
 *
 * The card that closes the trilogy, and the only one the period picker does not
 * govern. "Your posts land on Thursday evenings" is a property of how this
 * workspace works, not of the last 28 days, and a section sitting silently
 * under a date control claims otherwise — so the card is marked `all-time` and
 * says so in its own header.
 *
 * Three sections from one call, and **each withdraws on its own**: a workspace
 * can know when it posts and not yet know how long a post lives, because the
 * heatmap needs measured posts and the curve needs *settled* ones — posts that
 * have stopped earning. So `insufficient_history` is checked per section and
 * the other two carry on, which is the shape the server sends and the reason
 * this card cannot have a single empty state.
 *
 * Nothing here is graded a second time. The server enforces its own minimum
 * support and withdraws below it, so what arrives is what it was willing to
 * stand behind — the same rule the performers board follows for `direction`.
 */
export function WorkspaceLearningsView({
  result,
  metric,
  onChangeMetric,
  everyPlatform = false,
}: {
  result: AnalyticsLearningsResult
  metric: LearningsMetric
  onChangeMetric: (metric: LearningsMetric) => void
  /** Whether a platform filter is on screen that this card is not counted under. */
  everyPlatform?: boolean
}) {
  const { view, isPending, isError, isUnavailable, isEmpty } = result

  if (isPending) {
    return <Skeleton className="h-96 w-full max-w-content mx-auto" />
  }

  if (isUnavailable) {
    return (
      <Shell
        metric={metric}
        onChangeMetric={onChangeMetric}
        withPicker={false}
        everyPlatform={everyPlatform}
      >
        <NotYet title="Nothing is being measured for this workspace">
          Once measurement is connected, the hours you publish into, how long a
          post keeps earning, and what your posts have in common show up here —
          built from the posts you have already sent.
        </NotYet>
      </Shell>
    )
  }

  // Above the error branch, like the other two cards: `no_data` is a successful
  // answer with no payload, and reporting it as a failure tells a workspace
  // that has simply never published that something is broken.
  if (isEmpty) {
    return (
      <Shell
        metric={metric}
        onChangeMetric={onChangeMetric}
        withPicker={false}
        everyPlatform={everyPlatform}
      >
        <NotYet title="Nothing published yet">
          These are lessons drawn from your own posts, so they start the day you
          have some. Nothing needs setting up.
        </NotYet>
      </Shell>
    )
  }

  if (isError || !view) {
    return (
      <Shell
        metric={metric}
        onChangeMetric={onChangeMetric}
        withPicker={false}
        everyPlatform={everyPlatform}
      >
        <NotYet title="Couldn't load what we've learned">
          The workspace itself is unaffected — nothing here changes what is
          scheduled or published. Try again in a moment.
        </NotYet>
      </Shell>
    )
  }

  return (
    <Shell
      metric={metric}
      onChangeMetric={onChangeMetric}
      withPicker
      qualifier={view.historySince ?? undefined}
      everyPlatform={everyPlatform}
    >
      <Section icon={CalendarBlankIcon} title="When your posts land">
        {view.heatmap ? (
          <Slots heatmap={view.heatmap} />
        ) : (
          <NotYet title="Not enough posts to say yet">
            A grid drawn from a handful of posts looks exactly like one drawn
            from hundreds, and someone will rearrange their week around it. This
            fills in once you have published across a few different hours.
          </NotYet>
        )}
      </Section>

      <Section icon={ClockIcon} title="How long a post lives">
        {view.lifespan ? (
          <Lifespan lifespan={view.lifespan} />
        ) : (
          <NotYet title="Not enough finished posts yet">
            This needs posts that have stopped earning, which takes a few weeks
            of publishing —{' '}
            {view.settledPosts === 0
              ? 'none of yours have run their course yet'
              : `${view.settledPosts} of yours ${view.settledPosts === 1 ? 'has' : 'have'} so far`}
            .
          </NotYet>
        )}
      </Section>

      {view.patterns ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PatternColumn
            title="What works"
            note="Against your median."
            tone="positive"
            patterns={view.patterns.works}
            empty="Nothing has separated itself from the rest yet."
          />
          <PatternColumn
            title="What's fading"
            // Not "against the 90 days before last", which was the first
            // attempt and reads as a window nobody asked about. `trend` is the
            // segment's own movement across the window — its referent is the
            // stretch before it, which "change over" says without naming two.
            note={`Change over the last ${view.trendWindow}.`}
            tone="negative"
            patterns={view.patterns.fading}
            empty="Nothing has fallen off yet."
          />
        </div>
      ) : (
        <NotYet title="No habits to compare yet">
          Patterns come from splitting your posts by what they have in common —
          format, length, links, timing, platform — and each side of a split
          needs enough posts to mean anything.
        </NotYet>
      )}

      {view.lastRefreshedAt && <Basis>Updated {view.lastRefreshedAt}.</Basis>}
    </Shell>
  )
}

/**
 * The card's frame, so every withdrawal keeps the heading it withdrew from.
 *
 * `scope="all-time"` is the load-bearing prop: it prints the line saying the
 * period picker above does not reach this card, which is the difference between
 * a standing lesson and a figure for the month.
 */
function Shell({
  metric,
  onChangeMetric,
  withPicker,
  qualifier,
  everyPlatform = false,
  children,
}: {
  metric: LearningsMetric
  onChangeMetric: (metric: LearningsMetric) => void
  withPicker: boolean
  qualifier?: string
  everyPlatform?: boolean
  children: React.ReactNode
}) {
  return (
    <SectionCard
      title="What we've learned"
      scope="all-time"
      everyPlatform={everyPlatform}
      qualifier={qualifier}
      status={
        withPicker ? (
          <Picker
            label="Metric"
            value={metricLabel(metric)}
            options={LEARNINGS_METRICS.map((m) => ({
              value: m.id,
              label: m.label,
            }))}
            onChange={(v) => onChangeMetric(v as LearningsMetric)}
          />
        ) : undefined
      }
    >
      {children}
    </SectionCard>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ClockIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-tertiary-foreground" aria-hidden />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {children}
    </div>
  )
}

/**
 * The slots this workspace publishes into.
 *
 * The named slot underneath is the part that can be acted on — a heatmap alone
 * makes the reader hunt for the darkest square and guess at the hour — and it
 * carries the number of posts behind it, which is what keeps a "best time"
 * resting on two posts from reading like a finding.
 */
function Slots({ heatmap }: { heatmap: HeatmapView }) {
  const posts = `${heatmap.measuredPosts} measured ${heatmap.measuredPosts === 1 ? 'post' : 'posts'}`

  return (
    <>
      <SlotHeatmap
        grid={heatmap.grid}
        days={DAY_LABELS}
        label={
          heatmap.strongest
            ? `Median ${heatmap.metric} by hour published. Strongest slot: ${heatmap.strongest.label}, from ${heatmap.strongest.postCount} posts.`
            : `Median ${heatmap.metric} by hour published, across ${posts}.`
        }
      />

      {heatmap.strongest && (
        <p className="text-sm">
          Your strongest slot is{' '}
          <strong className="font-medium">{heatmap.strongest.label}</strong>,
          from {heatmap.strongest.postCount}{' '}
          {heatmap.strongest.postCount === 1 ? 'post' : 'posts'}.
        </p>
      )}

      {/*
        Three things, and the third is the one that matters most: the hours are
        the server's, in UTC, with no offset on the wire. A workspace three
        hours ahead reading "18:00" as its own evening would be rearranging its
        week around the wrong slot — and the offset can't be applied here,
        because an aggregate over a year of posts has no single date to apply
        it on.
      */}
      <Basis>
        From {posts}, by median {heatmap.metric}. Darker is better; a blank
        square is an hour you have never published in. Times are UTC.
      </Basis>
    </>
  )
}

/**
 * How a post matures, as a curve rather than a single half-life.
 *
 * "Half of it arrives in 19 hours" is a fact people nod at and cannot use. The
 * shape is the usable part: the distance between the first mark and the last is
 * the window in which a boost, a re-share or answering the comments still moves
 * where the post ends up. It is also the rule behind marking a young post's
 * figures as still counting on the board above, so showing it here means that
 * behaviour is explained rather than merely enforced.
 */
function Lifespan({ lifespan }: { lifespan: LifespanView }) {
  return (
    <>
      <p className="text-sm">
        Half of everything a post earns arrives in the first{' '}
        <strong className="font-medium">{lifespan.half}</strong>.
      </p>

      {lifespan.curve.length > 0 && (
        <>
          <DecayCurve
            points={lifespan.curve}
            milestones={lifespan.milestones}
            height="md"
          />
          <div className="flex justify-between text-xs text-tertiary-foreground">
            <span>Published</span>
            <span>{lifespan.horizon} later</span>
          </div>
        </>
      )}

      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {lifespan.milestones.map((m) => (
          <li key={m.share} className="flex items-baseline gap-1.5 text-xs">
            <span className="font-medium tabular-nums">
              {Math.round(m.share * 100)}%
            </span>
            <span className="text-secondary-foreground">
              by {formatHours(m.hour)}
            </span>
          </li>
        ))}
      </ul>

      <Basis>
        From {lifespan.settledPosts} posts that have run their course. Always
        reach, whichever metric the card is set to — the curve is the shape of a
        post's own reach over time, as a share of what it finally earned.
      </Basis>
    </>
  )
}

function PatternColumn({
  title,
  note,
  tone,
  patterns,
  empty,
}: {
  title: string
  /** What the figures are measured against — said once, not on every card. */
  note: string
  tone: 'positive' | 'negative'
  patterns: PatternView[]
  empty: string
}) {
  const Icon = tone === 'positive' ? TrendUpIcon : TrendDownIcon

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'size-4',
              tone === 'positive' ? 'text-positive' : 'text-negative',
            )}
            aria-hidden
          />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <p className="text-xs text-tertiary-foreground">{note}</p>
      </div>

      {patterns.length === 0 ? (
        <p className="text-xs text-secondary-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {patterns.map((pattern) => (
            <li key={pattern.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">{pattern.headline}</span>
                {/* The one mark on the card, and it is a delta — which is where
                    the shell's contract allows a colour. The prose beside it
                    narrates the same number; this is the version you can scan a
                    column of. */}
                {pattern.figure && (
                  <span
                    className={cn(
                      'shrink-0 text-sm font-medium tabular-nums',
                      tone === 'positive' ? 'text-positive' : 'text-negative',
                    )}
                  >
                    {pattern.figure}
                  </span>
                )}
              </div>
              <span className="text-xs text-secondary-foreground">
                {pattern.detail}
              </span>
              {/* The metric is on the card rather than in the header because
                  the miner picks it per segment — a card can be about saves on
                  a board set to reach. */}
              <Basis>
                {pattern.support} · {pattern.metric}
              </Basis>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
