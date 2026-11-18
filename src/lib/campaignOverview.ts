import type { AttentionItem, FixTarget } from '@/lib/campaignReadiness'
import { postGoalTotal } from '@/lib/postGoal'
import type { PlatformView } from '@/lib/platformDictionary'
import type { CalendarFinding } from '@/types/assistant'
import type { Campaign, CampaignPhaseWindow } from '@/types/campaigns'
import type { PostStatus, PostSummary } from '@/types/posts'

/**
 * Everything the campaign Overview shows, worked out from what the campaign
 * already is — no fetching, no clock read, no words. The route feeds it from
 * its queries and `new Date()`; the design harness feeds it fixtures and a
 * pinned day. Both render the same `CampaignOverview` from what this returns,
 * so the stage logic a reviewer sees in the harness is the logic that ships.
 *
 * The screen is one question asked at different times — *where are we, and
 * what wants me* — so the answer is organised by **stage**, which a campaign
 * doesn't store (CON-156 removed `status`) and this derives from its dates.
 */

export type OverviewStage =
  /** No dates yet: the screen is a setup card and nothing else. */
  | 'new'
  /** Dated, and the start day is still ahead. */
  | 'planning'
  /** The first days after the start. */
  | 'launched'
  | 'running'
  /** The last days before the end. */
  | 'closing'
  /** The end day has passed. */
  | 'ended'

/** Days the `launched` stage lasts at most — a third of a short campaign. */
const LAUNCH_DAYS = 7
/** Days the `closing` stage lasts at most — a third of a short campaign. */
const CLOSING_DAYS = 14
/** How many days the planning stage's coverage strip draws. */
const COVERAGE_DAYS = 14

/** The slice of a post the Overview reads: a summary, and a title when known. */
export type OverviewPost = PostSummary & { title?: string }

/** A campaign's figures for one stretch of time, from the analytics read. */
export type OverviewPerformanceInput = {
  reach: number
  interactions: number
  /** The post that did best in the stretch; `platformId` is the row's sqid. */
  best: {
    postId: string
    title: string
    platformId: string
    reach: number
  } | null
}

/** The same figures, with the best post's platform resolved for drawing. */
export type OverviewPerformance = Omit<OverviewPerformanceInput, 'best'> & {
  best: {
    postId: string
    title: string
    platform: OverviewPlatform
    reach: number
  } | null
}

export type OverviewInput = {
  campaign: Campaign
  /** Null while neither the posts nor the summaries have answered. */
  posts: OverviewPost[] | null
  platformViews: PlatformView[]
  /** The phase windows (`GET …/phases`); null while unread or failed. */
  phases: CampaignPhaseWindow[] | null
  /** The client's rules, `attentionItems` narrowed by `withoutServerChecked`. */
  attention: AttentionItem[]
  /** The server's calendar problems; null when unread or failed. */
  problems: { problems: CalendarFinding[]; dismissed: CalendarFinding[] } | null
  /** The last seven days' figures; null where analytics is off or empty. */
  lastWeek: OverviewPerformanceInput | null
  /** The whole campaign's figures, for an ended campaign. */
  total: OverviewPerformanceInput | null
  now: Date
}

/** A post's platform as the screen draws it: the network, not the row. */
export type OverviewPlatform = { id: string; zernioId: string | null }

export type OverviewPostRow = {
  id: string
  title: string | null
  platform: OverviewPlatform
  status: PostStatus
  /** The publish time, or when it went out. */
  at: string
  /** The user publishes this one by hand. */
  manual: boolean
}

/** One day of a week list: its date and what is on it. */
export type OverviewDay = { date: Date; posts: OverviewPostRow[] }

export type OverviewPhase = {
  name: string
  start: Date
  end: Date
  current: boolean
  /** 1-based, while it is the current phase; null otherwise. */
  day: number | null
  days: number
}

