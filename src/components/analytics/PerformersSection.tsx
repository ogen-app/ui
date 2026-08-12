import { useState } from 'react'
import { cn } from '@/lib'
import { PaceBar } from './charts'
import { InsightLine } from './ComparisonSections'
import { Basis, FigureGrid, FigureTile, NotYet, SectionCard } from './shell'
import { formatMeasure, measureMeta } from './format'
import type { MeasureId, PacePlacement, PerformersView, RankedPost } from './types'

/**
 * Performers and outliers — both ends of the period, age-corrected.
 *
 * The section exists because the headline provokes exactly one question —
 * *which posts did this?* — and answering it naively produces a list sorted by
 * age. A post published this morning has earned a fraction of what it will;
 * one from three weeks ago has finished. Rank them together and the top of the
 * list is simply the oldest posts. Exclude the young ones and the section can
 * say nothing about the work done this week, which is the week people are
 * actually asking about.
 *
 * So nothing here is compared raw. Every post is read against this workspace's
 * own maturation curve first (see `RankedPost`), which yields two independent
 * answers, and the section is built around keeping them apart:
 *
 * - **Where it lands** — the projection. Ranks the list, so "most impactful"
 *   still means impact rather than seniority.
 * - **Against typical at the same age** — the pace. Decides which band a post
 *   falls in, and it needs no projection to be fair.
 *
 * The bands are the key figures, which is what makes this one card instead of
 * a "top posts" card and a separate "underperformers" card: the interesting
 * reading is usually the *shape* — three posts carrying a third of the period
 * and seven doing nothing is a different month from ten ordinary ones, and the
 * counts say that before any row is read.
 */
