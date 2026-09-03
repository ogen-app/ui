import type { TFunction } from 'i18next'
import type {
  Insight,
  PacePlacement,
  Period,
} from '@/components/analytics/types'
import { formatCount, formatPercent } from '@/components/analytics/format'
import { checkedAt } from '@/lib/analyticsFreshness'
import { formatDate, formatNumber } from '@/lib/intl'
import type {
  AnalyticsInsight,
  PerformerRow,
  PerformerSort,
  PerformersBoard,
} from '@/types/analytics'

/**
 * `GET /api/analytics/performers` (CON-238) onto what the board draws.
 *
 * Unlike the overview card, this is **not** the design harness's model with a
 * mapper in front of it. `components/analytics/PerformersSection` was drawn
 * against a richer server than the one that shipped — it takes every post in
 * the period and ranks them itself, off a maturation curve and an absolute
 * typical per criterion — and none of those three things exist on the wire. The
 * endpoint ranks server-side and sends two ends of a list. So the board is
 * rebuilt around what the API actually answers, and the harness component stays
 * where it is, feeding the still-flagged campaign surface from fixtures.
 *
 * What that costs, and what it buys:
 *
 * - **The ranking is the server's.** `by` is a refetch, never a client-side
 *   re-sort, because the middle of the distribution is never sent. Which also
 *   means the card cannot count what it left out for lacking data — it can only
 *   count what the server chose not to send, which is a different sentence and
 *   is the one {@link buildPerformersView} produces.
 * - **Two of the harness's five criteria are gone.** `/performers` reports no
 *   saves and no follows, so `save_rate` and `follow_rate` have no numerator
 *   and are not offered; `interactions`, which the harness never had, is.
 * - **The multiplier arrives per row, already normalised.** The harness divided
 *   a figure by a workspace typical to get one. Here `against_typical` *is* the
 *   ratio, and `direction` is the server's own verdict on it — so the bar is
 *   drawn from the wire rather than from a threshold this client picked. When
 *   the platform has too little history the server sends `null` and the row
 *   carries `baseline: "insufficient_history"`; it is still ranked, on its raw
 *   metric, and the card draws no bar rather than a bar at zero.
 */

/**
 * What the board can be ranked by, in the order the picker offers them. What
 * each is called is `analytics.performers.basis.<id>` — read with
 * {@link basisLabel}.
 */
export const PERFORMER_BASES: PerformerSort[] = [
  'against_typical',
  'reach',
  'engagement_rate',
  'interactions',
]

export const DEFAULT_PERFORMER_BASIS: PerformerSort = 'against_typical'

/**
 * Which way each rule's news cuts — ours, because the wire's `severity` is a
 * loudness and says nothing about polarity. Same table, same reason, as the
 * overview's.
 *
 * Only one of the five rules is good news. That is not an omission: the
 * performers rules are observations about the *shape* of a period — that the
 * top of one ranking isn't the top of another, that a period was high-variance,
 * that one platform took the top three — and none of those is a win or a loss
 * on its own. Colouring them would put a verdict on a description.
 */
const TONE: Record<string, Insight['tone']> = {
  /** The best by rate isn't the best by reach — arithmetic, not a problem. */
  rank_divergence: 'neutral',
  /** A caveat about the sample, which is neither good nor bad news. */
  sample_size: 'neutral',
  platform_skew: 'neutral',
  spread: 'neutral',
  /** The exception: a post too young to have finished is already ahead. */
  fresh_standout: 'positive',
}

/**
 * A post carrying a real slice of the period says so; one carrying a sliver
 * does not.
 *
 * `period_share` is on every row, but "0.4% of the period" is a fact about
 * arithmetic rather than a finding. The line is there as an anomaly check — one
 * post at a fifth of the month is the difference between a good month and one
 * lucky afternoon — so it appears only when there is an anomaly to check.
 */
const SHARE_WORTH_SAYING = 0.05

export interface PerformerRowView {
  id: string
  title: string
  /** The wire slug (`linkedin`) — resolved to an icon at the point of use. */
  platform: string
  account: { name: string; avatarUrl?: string }
  /** The figure this list is ranked on, formatted for its column. */
  figure: string
  /**
   * The same figure raw, for the fallback bar's scale. `null` where there is no
   * figure in this basis' unit — see {@link rankedValue} — and the row draws no
   * bar at all rather than one at zero.
   */
  value: number | null
  /** Against the typical post on this platform at this age. */
  pace: number | null
  /** The server's verdict on that multiplier, not a threshold of ours. */
  placement: PacePlacement | null
  /** `34.8K reached`, `12.9K reached and counting`. */
  reach: string
  /** `19% of the period`, or nothing — see {@link SHARE_WORTH_SAYING}. */
  share: string | null
  /** `29 Jul 2026`. */
  published: string
  /** `13 days`. */
  age: string
}

export interface PerformersBoardView {
  period: Period
  /** Echoed by the server, so the card names what it was actually ranked on. */
  by: PerformerSort
  totalPosts: number
  /** Strongest first. */
  best: PerformerRowView[]
  /** Weakest first — `worst[0]` is the single worst post of the period. */
  worst: PerformerRowView[]
  /**
   * Posts in the window that were ranked and not sent.
   *
   * The board is two clamped ends, so with more than `2 × limit` posts the
   * middle is simply absent. A reader counting nine rows against "nine posts
   * this period" has to be told which is which.
   */
  hidden: number
  /** Rows the server could not place against a typical. */
  withoutBaseline: number
  insights: Insight[]
  lastRefreshedAt?: string
}