/** The band across the top: where the campaign is in its own time. */
export type OverviewBand = {
  start: Date
  end: Date
  /** 1-based, clamped to the window. 0 before the start. */
  day: number
  days: number
  /** Before the start: days until it. */
  startsIn: number | null
  /** After the end: days since it. */
  endedAgo: number | null
  /** 0…1 — where today's marker sits on the timeline. */
  todayAt: number
  phases: OverviewPhase[]
  published: number
  /** Scheduled, by Ogen or to publish by hand. */
  scheduled: number
  /** The goal over the whole campaign; null when none is set. */
  goal: number | null
  /** Posts a week — see `overviewPace`. */
  pace: OverviewPace | null
  /**
   * What the bar shows with no goal: published in the last `RECENT_DAYS`
   * against scheduled for the next `RECENT_DAYS`.
   */
  recent: { published: number; scheduled: number }
}

/** The no-goal bar's reach either side of today. */
export const RECENT_DAYS = 30

/**
 * How fast the campaign goes out: published posts a week once it has
 * started, or, before it, what is scheduled a week over the days it covers.
 */
export type OverviewPace = { perWeek: number; planned: boolean }

/** One row of the right column. */
export type NeedsRow = {
  id: string
  /** ● broken now · ▲ wrong soon · □ waiting on a person, no clock. */
  mark: 'broken' | 'risk' | 'todo'
  /**
   * Already worded — the client rules' labels or the server's message — or a
   * stage's own to-do, which the screen words from `todo`.
   */
  label: string | null
  todo: StageTodo | null
  /** "+3 like this" — a server problem standing for its siblings. */
  more: number
  /**
   * The idea a same-idea problem's posts all came from (CON-495), worded by
   * the screen under the label. Server problems only.
   */
  idea?: string
  action: NeedsAction | null
  /** A server problem's key, for IGNORE in its menu. */
  ignoreKey: string | null
  /** The server's other fixes, offered in the row's menu. */
  alternatives: { label: string; action: NeedsAction }[]
}

/**
 * What a row's action does. Data, not a callback: the screen decides how each
 * kind is carried out, so the harness can render the same rows inert.
 */
export type NeedsAction =
  /** `label` is a client rule's own; a stage's to-do is worded on screen. */
  | { kind: 'section'; target: OverviewTarget; label?: string }
  | { kind: 'post'; postId: string; label: string }
  /** Asked of the campaign's assistant as `<fix>: <problem>`. */
  | { kind: 'ask'; fix: string; problem: string }
  | { kind: 'add-post' }

/** Where a row can send the user. Archive lives on the campaign's Settings. */
export type OverviewTarget = FixTarget | 'calendar' | 'settings'

/** The to-dos a stage adds of its own, beside the rules and the problems. */
export type StageTodo =
  | { kind: 'first-post' }
  | { kind: 'coverage-gaps'; days: number }
  | { kind: 'read-results' }
  | { kind: 'archive' }

export type SetupStep = {
  id: 'strategy' | 'channels' | 'posts'
  done: boolean
}

export type OverviewModel = {
  stage: OverviewStage
  /** Null for a `new` campaign, which has no time to place it in. */
  band: OverviewBand | null
  /** `new` only: the three things that make a campaign. */
  setup: SetupStep[] | null
  /**
   * The left column's list of days: this week while it runs, the first week
   * while it is being planned, nothing once it has ended.
   */
  week: { kind: 'this' | 'first'; days: OverviewDay[] } | null
  /** Planning only: whether each of the first days has a post. */
  coverage: { date: Date; posts: number; publishing: boolean }[] | null
  /** Published in the last seven days, with the analytics figures if any. */
  lastWeek: {
    published: number
    performance: OverviewPerformance | null
  } | null
  /** Ended only: what the campaign came to. */
  results: {
    published: number
    failed: number
    neverPublished: number
    goal: number | null
    performance: OverviewPerformance | null
  } | null
  /** The right column's title: what this stage asks of the user. */
  needsTitle: 'needsYou' | 'beforeLaunch' | 'wrapUp'
  needs: NeedsRow[] | null
  /** The server problems the user ignored, for "N ignored · SHOW". */
  ignored: CalendarFinding[]
}

const DAY_MS = 86_400_000

/** A `YYYY-MM-DD…` value as that day's local midnight. */
function dayOf(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

/** Whole calendar days from `a` to `b`, DST-proof. */
function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / DAY_MS)
}

/** Monday of the week `date` falls in. */
function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  return addDays(d, -((d.getDay() + 6) % 7))
}