export function PerformersSection({ view }: { view: PerformersView }) {
  const meta = measureMeta(view.measure)
  const [picked, setPicked] = useState<BandId | null>(null)

  if (view.posts.length === 0) {
    return (
      <SectionCard title="Performers and outliers" scope="lens">
        <NotYet title="Nothing published in this period">
          Once posts go out, the ones carrying the period — and the ones falling
          behind what you normally do — show up here.
        </NotYet>
      </SectionCard>
    )
  }

  // No curve, no correction, so no bands: with nothing to say what a typical
  // post had earned by this age, "ahead of usual" has no *usual* in it. The
  // card degrades to one ranked list and says why, rather than placing posts
  // against a curve built from four of them.
  if (!view.curve) {
    const posts = [...view.posts].sort((a, b) => b.value - a.value)
    return (
      <SectionCard
        title="Performers and outliers"
        scope="lens"
        status={
          <span className="text-xs text-secondary-foreground">By {meta.label.toLowerCase()}</span>
        }
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Ranked by {meta.label.toLowerCase()} so far</h3>
          <ul className="flex flex-col">
            <Header measure={meta.label} paced={false} />
            {posts.map((post) => (
              <PostRow key={post.id} post={post} measure={view.measure} paced={false} />
            ))}
          </ul>
          <Basis className="text-[13px] text-foreground">
            These are raw figures, ranked as they stand. Not enough of your posts
            have finished earning for us to know how yours mature, so a post from
            this morning is being listed beside one from three weeks ago with no
            correction — read the dates before you read the order.
          </Basis>
        </div>

        {view.insight && <InsightLine insight={view.insight} />}

        <Basis confidence="low">
          Age correction switches on once around fifteen of your posts have
          settled. Until then nothing here is comparable across ages, and nothing
          is called ahead or behind.
        </Basis>
      </SectionCard>
    )
  }

  const curve = view.curve

  const bands = BANDS.map((band) => {
    const posts = view.posts
      .filter((p) => (band.id === 'early' ? p.placement === null : p.placement === band.id))
      // By where it lands, not by what has arrived: sorting a projection list
      // on the raw figure would put the age back in through the side door.
      .sort((a, b) => (b.projected ?? b.value) - (a.projected ?? a.value))
    return {
      ...band,
      posts,
      share: posts.reduce((sum, p) => sum + p.share, 0),
    }
  })

  // Falls back to the first band that has anything rather than showing an empty
  // list: which bands are populated changes with the period, and a card that
  // empties itself because of that is worse than one that picks up the slack.
  const selected =
    bands.find((b) => b.id === picked && b.posts.length > 0) ??
    bands.find((b) => b.posts.length > 0) ??
    bands[0]

  return (
    <SectionCard
      title="Performers and outliers"
      scope="lens"
      status={
        <span className="text-xs text-secondary-foreground">
          By {meta.label.toLowerCase()}, corrected for age
        </span>
      }
    >
      <FigureGrid>
        {bands.map((band) => (
          <FigureTile
            key={band.id}
            selected={band.id === selected.id}
            onSelect={band.posts.length > 0 ? () => setPicked(band.id) : undefined}
          >
            <span className="truncate text-xs text-secondary-foreground">{band.label}</span>
            <span
              className={cn(
                'font-display text-2xl font-medium leading-none',
                band.posts.length === 0 && 'text-tertiary-foreground',
              )}
            >
              {band.posts.length}
            </span>
            <span className="text-xs text-tertiary-foreground">
              {band.posts.length === 0
                ? 'none'
                : `${Math.round(band.share * 100)}% of the period`}
            </span>
          </FigureTile>
        ))}
      </FigureGrid>

      <div className="mt-2 flex flex-col gap-2">
        <h3 className="text-sm font-medium">{selected.heading(meta.label.toLowerCase())}</h3>

        <ul className="flex flex-col">
          <Header measure={meta.label} paced />
          {selected.posts.map((post) => (
            <PostRow key={post.id} post={post} measure={view.measure} paced />
          ))}
        </ul>

        {/*
          The sentence the correction is for. Everything above it is only
          defensible if the reader knows the figures have been age-adjusted, so
          this is set in the primary colour a step above the supporting text —
          not tucked into a footnote where the honest version reads as a caveat.
        */}
        <Basis className="text-[13px] text-foreground">
          {selected.explain(selected.posts.length, curve.floor)}
        </Basis>
      </div>

      {view.insight && <InsightLine insight={view.insight} />}

      <Basis confidence={curve.confidence}>
        Corrected against how {curve.sample} finished posts of yours matured —
        your own curve, not an industry average. Posts under {curve.floor} old
        aren't placed at all: nothing has landed yet to correct. Posts published
        before this period keep earning inside it, which is why the shares here
        don't add up to the whole.
      </Basis>
    </SectionCard>
  )
}

type BandId = PacePlacement | 'early'

/**
 * The four readings a post can get, in the order someone scans them: the ones
 * that beat expectation, the ones that met it, the ones that missed, and the
 * ones it is too early to say anything about.
 *
 * "Too early to say" is a band rather than a footnote on purpose. It is where
 * everything published in the last day or two lives, which is precisely what a
 * founder opening this screen wants to look at — showing the count and then
 * refusing to rank them is honest; hiding them is how a screen loses trust.
 */