/** The interactions total, which the wire sends as its three parts. */
function interactions(row: PerformerRow): number {
  const { likes, comments, shares } = row.metrics
  return likes + comments + shares
}

/**
 * The number the list is ordered on, in the units of the chosen basis.
 *
 * `null` in exactly one case: the basis *is* the multiplier and this row has
 * none. The server still ranked it — on its raw metric — but there is no figure
 * to put in a column whose unit is `×`, and substituting a zero would say the
 * post earned nothing rather than that nothing can be said about it.
 */
function rankedValue(row: PerformerRow, by: PerformerSort): number | null {
  if (by === 'reach') return row.reach
  if (by === 'engagement_rate') return row.metrics.engagement_rate
  if (by === 'interactions') return interactions(row)
  return row.against_typical
}

function formatFigure(
  t: TFunction,
  value: number | null,
  by: PerformerSort,
): string {
  if (value === null) return t('analytics.units.none')
  if (by === 'engagement_rate') return formatPercent(t, value)
  if (by === 'reach' || by === 'interactions') return formatCount(t, value)
  return t('analytics.units.multiplier', {
    value: formatNumber(value, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  })
}

/**
 * The account label.
 *
 * `display_name` mirrors `username` today and the avatar is always empty —
 * enrichment from `social_accounts` is a follow-up on the server — so this
 * falls through rather than assuming either. The platform badge behind the
 * initial is what carries the row until the picture lands.
 */
function accountName(row: PerformerRow): string {
  return row.account.display_name || row.account.username || row.platform
}

/** `above` / `below` / `typical` in the vocabulary the bar is drawn in. */
function placement(row: PerformerRow): PacePlacement | null {
  if (row.against_typical === null) return null
  if (row.direction === 'above') return 'ahead'
  if (row.direction === 'below') return 'behind'
  return 'usual'
}

function readRow(
  t: TFunction,
  row: PerformerRow,
  by: PerformerSort,
): PerformerRowView {
  const value = rankedValue(row, by)
  const reach = formatCount(t, row.reach)

  return {
    id: row.post_id,
    title: row.title,
    platform: row.platform,
    account: {
      name: accountName(row),
      // Empty string is what the server sends today, and an empty `src` is a
      // request for the current page — the avatar has to see nothing at all.
      avatarUrl: row.account.avatar_url || undefined,
    },
    figure: formatFigure(t, value, by),
    value,
    pace: row.against_typical,
    placement: placement(row),
    // The caveat belongs on the number that is still moving, not on the post:
    // a post is not "still counting", its reach is.
    reach: row.reach_still_accruing
      ? t('analytics.performers.reachedCounting', { reach })
      : t('analytics.performers.reached', { reach }),
    share:
      row.period_share >= SHARE_WORTH_SAYING
        ? t('analytics.performers.periodShare', {
            share: Math.round(row.period_share * 100),
          })
        : null,
    /*
      `19 Aug 2026`. The year is carried even inside a 28-day window, because
      these lists get screenshotted and a date with no year is undateable the
      moment it leaves the screen.

      In the app's language, like everything else — the pin to `en-GB` that used
      to be here came out with the one in `format.ts`'s `formatDay`, which is
      what drew the axis this column had to agree with. They still agree; both
      now read the active locale.
    */
    published:
      formatDate(row.published_at, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) ?? '',
    age: t('analytics.units.spanDays', { count: row.age_days }),
  }
}

function readInsight(insight: AnalyticsInsight): Insight {
  return {
    id: insight.id,
    text: insight.text,
    tone: TONE[insight.id] ?? 'neutral',
    basis: insight.note,
  }
}

/** The window as the card's heading reads it — `over last 28 days`. */
function readPeriod(t: TFunction, board: PerformersBoard): Period {
  const { from, to, days } = board.window
  return {
    label: t('analytics.units.lastDays', { count: days }),
    from,
    to,
    days,
  }
}

export function buildPerformersView(
  t: TFunction,
  board: PerformersBoard,
): PerformersBoardView {
  const by = PERFORMER_BASES.includes(board.by)
    ? board.by
    : DEFAULT_PERFORMER_BASIS
  const best = board.best.map((row) => readRow(t, row, by))
  const worst = board.worst.map((row) => readRow(t, row, by))

  return {
    period: readPeriod(t, board),
    by,
    totalPosts: board.total_posts,
    best,
    worst,
    // Clamped rather than trusted: `total_posts` and the two lists are counted
    // separately server-side, and a negative "and N more" is worse than none.
    hidden: Math.max(0, board.total_posts - best.length - worst.length),
    withoutBaseline: [...best, ...worst].filter((r) => r.pace === null).length,
    insights: board.insights.map(readInsight),
    lastRefreshedAt: checkedAt(board.updated_at),
  }
}

/** What the ranked column is called, for the picker and the column head. */
export function basisLabel(t: TFunction, by: PerformerSort): string {
  return t(`analytics.performers.basis.${by}` as const)
}