const SCHEDULED: PostStatus[] = ['scheduled', 'scheduled_for_manual_publishing']

/** When a post is on the calendar: when it went out, else when it is due. */
function whenOf(post: OverviewPost): string | null {
  return post.status === 'published'
    ? (post.published_at ?? post.scheduled_at)
    : post.scheduled_at
}

/**
 * Which stage the campaign is in on `now`. Exported for the tests and for
 * anything else that wants to speak about a campaign by its stage — the
 * Campaigns list's cards would be the next.
 */
export function overviewStage(campaign: Campaign, now: Date): OverviewStage {
  if (!campaign.start_date || !campaign.end_date) return 'new'
  const start = dayOf(campaign.start_date)
  const end = dayOf(campaign.end_date)
  const today = startOfDay(now)
  if (today < start) return 'planning'
  if (today > end) return 'ended'
  const days = daysBetween(start, end) + 1
  const day = daysBetween(start, today) + 1
  const left = days - day
  // A third each at most, so a ten-day campaign still has a middle.
  if (left < Math.min(CLOSING_DAYS, Math.floor(days / 3))) return 'closing'
  if (day <= Math.min(LAUNCH_DAYS, Math.floor(days / 3))) return 'launched'
  return 'running'
}

/**
 * Posts a week. Once started: published over the days gone, never fewer than
 * a week's, so day 2 doesn't read as a rate. Before the start: scheduled over
 * the days from the start to the last scheduled post. Null with nothing to
 * measure — before the start with nothing scheduled, or in the first week
 * with nothing published.
 */
export function overviewPace(input: {
  published: number
  scheduled: number
  /** Days since the start, today included; null before the start. */
  elapsedDays: number | null
  /** Days from the start to the last scheduled post, both included. */
  plannedDays: number
}): OverviewPace | null {
  const { published, scheduled, elapsedDays, plannedDays } = input
  if (elapsedDays == null) {
    if (scheduled === 0) return null
    return {
      perWeek: (scheduled * 7) / Math.max(7, plannedDays),
      planned: true,
    }
  }
  if (published === 0 && elapsedDays < 7) return null
  return { perWeek: (published * 7) / Math.max(7, elapsedDays), planned: false }
}