const BANDS: {
  id: BandId
  label: string
  heading: (measure: string) => string
  explain: (count: number, floor: string | null) => string
}[] = [
  {
    id: 'ahead',
    label: 'Ahead of usual',
    heading: () => 'Ahead of usual, biggest first',
    explain: (n) =>
      `${n === 1 ? 'This post has' : `These ${n} have`} earned more by this point than a typical post of yours had at the same age. Ranked by where each one lands once it finishes, so a post from this morning and one from three weeks ago can honestly sit in the same list.`,
  },
  {
    id: 'usual',
    label: 'About usual',
    heading: () => 'About usual, biggest first',
    explain: (n) =>
      `${n === 1 ? 'This post is' : `These ${n} are`} tracking where your posts normally are by this age. Nothing to explain — this is the shape a normal period has.`,
  },
  {
    id: 'behind',
    label: 'Behind usual',
    heading: () => 'Behind usual, biggest first',
    explain: (n) =>
      `${n === 1 ? 'This post has' : `These ${n} have`} earned less by this point than a typical post of yours had at the same age. The ones not yet settled can still move, which is the window in which a re-share or a reply changes where they land.`,
  },
  {
    id: 'early',
    label: 'Too early to say',
    heading: (measure) => `Too early to place — ${measure} so far`,
    explain: (n, floor) =>
      `${n === 1 ? 'One post is' : `${n} posts are`} younger than ${floor ?? 'the correction can carry'}, so almost nothing has landed and correcting for that would amplify noise into a verdict. What they have earned so far is real; where they land is not knowable yet.`,
  },
]

/**
 * `paced` is off when there is no curve, and it takes the whole "vs typical"
 * column with it. A column of dashes is worse than no column: it reads as data
 * we failed to fetch rather than a comparison that doesn't exist yet.
 */
function Header({ measure, paced }: { measure: string; paced: boolean }) {
  return (
    <li className="flex items-center gap-3 border-b border-border pb-1.5 text-xs text-tertiary-foreground">
      <span className="flex-1">Post</span>
      <span className="w-20 text-right">{measure} so far</span>
      <span className="w-24 text-right">Where it lands</span>
      {paced && <span className="w-16 text-right">vs typical</span>}
    </li>
  )
}

function PostRow({
  post,
  measure,
  paced,
}: {
  post: RankedPost
  measure: MeasureId
  paced: boolean
}) {
  return (
    <li className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <button
          type="button"
          className="min-w-0 truncate text-left text-sm hover:underline underline-offset-2"
        >
          {post.title}
        </button>
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-xs text-tertiary-foreground">
            {post.sleeve.label} · {post.age}
            {/* The anomaly check, per row. One post at a quarter of a period is
                a different month from four at six percent each, and no total
                above can tell those two apart. */}
            {post.share >= 0.05 && ` · ${Math.round(post.share * 100)}% of the period`}
          </span>
          {/*
            Fixed width and pinned to the right of the column, so every bar in
            the list shares one centre line. A diverging bar whose zero moves
            from row to row is just a bar.
          */}
          {post.placement && post.pace !== null && (
            <PaceBar pace={post.pace} placement={post.placement} className="w-40 shrink-0" />
          )}
        </div>
      </div>

      <span className="w-20 text-right text-sm tabular-nums">
        {formatMeasure(measure, post.value)}
      </span>

      {/*
        Settled is checked before unplaced, because a post can be unplaced for
        two different reasons — too young to correct, or no curve to correct
        against — and calling a three-week-old post "too early" because the
        workspace has no curve yet would be the wrong answer to the right test.
      */}
      <span className="w-24 text-right">
        {post.matured >= 1 ? (
          <span className="text-xs text-tertiary-foreground">settled</span>
        ) : post.placement === null || post.projected === null ? (
          <span className="text-xs text-tertiary-foreground">too early</span>
        ) : (
          <>
            <span className="block text-sm tabular-nums">
              ≈{formatMeasure(measure, post.projected)}
            </span>
            <span className="block text-xs text-tertiary-foreground">
              {Math.round(post.matured * 100)}% in
            </span>
          </>
        )}
      </span>

      {paced && (
        <span className="w-16 text-right text-sm tabular-nums">
          {post.pace === null ? (
            <span className="text-xs text-tertiary-foreground">—</span>
          ) : (
            <span
              className={cn(
                post.placement === 'ahead'
                  ? 'text-positive'
                  : post.placement === 'behind'
                    ? 'text-negative'
                    : 'text-secondary-foreground',
              )}
            >
              {post.pace.toFixed(1)}×
            </span>
          )}
        </span>
      )}
    </li>
  )
}
