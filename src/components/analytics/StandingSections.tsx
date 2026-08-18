import { CalendarBlankIcon, ClockIcon, TrendDownIcon, TrendUpIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { DecayCurve, Heatmap } from './charts'
import { Basis, NotYet, SectionCard } from './shell'
import { formatCount, formatHours, supports } from './format'
import type {
  NextView,
  Pacing,
  Pattern,
  PatternsView,
  ShelfLife,
  Urgency,
} from './types'

/* ------------------------------------------------------------- patterns -- */

/**
 * What we have learned, full stop.
 *
 * The section that makes "Performance" the wrong name for this screen. None of
 * it belongs to a date range: a shelf life of nineteen hours is a property of
 * the content, not of March, and putting it under a window control would imply
 * that changing the window changes the answer. It is marked `all-time` so the
 * lens above visibly does not reach it.
 *
 * Everything here is sample-gated. A best-time grid drawn from nine posts is
 * indistinguishable from one drawn from nine hundred, and someone will
 * rearrange their week around it.
 */
export function PatternsSection({ view }: { view: PatternsView }) {
  const timingReady = view.bestTimes && supports(view.bestTimes.sample, 'timing')

  return (
    <SectionCard title="What we've learned" scope="all-time">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CalendarBlankIcon className="size-4 text-tertiary-foreground" aria-hidden />
          <h3 className="text-sm font-medium">When your posts land</h3>
        </div>
        {timingReady && view.bestTimes ? (
          <>
            <Heatmap grid={view.bestTimes.grid} />
            {/*
              The conclusion the grid exists to support. A heatmap on its own
              makes the reader hunt for the darkest square and guess at the
              hour; naming the slot — with the number of posts behind it —
              is the part they can act on, and the part that keeps a "best
              time" resting on one post from reading like a finding.
            */}
            {view.bestTimes.best && (
              <p className="text-sm">
                Your strongest slot is{' '}
                <strong className="font-medium">
                  {slotLabel(view.bestTimes.best.day, view.bestTimes.best.hour)}
                </strong>
                , from {view.bestTimes.best.sample}{' '}
                {view.bestTimes.best.sample === 1 ? 'post' : 'posts'}.
              </p>
            )}
            <Basis>
              From {view.bestTimes.sample} measured posts across every hour you have
              published in. Darker is better.
            </Basis>
          </>
        ) : (
          <NotYet title="Not enough posts to say yet">
            This needs around thirty measured posts spread across different hours.
            {view.bestTimes && ` You have ${view.bestTimes.sample}.`} Until then any
            grid would be a coin toss wearing a chart's clothes.
          </NotYet>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4 text-tertiary-foreground" aria-hidden />
          <h3 className="text-sm font-medium">How long a post lives</h3>
        </div>
        {view.shelfLife && supports(view.shelfLife.sample, 'pattern') ? (
          <MaturityCurve shelfLife={view.shelfLife} />
        ) : (
          <NotYet title="Not enough finished posts yet">
            A shelf life needs posts that have stopped earning, which takes a few
            weeks of publishing.
          </NotYet>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PatternColumn
          title="What works"
          tone="positive"
          patterns={view.winners}
          empty="Nothing has separated itself from the rest yet."
        />
        <PatternColumn
          title="What's fading"
          tone="negative"
          patterns={view.fading}
          empty="Nothing has fallen off yet."
        />
      </div>
    </SectionCard>
  )
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** `Thursday 18:00` — a slot named the way someone would say it out loud. */
function slotLabel(day: number, hour: number): string {
  return `${DAY_NAMES[day] ?? ''} ${String(hour).padStart(2, '0')}:00`
}

/**
 * How a post matures, as a curve rather than a single half-life.
 *
 * "Half of it arrives in 19 hours" is a fact people nod at and cannot use. The
 * shape is the usable part: the distance between 50% and 95% is the window in
 * which a boost, a re-share or answering the comments still changes where the
 * post ends up, and after it nothing anyone does moves the number. It is also
 * the rule behind marking a young post's figures as still counting, so showing
 * it here means that behaviour is explained rather than merely enforced.
 */
function MaturityCurve({ shelfLife }: { shelfLife: ShelfLife }) {
  const last = shelfLife.curve[shelfLife.curve.length - 1]
  const half = shelfLife.milestones.find((m) => m.share === 0.5)

  return (
    <>
      {half && (
        <p className="text-sm">
          Half of everything a post earns arrives in the first{' '}
          <strong className="font-medium">{formatHours(half.hour)}</strong>.
        </p>
      )}

      <DecayCurve
        points={shelfLife.curve}
        milestones={shelfLife.milestones}
        height="md"
      />

      <div className="flex justify-between text-xs text-tertiary-foreground">
        <span>Published</span>
        <span>{last ? formatHours(last.hour) : ''} later</span>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {shelfLife.milestones.map((m) => (
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
        From {shelfLife.sample} posts that have run their course. The gap between
        the first and last mark is your window to act on a post — after it, its
        number is settled. It is also why a post younger than a day is shown as
        still counting rather than ranked.
      </Basis>
    </>
  )
}

function PatternColumn({
  title,
  tone,
  patterns,
  empty,
}: {
  title: string
  tone: 'positive' | 'negative'
  patterns: Pattern[]
  empty: string
}) {
  const Icon = tone === 'positive' ? TrendUpIcon : TrendDownIcon
  return (
    <div className="flex flex-col gap-2">
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
      {patterns.length === 0 ? (
        <p className="text-xs text-secondary-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {patterns.map((p) => (
            <li key={p.id} className="flex flex-col gap-0.5">
              <span className="text-sm">{p.title}</span>
              <span className="text-xs text-secondary-foreground">{p.detail}</span>
              {/* How far to trust it, in words rather than a coloured mark. The
                  dot that used to sit here graded the sample it was printed
                  beside, and a colour is a verdict — this is a note. */}
              <Basis>
                {p.sample} posts
                {p.confidence === 'low' && ' — too few to lean on'}
              </Basis>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- next -- */

/**
 * Where this is heading, and what to do about it.
 *
 * Also outside the lens, for the opposite reason to Patterns: it is about a
 * period that hasn't happened. The action list is the only thing on any of
 * these surfaces that leads back out into the product — analytics that only
 * leads to more analytics is a dead end, so every row names the place the work
 * would be done.
 */
export function NextSection({ view }: { view: NextView }) {
  return (
    <SectionCard title="What's next" scope="ahead">
      {view.pacing && <PacingBlock pacing={view.pacing} />}

      {view.actions.length === 0 ? (
        <NotYet title="Nothing needs you right now">
          When a slot goes unused, a post outruns its usual, or an account goes
          quiet, it shows up here.
        </NotYet>
      ) : (
        <ul className="flex flex-col">
          {view.actions.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 border-b border-border py-3 last:border-0"
            >
              <UrgencyDot urgency={a.urgency} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm">{a.title}</span>
                <span className="text-xs text-secondary-foreground">{a.detail}</span>
              </div>
              <button
                type="button"
                className="shrink-0 text-xs font-medium underline underline-offset-2"
              >
                {a.target}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

/**
 * Plan against reality.
 *
 * An evergreen campaign gets a rate and nothing else. Projecting a total for
 * it would mean inventing a finish line the user never set, and the number
 * would look exactly as authoritative as a real one.
 */
function PacingBlock({ pacing }: { pacing: Pacing }) {
  const fraction = pacing.planned === 0 ? 0 : Math.min(1, pacing.published / pacing.planned)
  const behind = pacing.published < pacing.planned

  return (
    <div className="flex flex-col gap-2 rounded-md bg-secondary px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium">
          {pacing.published} of {pacing.planned} posts {pacing.periodLabel}
        </span>
        <span
          className={cn(
            'text-xs',
            behind ? 'text-warning' : 'text-positive',
          )}
        >
          {behind ? 'Behind the plan' : 'On plan'}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-quaternary">
        <div
          className={cn('h-full rounded-full', behind ? 'bg-warning' : 'bg-positive')}
          style={{ width: `${Math.max(2, fraction * 100)}%` }}
        />
      </div>

      {pacing.kind === 'bounded' && pacing.projected !== undefined ? (
        <Basis>
          At this rate this campaign finishes on {pacing.endsOn} with about{' '}
          {formatCount(pacing.projected)} posts
          {pacing.target !== undefined && ` against a plan of ${formatCount(pacing.target)}`}
          .
        </Basis>
      ) : (
        <Basis>
          This campaign runs on until you stop it, so this is a rate rather than a
          finish line.
        </Basis>
      )}
    </div>
  )
}

function UrgencyDot({ urgency }: { urgency: Urgency }) {
  return (
    <span
      className={cn(
        'mt-1.5 size-1.5 shrink-0 rounded-full',
        urgency === 'now'
          ? 'bg-attention'
          : urgency === 'soon'
            ? 'bg-warning'
            : 'bg-quinary-foreground',
      )}
      aria-hidden
    />
  )
}