export function overviewModel(input: OverviewInput): OverviewModel {
  const { campaign, posts, now } = input
  const stage = overviewStage(campaign, now)
  const zernioOf = platformLookup(input.platformViews)
  const row = (post: OverviewPost): OverviewPostRow => ({
    id: post.id,
    title: post.title?.trim() || null,
    platform: { id: post.platform_id, zernioId: zernioOf(post.platform_id) },
    status: post.status,
    at: whenOf(post) ?? '',
    manual: post.status === 'scheduled_for_manual_publishing',
  })
  const ignored = input.problems?.dismissed ?? []
  const figures = (
    p: OverviewPerformanceInput | null,
  ): OverviewPerformance | null =>
    p && {
      ...p,
      best: p.best && {
        postId: p.best.postId,
        title: p.best.title,
        reach: p.best.reach,
        platform: {
          id: p.best.platformId,
          zernioId: zernioOf(p.best.platformId),
        },
      },
    }

  if (stage === 'new') {
    const connected = campaign.target_platforms.some(
      (tp) =>
        (input.platformViews.find((v) => v.platform.id === tp.id)
          ?.connectedPublishers.length ?? 0) > 0,
    )
    return {
      stage,
      band: null,
      setup: [
        {
          id: 'strategy',
          done:
            Boolean(campaign.start_date && campaign.end_date) &&
            (campaign.estimated_post_count ?? 0) > 0,
        },
        { id: 'channels', done: connected },
        { id: 'posts', done: (posts?.length ?? 0) > 0 },
      ],
      week: null,
      coverage: null,
      lastWeek: null,
      results: null,
      needsTitle: 'needsYou',
      needs: null,
      ignored,
    }
  }

  const start = dayOf(campaign.start_date!)
  const end = dayOf(campaign.end_date!)
  const today = startOfDay(now)
  const days = daysBetween(start, end) + 1
  const sinceStart = daysBetween(start, today)
  const all = posts ?? []

  const published = all.filter((p) => p.status === 'published').length
  const scheduled = all.filter((p) => SCHEDULED.includes(p.status)).length
  const goal = postGoalTotal(
    campaign.estimated_post_count,
    campaign.goal_cadence,
    campaign.start_date,
    campaign.end_date,
  )
  const lastScheduled = all
    .filter((p) => SCHEDULED.includes(p.status) && p.scheduled_at)
    .reduce<Date>((last, p) => {
      const at = startOfDay(new Date(p.scheduled_at!))
      return at > last ? at : last
    }, start)
  const recentFrom = now.getTime() - RECENT_DAYS * DAY_MS
  const recentTo = now.getTime() + RECENT_DAYS * DAY_MS
  const recent = {
    published: all.filter(
      (p) =>
        p.status === 'published' && Date.parse(whenOf(p) ?? '') >= recentFrom,
    ).length,
    scheduled: all.filter(
      (p) =>
        SCHEDULED.includes(p.status) &&
        Date.parse(p.scheduled_at ?? '') <= recentTo,
    ).length,
  }
  const band: OverviewBand = {
    start,
    end,
    day: Math.max(0, Math.min(days, sinceStart + 1)),
    days,
    startsIn: sinceStart < 0 ? -sinceStart : null,
    endedAgo: today > end ? daysBetween(end, today) : null,
    todayAt: Math.max(0, Math.min(1, (sinceStart + 0.5) / days)),
    phases: (input.phases ?? [])
      .filter((p) => p.start_date && p.end_date)
      .map((p) => {
        const ps = dayOf(p.start_date!)
        const pe = dayOf(p.end_date!)
        const current = today >= ps && today <= pe
        return {
          name: p.name,
          start: ps,
          end: pe,
          current,
          day: current ? daysBetween(ps, today) + 1 : null,
          days: daysBetween(ps, pe) + 1,
        }
      }),
    published,
    scheduled,
    goal: goal.kind === 'ok' ? goal.total : null,
    pace: overviewPace({
      published,
      scheduled,
      elapsedDays: sinceStart < 0 ? null : Math.min(days, sinceStart + 1),
      plannedDays: daysBetween(start, lastScheduled) + 1,
    }),
    recent,
  }

  const weekFrom = (from: Date): OverviewDay[] =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(from, i)
      return {
        date,
        posts: all
          .filter((p) => {
            const at = whenOf(p)
            return at != null && daysBetween(date, new Date(at)) === 0
          })
          .sort((a, b) => (whenOf(a) ?? '').localeCompare(whenOf(b) ?? ''))
          .map(row),
      }
    })

  const sevenDaysAgo = now.getTime() - 7 * DAY_MS
  const publishedLastWeek = all.filter(
    (p) =>
      p.status === 'published' &&
      p.published_at != null &&
      Date.parse(p.published_at) >= sevenDaysAgo,
  ).length

  const base = { stage, band, setup: null, ignored }

  if (stage === 'planning') {
    const publishingDays = new Set(campaign.publishing_days)
    const coverage = Array.from(
      { length: Math.min(COVERAGE_DAYS, days) },
      (_, i) => {
        const date = addDays(start, i)
        return {
          date,
          posts: all.filter((p) => {
            const at = whenOf(p)
            return at != null && daysBetween(date, new Date(at)) === 0
          }).length,
          publishing:
            publishingDays.size === 0 ||
            publishingDays.has(WEEKDAY_TOKENS[date.getDay()]),
        }
      },
    )
    const gaps = coverage.filter((c) => c.publishing && c.posts === 0).length
    const extra: NeedsRow[] = []
    if (all.length === 0) {
      extra.push(todoRow({ kind: 'first-post' }, { kind: 'add-post' }))
    } else if (gaps > 0) {
      extra.push(
        todoRow(
          { kind: 'coverage-gaps', days: gaps },
          { kind: 'section', target: 'calendar' },
        ),
      )
    }
    return {
      ...base,
      week: { kind: 'first', days: weekFrom(start) },
      coverage,
      lastWeek: null,
      results: null,
      needsTitle: 'beforeLaunch',
      needs: needsRows(input, extra),
    }
  }

  if (stage === 'ended') {
    const failed = all.filter((p) => p.status === 'failed').length
    const neverPublished = all.filter(
      (p) => p.status !== 'published' && p.status !== 'failed',
    ).length
    // Wrapping up: the read-out first, then putting it away.
    const extra: NeedsRow[] = [
      todoRow(
        { kind: 'read-results' },
        { kind: 'section', target: 'analytics' },
      ),
      todoRow({ kind: 'archive' }, { kind: 'section', target: 'settings' }),
    ]
    return {
      ...base,
      week: null,
      coverage: null,
      lastWeek: null,
      results: {
        published,
        failed,
        neverPublished,
        goal: goal.kind === 'ok' ? goal.total : null,
        performance: figures(input.total),
      },
      needsTitle: 'wrapUp',
      // A finished campaign's open drafts aren't a fault any more; only what
      // went wrong on the way out still wants an answer.
      needs: needsRows(
        {
          ...input,
          attention: input.attention.filter((a) => a.severity === 'alert'),
        },
        extra,
      ),
    }
  }

  return {
    ...base,
    week: { kind: 'this', days: weekFrom(startOfWeek(now)) },
    coverage: null,
    lastWeek: {
      published: publishedLastWeek,
      performance: figures(input.lastWeek),
    },
    results: null,
    needsTitle: 'needsYou',
    needs: needsRows(input, []),
  }
}

const WEEKDAY_TOKENS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function platformLookup(views: PlatformView[]) {
  const byId = new Map(views.map((v) => [v.platform.id, v.info.zernioId]))
  return (id: string) => byId.get(id) ?? null
}

/** A stage's own to-do, worded by the screen from its kind. */
function todoRow(todo: StageTodo, action: NeedsAction): NeedsRow {
  return {
    id: `stage:${todo.kind}`,
    mark: 'todo',
    label: null,
    todo,
    more: 0,
    action,
    ignoreKey: null,
    alternatives: [],
  }
}

/**
 * One list, worst first: what is broken (the client's alerts, then the
 * server's problems that will refuse a publish), what will be (risks, the
 * rest of the server's), then what waits on the user. Server problems of the
 * same kind collapse into one row standing for the rest, because six "post
 * has no image" rows say one thing six times.
 */
function needsRows(input: OverviewInput, extra: NeedsRow[]): NeedsRow[] | null {
  if (input.posts === null) return null

  const fromRule = (item: AttentionItem): NeedsRow => ({
    id: item.id,
    mark:
      item.severity === 'alert'
        ? 'broken'
        : item.severity === 'risk'
          ? 'risk'
          : 'todo',
    label: item.label,
    todo: null,
    more: 0,
    action: { kind: 'section', target: item.fix, label: item.actionLabel },
    ignoreKey: null,
    alternatives: [],
  })

  const groups = new Map<string, CalendarFinding[]>()
  for (const p of input.problems?.problems ?? []) {
    const key = p.code || p.key
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  const fromProblems = [...groups.values()].map((group): NeedsRow => {
    const [first] = group
    const fixAction = (fix: CalendarFinding['fixes'][number]): NeedsAction =>
      fix.kind === 'open_post' && fix.postId
        ? { kind: 'post', postId: fix.postId, label: fix.title }
        : { kind: 'ask', fix: fix.title, problem: first.message }
    const [primary, ...others] = first.fixes
    return {
      id: `problem:${first.key}`,
      mark: first.blocksPublishing ? 'broken' : 'risk',
      label: first.message,
      todo: null,
      more: group.length - 1,
      idea: first.ideas?.[0]?.title,
      action: primary ? fixAction(primary) : null,
      // A group can only be ignored one finding at a time; the menu ignores
      // the one it shows.
      ignoreKey: first.key,
      alternatives: others.map((f) => ({
        label: f.title,
        action: fixAction(f),
      })),
    }
  })

  const rules = input.attention.map(fromRule)
  const rank = { broken: 0, risk: 1, todo: 2 } as const
  // A stable sort keeps the catalogue order inside each mark, the rules ahead
  // of the server's problems within the same mark.
  return [...rules, ...fromProblems, ...extra].sort(
    (a, b) => rank[a.mark] - rank[b.mark],
  )
}
