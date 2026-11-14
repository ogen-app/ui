import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { periodLabel, windowDay } from '@/lib/analyticsCitation'
import {
  counted,
  formatDate,
  formatDateRange,
  formatList,
  formatNumber,
} from '@/lib/intl'
import { postStatusLabel } from '@/lib/postStatusLabel'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useViewContextStore } from '@/stores/viewContextStore'
import type { PostStatus } from '@/types/posts'
import type {
  ActivityRange,
  DigestFigure,
  DigestSent,
  PostHistory,
  PostHistoryEntry,
  UndoState,
  WeeklyDigest,
  WorkspaceResults as Results,
  WorkspaceSetup,
} from '@/types/assistant'
import { ResultBlock, ResultRow, TEXT_ACTION_CLASS, TextAction } from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/**
 * What the workspace pack read or changed this turn (CON-464, drawn as CON-480
 * has them), one card each: the activity over a day or a run of days, the
 * weekly report shown or emailed, a post's history, the accounts'
 * connections, which platforms publish on their own, and an auto-publish
 * change with its UNDO. Figures are in Plex Mono; colour is kept for what
 * went wrong.
 */
export function WorkspaceResults({
  threadId,
  turnId,
  results: r,
  undoStates,
}: {
  threadId: string
  turnId: string
  results: Results
  undoStates: Record<string, UndoState>
}) {
  const { t } = useTranslation()
  const undo = useAssistantStore((s) => s.undo)
  const undoFor: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }
  const entries: [string, ReactNode][] = [
    ['activity', r.activity && <ActivityCard activity={r.activity} />],
    ['digest', r.digest && <DigestCard digest={r.digest} />],
    ['emailed', r.emailed && <EmailedCard emailed={r.emailed} />],
    ['history', r.history && <HistoryCard history={r.history} />],
    [
      'setup',
      r.setup && (
        <SetupCard threadId={threadId} turnId={turnId} setup={r.setup} />
      ),
    ],
    ['autoRead', r.setup?.autoPublish && <AutoPublishRead setup={r.setup} />],
    [
      'autoPublish',
      r.autoPublish && (
        <AutoPublishCard t={t} change={r.autoPublish} undo={undoFor} />
      ),
    ],
  ]
  const blocks = entries.filter(([, node]) => Boolean(node))
  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {blocks.map(([key, block]) => (
        <Fragment key={key}>{block}</Fragment>
      ))}
    </div>
  )
}

/** A figure's own type: Plex Mono, regular, so columns of them line up. */
const FIGURE = 'font-mono text-[13px] font-normal tabular-nums'

/** A label and its value on a hairline; amber when it is the bad news. */
function Line({
  label,
  value,
  detail,
  warn = false,
  figure = false,
}: {
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  warn?: boolean
  /** The value is a number, set as one. */
  figure?: boolean
}) {
  return (
    <ResultRow className="flex items-baseline gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-secondary-foreground">
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 shrink truncate',
          figure && FIGURE,
          warn ? 'text-warning-ink' : 'text-foreground',
        )}
      >
        {value}
      </span>
      {detail && (
        <span className="max-w-[45%] shrink-0 truncate text-[12.5px] text-tertiary-foreground">
          {detail}
        </span>
      )}
    </ResultRow>
  )
}

function CiteFooter({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-border pt-2.5 text-[12.5px] text-tertiary-foreground">
      {children}
    </p>
  )
}

/** A small-caps group label inside a card. */
function Group({ children }: { children: ReactNode }) {
  return (
    <p className="pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tertiary-foreground">
      {children}
    </p>
  )
}

/** A `YYYY-MM-DD` day, as a date at midnight UTC: a day, not an instant. */
function utcDay(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

/** Today in `tz`, as `YYYY-MM-DD`. */
function today(tz: string): string {
  // `en-CA` is pinned because this is parsed, not shown: it is the one
  // locale whose short date is ISO.
  return formatDate(
    new Date(),
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: tz || 'UTC',
    },
    'en-CA',
  )
}

/** Every day from `from` to `to`, inclusive. */
function daysOf(from: string, to: string): string[] {
  const out: string[] = []
  for (
    let d = utcDay(from);
    d <= utcDay(to) && out.length < 400;
    d = new Date(d.getTime() + 86_400_000)
  ) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** "14–20 April", or "28 April – 4 May" across a month, as the language orders it. */
function spanTitle(from: string, to: string): string {
  return formatDateRange(utcDay(from), utcDay(to), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/** "Tue", "Mon 14": a day as a row names it. */
function weekday(iso: string, withDay = false): string {
  return formatDate(utcDay(iso), {
    weekday: 'short',
    ...(withDay ? { day: 'numeric' as const } : {}),
    timeZone: 'UTC',
  })
}

/**
 * A day or a run of days (CON-480): the four tiles, zeroes kept — "0 didn't
 * go out" is the sentence most of these exist to say — then what failed,
 * each day that had something with its own report, the days that had
 * nothing, and when a quiet run's next post goes.
 */
function ActivityCard({ activity: a }: { activity: ActivityRange }) {
  const { t } = useTranslation()
  const oneDay = a.from === a.to
  const days = daysOf(a.from, a.to)
  const current = a.to >= today(a.tz)
  const isWeek = days.length === 7 && utcDay(a.from).getUTCDay() === 1
  const weeks = days.length % 7 === 0 ? days.length / 7 : 0
  const status = oneDay
    ? t('assistant.workspace.activity.day')
    : isWeek
      ? t('assistant.workspace.activity.week')
      : weeks > 1
        ? t('assistant.workspace.activity.weeks')
        : t('assistant.workspace.activity.days')
  const meta = oneDay
    ? undefined
    : isWeek
      ? current
        ? t('assistant.workspace.activity.soFar')
        : t('assistant.workspace.activity.span', {
            from: weekday(a.from),
            to: weekday(a.to),
          })
      : weeks > 1
        ? t('assistant.workspace.activity.weeksCount', counted(weeks))
        : t('assistant.workspace.activity.daysCount', counted(days.length))
  const had = new Set(a.days.map((d) => d.date))
  const nothing = days.filter((d) => !had.has(d))
  const quiet = a.published === 0 && a.failed === 0
  const zone = a.tz || 'UTC'
  const next = a.nextScheduled
  return (
    <ResultBlock
      status={status}
      title={
        oneDay
          ? formatDate(utcDay(a.from), {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            })
          : spanTitle(a.from, a.to)
      }
      meta={meta}
      // One day opens its own report from the header (bug 1); a run opens
      // each day from its row.
      action={
        oneDay ? (
          <Link
            to="/activity/$date"
            params={{ date: a.from }}
            className={TEXT_ACTION_CLASS}
          >
            {t('assistant.workspace.open')}
          </Link>
        ) : undefined
      }
    >
      <Tiles
        tiles={[
          {
            value: a.published,
            label: t('assistant.workspace.activity.tilePublished'),
          },
          {
            value: a.scheduled,
            label: t('assistant.workspace.activity.tileScheduled'),
          },
          {
            value: a.failed,
            label: t('assistant.workspace.activity.tileFailed'),
            warn: a.failed > 0,
          },
          {
            value: a.ideasDecided,
            label: t('assistant.workspace.activity.tileDecided'),
          },
        ]}
      />
      {a.failedPosts.map((p) => (
        <ResultRow key={p.postId} className="flex flex-col gap-0.5 text-sm">
          <span className="text-warning-ink">
            {p.title
              ? t('assistant.workspace.activity.failedPost', {
                  title: p.title,
                })
              : t('assistant.workspace.activity.failedUntitled')}
          </span>
          {p.reason && (
            <span className="text-[12.5px] text-tertiary-foreground">
              {p.reason}
            </span>
          )}
        </ResultRow>
      ))}
      {!oneDay &&
        a.days.map((d) => (
          <ResultRow key={d.date} className="flex items-baseline gap-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm text-foreground">
                {weekday(d.date, true)}
              </span>
              <span
                className={cn(
                  'truncate text-[12.5px]',
                  d.failed > 0
                    ? 'text-warning-ink'
                    : 'text-tertiary-foreground',
                )}
              >
                {daySummary(t, d)}
              </span>
            </span>
            <Link
              to="/activity/$date"
              params={{ date: d.date }}
              className={TEXT_ACTION_CLASS}
            >
              {t('assistant.workspace.open')}
            </Link>
          </ResultRow>
        ))}
      {/* Which days were empty, for a week: past one, a list of dates says
          less than the rows above it. */}
      {!oneDay &&
        days.length <= 7 &&
        a.days.length > 0 &&
        nothing.length > 0 && (
          <p className="pt-2.5 text-[12.5px] text-secondary-foreground">
            {t('assistant.workspace.activity.nothingDays', {
              days: formatList(nothing.map((d) => weekday(d))),
            })}
          </p>
        )}
      {quiet && (
        <p className="pt-2.5 text-[12.5px] text-secondary-foreground">
          {next
            ? t('assistant.workspace.activity.quietNext', {
                when: t('assistant.workspace.activity.nextAt', {
                  day: formatDate(next.at, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    timeZone: zone,
                  }),
                  time: formatDate(next.at, {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: zone,
                  }),
                }),
              })
            : t('assistant.workspace.activity.quietNone')}
        </p>
      )}
      <CiteFooter>
        {[
          current && !oneDay
            ? t('assistant.workspace.activity.toToday', {
                period: periodLabel(t, a.from, a.to),
              })
            : periodLabel(t, a.from, a.to),
          zone,
          a.campaign?.name || t('assistant.workspace.allCampaigns'),
        ].join(' · ')}
      </CiteFooter>
    </ResultBlock>
  )
}

/** The daily report's four figures, as filled tiles. */
function Tiles({
  tiles,
}: {
  tiles: { value: number; label: string; warn?: boolean }[]
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 pb-2.5">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex min-w-0 flex-col gap-1.5 rounded-sm bg-secondary px-2.5 py-2.5"
        >
          <span
            className={cn(
              'font-mono text-[22px] leading-none font-normal tabular-nums',
              tile.warn ? 'text-warning-ink' : 'text-foreground',
            )}
          >
            {formatNumber(tile.value)}
          </span>
          <span className="text-[11.5px] leading-tight text-secondary-foreground">
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function daySummary(t: TFunction, d: ActivityRange['days'][number]): string {
  const parts = [
    d.published > 0 &&
      t('assistant.workspace.activity.dayPublished', counted(d.published)),
    d.failed > 0 &&
      t('assistant.workspace.activity.dayFailed', counted(d.failed)),
    d.created > 0 &&
      t('assistant.workspace.activity.dayCreated', counted(d.created)),
    d.campaignsCreated > 0 &&
      t(
        'assistant.workspace.activity.dayCampaigns',
        counted(d.campaignsCreated),
      ),
  ].filter((p): p is string => Boolean(p))
  return parts.join(' · ')
}

/** "14 April": a week by its Monday. */
function weekOf(iso: string): string {
  return formatDate(utcDay(iso), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/**
 * Monday's report, in the rail (CON-401, drawn as CON-480 has it). Its
 * figures and sentences are the email's own — the server renders them once
 * for both — and the labels around them are ours. A good change is muted:
 * colour is for what needs someone.
 */
function DigestCard({ digest: d }: { digest: WeeklyDigest }) {
  const { t } = useTranslation()
  const figure = (label: string, f: DigestFigure) => (
    <Line label={label} value={f.value} detail={f.delta} figure />
  )
  const best = d.performance?.top[0]
  const failures = d.publishing?.failures ?? []
  return (
    <ResultBlock
      status={t('assistant.workspace.digest.word')}
      title={t('assistant.workspace.digest.weekOf', { week: weekOf(d.from) })}
      meta={t('assistant.workspace.digest.asMonday')}
    >
      {d.lede && (
        <p className="pb-2 text-sm text-secondary-foreground">{d.lede}</p>
      )}
      {d.empty && (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.workspace.digest.empty')}
        </ResultRow>
      )}
      {d.attention.map((a, i) => (
        <ResultRow key={i} className="flex flex-col gap-0.5 text-sm">
          <span className="text-warning-ink">{a.text}</span>
          {a.detail && (
            <span className="text-[12.5px] text-tertiary-foreground">
              {a.detail}
            </span>
          )}
        </ResultRow>
      ))}
      {d.publishing && (
        <>
          <Group>{t('assistant.workspace.digest.publishing')}</Group>
          {figure(
            t('assistant.workspace.digest.published'),
            d.publishing.published,
          )}
          {d.publishing.failed && (
            <Line
              label={t('assistant.workspace.digest.failed')}
              value={d.publishing.failed}
              detail={
                failures.length > 0
                  ? formatList(failures.map((f) => f.title).filter(Boolean))
                  : undefined
              }
              figure
              warn
            />
          )}
          {d.publishing.nextWeek && (
            <ResultRow className="text-[12.5px] text-tertiary-foreground">
              {d.publishing.nextWeek}
            </ResultRow>
          )}
        </>
      )}
      {d.performance && (
        <>
          <Group>{t('assistant.workspace.digest.performance')}</Group>
          {figure(t('assistant.workspace.digest.reach'), d.performance.reach)}
          {best && (
            <Line
              label={t('assistant.workspace.digest.bestPost')}
              value={best.title}
              detail={best.multiple || best.reach}
            />
          )}
        </>
      )}
      {d.campaigns && (d.campaigns.rows.length > 0 || d.campaigns.summary) && (
        <>
          <Group>{t('assistant.workspace.digest.campaigns')}</Group>
          {d.campaigns.rows.map((c, i) => (
            <Line
              key={i}
              label={c.name}
              value={c.goal}
              detail={c.status}
              warn={!c.met}
            />
          ))}
          {d.campaigns.summary && (
            <ResultRow className="text-[12.5px] text-tertiary-foreground">
              {d.campaigns.summary}
            </ResultRow>
          )}
        </>
      )}
      {d.ideas && (
        <>
          <Group>{t('assistant.workspace.digest.ideas')}</Group>
          {d.ideas.decided > 0 || d.ideas.waitingCount > 0 ? (
            <Line
              label={t('assistant.workspace.digest.decided')}
              value={formatNumber(d.ideas.decided)}
              detail={
                d.ideas.waitingCount > 0
                  ? t(
                      'assistant.workspace.digest.stillWaiting',
                      counted(d.ideas.waitingCount),
                    )
                  : undefined
              }
              figure
            />
          ) : (
            <ResultRow className="text-[12.5px] text-secondary-foreground">
              {[d.ideas.waiting, d.ideas.summary].filter(Boolean).join(' · ')}
            </ResultRow>
          )}
        </>
      )}
      {d.team && (
        <>
          <Group>{t('assistant.workspace.digest.team')}</Group>
          <ResultRow className="text-[12.5px] text-secondary-foreground">
            {d.team}
          </ResultRow>
        </>
      )}
      <CiteFooter>
        {[
          periodLabel(t, d.from, d.to),
          t('assistant.workspace.allCampaigns'),
        ].join(' · ')}
      </CiteFooter>
    </ResultBlock>
  )
}

/** The reasons the server gives, as this build words them. */
const SKIP_KEYS = {
  not_member: 'notMember',
  opted_out: 'optedOut',
  already_sent: 'alreadySent',
  failed: 'failed',
} as const

/**
 * The weekly report emailed (CON-480): SENT names who it went to; NOT SENT
 * says why it went to no one, and for someone outside the workspace the way
 * to fix it. Recipients it skipped beside a send are listed under it.
 */
function EmailedCard({ emailed: e }: { emailed: DigestSent }) {
  const { t } = useTranslation()
  const skipped = e.notSent.map((s) => {
    const key = SKIP_KEYS[s.reason as keyof typeof SKIP_KEYS]
    return (
      <ResultRow
        key={`${s.recipient}-${s.reason}`}
        className="flex items-baseline gap-3"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm text-foreground">
            {t(`assistant.workspace.emailed.reason.${key ?? 'other'}`, {
              recipient: s.recipient,
            })}
          </span>
          {s.reason === 'not_member' && (
            <span className="text-[12.5px] text-tertiary-foreground">
              {t('assistant.workspace.emailed.invite')}
            </span>
          )}
        </span>
        {s.reason === 'not_member' && (
          <Link to="/workspace-settings" className={TEXT_ACTION_CLASS}>
            {t('assistant.workspace.open')}
          </Link>
        )}
      </ResultRow>
    )
  })
  if (e.sent.length === 0) {
    // Every skip for one reason says it in the headline; a mix says only
    // that nothing went.
    const reasons = new Set(e.notSent.map((s) => s.reason))
    const only = reasons.size === 1 ? [...reasons][0] : undefined
    const key = only && SKIP_KEYS[only as keyof typeof SKIP_KEYS]
    return (
      <ResultBlock
        status={t('assistant.workspace.emailed.notSentWord')}
        tone="warning"
        title={t(`assistant.workspace.emailed.none.${key || 'other'}`)}
      >
        {skipped}
      </ResultBlock>
    )
  }
  return (
    <ResultBlock
      status={t('assistant.workspace.emailed.sentWord')}
      title={t('assistant.workspace.emailed.sentTo', counted(e.sent.length))}
      meta={e.sentAt ? sentWhen(t, e.sentAt) : undefined}
    >
      <ResultRow className="flex flex-col gap-0.5">
        <span className="text-sm text-foreground">
          {formatList(e.sent.map((r) => r.name || r.email))}
        </span>
        <span className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.workspace.digest.weekOf', { week: weekOf(e.from) })}
        </span>
      </ResultRow>
      {skipped}
    </ResultBlock>
  )
}

/** "just now" within the minute, else when, for a thread read later. */
function sentWhen(t: TFunction, iso: string, now = Date.now()): string {
  return now - Date.parse(iso) < 60_000
    ? t('assistant.workspace.emailed.justNow')
    : (formatDate(iso, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }) ?? iso)
}

/** A history row's time: short when recent, the date alone when not. */
function entryWhen(iso: string, tz: string, now = Date.now()): string {
  const age = (now - Date.parse(iso)) / 86_400_000
  const time = { hour: '2-digit', minute: '2-digit' } as const
  if (age < 6)
    return formatDate(iso, { weekday: 'short', ...time, timeZone: tz }) ?? iso
  if (age < 31)
    return (
      formatDate(iso, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...time,
        timeZone: tz,
      }) ?? iso
    )
  return (
    formatDate(iso, { day: 'numeric', month: 'short', timeZone: tz }) ?? iso
  )
}

/** The server's event sentences, onto ours, for a server before CON-480. */
const EVENT_KEYS = {
  scheduled: 'scheduled',
  unscheduled: 'unscheduled',
  'retried publishing': 'retried',
  'created as a copy of another post': 'copied',
  'made from ideas': 'compiled',
  'restored an earlier version': 'restored',
  'status changed': 'statusChanged',
} as const

/** What each change kind is called, for the history's narrowing. */
const SCOPE_KEYS = {
  version: 'versions',
  scheduled: 'schedule',
  rescheduled: 'schedule',
  unscheduled: 'schedule',
  status: 'status',
  failed: 'failures',
  retried: 'retries',
  copied: 'copies',
  compiled: 'compiles',
  restored: 'restores',
} as const

/**
 * What a history entry did (CON-480), worded from its change kind: a
 * reschedule with its from and to, a failure with its reason. A version's own
 * note is the author's words and shown as written. A change this build
 * predates falls back to the server's sentence.
 */
function entryWhat(t: TFunction, e: PostHistoryEntry, tz: string): string {
  const when = (iso: string, time = true) =>
    formatDate(iso, {
      day: 'numeric',
      month: 'short',
      ...(time ? { hour: '2-digit' as const, minute: '2-digit' as const } : {}),
      timeZone: tz,
    }) ?? iso
  const h = 'assistant.workspace.history'
  switch (e.change ?? (e.kind === 'version' ? 'version' : undefined)) {
    case 'version':
      return e.what && e.what !== 'saved a version'
        ? e.what
        : t(`${h}.savedVersion`)
    case 'scheduled':
      return e.to
        ? t(`${h}.scheduledFor`, { when: when(e.to) })
        : t(`${h}.events.scheduled`)
    case 'rescheduled':
      return e.from && e.to
        ? t(`${h}.rescheduled`, { from: when(e.from, false), to: when(e.to) })
        : t(`${h}.events.scheduled`)
    case 'unscheduled':
      return t(`${h}.events.unscheduled`)
    case 'failed':
      return e.reason
        ? t(`${h}.failed`, { reason: e.reason })
        : t(`${h}.failedBare`)
    case 'retried':
    case 'copied':
    case 'compiled':
    case 'restored':
      return t(`${h}.events.${e.change as 'retried'}`)
  }
  const status = /^status (\S+) → (\S+)$/.exec(e.what)
  if (status) {
    return t(`${h}.status`, {
      from: postStatusLabel(t, status[1] as PostStatus),
      to: postStatusLabel(t, status[2] as PostStatus),
    })
  }
  const key = EVENT_KEYS[e.what as keyof typeof EVENT_KEYS]
  return key ? t(`${h}.events.${key}` as const) : e.what
}

/**
 * Who made a change, named from the workspace's members. A change the
 * assistant made says who asked it (bug 2, events included); one from
 * before people were recorded says only which kind of hand.
 */
function useEntryBy(): (e: PostHistoryEntry) => string {
  const { t } = useTranslation()
  const members = useWorkspaceMembers().data
  const nameOf = (id: string) => {
    const m = members?.find((x) => x.id === id)
    return m ? m.name || m.email : t('assistant.workspace.history.former')
  }
  return (e) => {
    const name = e.byId ? (members ? nameOf(e.byId) : e.by) : undefined
    if (e.source === 'assistant')
      return name
        ? t('assistant.workspace.history.assistantFor', { name })
        : t('assistant.workspace.history.assistant')
    if (e.source === 'system')
      return name
        ? t('assistant.workspace.history.systemFor', { name })
        : t('assistant.workspace.history.system')
    if (name) return name
    if (e.kind === 'event') return t('assistant.workspace.history.system')
    return t('assistant.workspace.history.unrecorded')
  }
}

/** How the history was narrowed: "since 2 Mar", "schedule changes". */
function scopeMeta(
  t: TFunction,
  scope: PostHistory['scope'],
): string | undefined {
  if (!scope) return undefined
  const kinds = [
    ...new Set(
      scope.changes.flatMap((c) => {
        const key = SCOPE_KEYS[c as keyof typeof SCOPE_KEYS]
        return key ? [t(`assistant.workspace.history.scope.${key}`)] : []
      }),
    ),
  ]
  const parts = [
    kinds.length > 0 ? formatList(kinds) : '',
    scope.since
      ? t('assistant.workspace.history.since', { day: windowDay(scope.since) })
      : '',
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

/**
 * A post's history (CON-480): what on the left, when on the right in the
 * workspace's zone, who under it, a version as a tag; failures amber. On the
 * post itself, VERSIONS opens its versions panel. Where versions predate
 * people being recorded, a note says so at the point it starts to apply.
 */
function HistoryCard({ history: h }: { history: PostHistory }) {
  const { t } = useTranslation()
  const by = useEntryBy()
  const tz = h.timezone || 'UTC'
  const focus = useViewContextStore((s) => s.location.focus)
  const openPanel = useSettingsStore((s) => s.openRightPanel)
  const onPost = focus?.kind === 'post' && focus.id === h.postId
  const cutoff = h.unrecordedBefore ? Date.parse(h.unrecordedBefore) : NaN
  const noteAt = Number.isNaN(cutoff)
    ? -1
    : h.entries.findIndex((e) => Date.parse(e.at) <= cutoff)
  const note = h.unrecordedBefore
    ? t('assistant.workspace.history.unrecordedBefore', {
        day: windowDay(h.unrecordedBefore),
      })
    : t('assistant.workspace.history.unrecordedNote')
  return (
    <ResultBlock
      status={t('assistant.workspace.history.word')}
      title={h.title || t('assistant.workspace.history.untitled')}
      meta={scopeMeta(t, h.scope)}
      action={
        onPost ? (
          <TextAction onClick={() => openPanel('postVersions')}>
            {t('assistant.workspace.history.versions')}
          </TextAction>
        ) : undefined
      }
    >
      {h.entries.length === 0 && (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.workspace.history.none')}
        </ResultRow>
      )}
      {h.entries.map((e, i) => (
        <Fragment key={`${e.at}-${i}`}>
          {i === noteAt && (
            <p className="border-t border-border py-2.5 text-[12.5px] text-secondary-foreground">
              {note}
            </p>
          )}
          <ResultRow className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-sm">
            <span
              className={cn(
                'min-w-0',
                e.change === 'failed' ? 'text-warning-ink' : 'text-foreground',
              )}
            >
              {entryWhat(t, e, tz)}
            </span>
            <span
              className={cn(FIGURE, 'text-[12px] text-tertiary-foreground')}
            >
              {entryWhen(e.at, tz)}
            </span>
            <span className="text-[12.5px] text-tertiary-foreground">
              {by(e)}
            </span>
            {e.version ? (
              <span className="text-right text-[12.5px] text-tertiary-foreground">
                {t('assistant.workspace.history.versionTag', { n: e.version })}
              </span>
            ) : (
              <span />
            )}
          </ResultRow>
        </Fragment>
      ))}
      {h.more && (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.workspace.history.more')}
        </ResultRow>
      )}
      {h.unrecorded && noteAt < 0 && <CiteFooter>{note}</CiteFooter>}
    </ResultBlock>
  )
}

/** Whole days from now until `iso`; negative when past. */
function daysUntil(iso: string, now = Date.now()): number {
  return Math.floor((Date.parse(iso) - now) / 86_400_000)
}

/**
 * The accounts' connections (CON-480): signed out since when and what waits
 * on it, or connected and when it expires. RECONNECT goes through the
 * assistant's own deep link, so the screen change is a row with BACK.
 */
function SetupCard({
  threadId,
  turnId,
  setup: s,
}: {
  threadId: string
  turnId: string
  setup: WorkspaceSetup
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const run = useAssistantStore((st) => st.runUiAction)
  const broken = s.accounts.filter((a) => a.needsReconnect)
  const nameOf = (slug: string) => resolve(slug)?.name ?? slug
  return (
    <ResultBlock
      status={t('assistant.workspace.setup.word', counted(s.accounts.length))}
      tone={broken.length > 0 ? 'warning' : 'neutral'}
      title={
        broken.length === 1
          ? t('assistant.workspace.setup.brokenOne', {
              platform: nameOf(broken[0].platform),
            })
          : broken.length > 1
            ? t('assistant.workspace.setup.broken', counted(broken.length))
            : s.accounts.length > 0
              ? t('assistant.workspace.setup.healthy')
              : t('assistant.workspace.setup.none')
      }
    >
      {s.accounts.map((a) => {
        const platform = nameOf(a.platform)
        const label = a.username ? `${platform} · @${a.username}` : platform
        const left = a.tokenExpiresAt ? daysUntil(a.tokenExpiresAt) : undefined
        return (
          <Fragment key={a.id}>
            {a.needsReconnect ? (
              <Line
                label={label}
                value={t('assistant.workspace.setup.signedOut')}
                detail={
                  a.unhealthySince
                    ? t('assistant.workspace.setup.since', {
                        day: windowDay(a.unhealthySince),
                      })
                    : undefined
                }
                warn
              />
            ) : (
              <Line
                label={label}
                value={t('assistant.workspace.setup.connected')}
                detail={
                  left !== undefined && left >= 0
                    ? t('assistant.workspace.setup.expiresIn', counted(left))
                    : undefined
                }
                warn={a.health === 'expiring'}
              />
            )}
            {a.needsReconnect && a.waitingPosts > 0 && (
              <Line
                label={t('assistant.workspace.setup.waiting')}
                value={t(
                  'assistant.workspace.setup.waitingPosts',
                  counted(a.waitingPosts),
                )}
              />
            )}
          </Fragment>
        )
      })}
      {broken.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3">
          {broken.map((a) => (
            <Button
              key={a.id}
              type="button"
              size="sm"
              onClick={() =>
                void run(threadId, turnId, {
                  type: 'open_connect',
                  screen: 'settings',
                  connect: {
                    platform: a.platform,
                    accountId: a.id,
                    reconnect: true,
                  },
                })
              }
            >
              {t('assistant.workspace.setup.reconnect', {
                platform: nameOf(a.platform).toUpperCase(),
              })}
            </Button>
          ))}
        </div>
      )}
      <CiteFooter>
        {t('assistant.workspace.setup.zone', { zone: s.timezone || 'UTC' })}
      </CiteFooter>
    </ResultBlock>
  )
}

/**
 * Which platforms publish on their own (CON-480), one row each from the
 * same read: Auto-publish or By hand, an auto-publishing one that needs
 * reconnecting said in amber, and the zone the times are read in.
 */
function AutoPublishRead({ setup: s }: { setup: WorkspaceSetup }) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const auto = new Set(s.autoPublish ?? [])
  const platforms = [...new Set(s.accounts.map((a) => a.platform))]
  if (platforms.length === 0) return null
  const on = platforms.filter((p) => auto.has(p))
  const nameOf = (slug: string) => resolve(slug)?.name ?? slug
  return (
    <ResultBlock
      status={t('assistant.workspace.autoRead.word')}
      title={
        on.length === 0
          ? t('assistant.workspace.autoRead.none')
          : on.length === 1
            ? t('assistant.workspace.autoRead.one', { platform: nameOf(on[0]) })
            : t('assistant.workspace.autoRead.many', {
                platforms: formatList(on.map(nameOf)),
              })
      }
      meta={t('assistant.workspace.autoRead.of', {
        n: formatNumber(on.length),
        total: formatNumber(platforms.length),
      })}
    >
      {platforms.map((p) => {
        const broken = s.accounts.some(
          (a) => a.platform === p && a.needsReconnect,
        )
        return (
          <Line
            key={p}
            label={nameOf(p)}
            value={
              auto.has(p)
                ? t('assistant.workspace.autoRead.auto')
                : t('assistant.workspace.autoRead.byHand')
            }
            detail={
              auto.has(p) ? (
                broken ? (
                  <span className="text-warning-ink">
                    {t('assistant.workspace.autoRead.needsReconnect')}
                  </span>
                ) : undefined
              ) : (
                t('assistant.workspace.autoRead.reminder')
              )
            }
          />
        )
      })}
      <Line
        label={t('assistant.workspace.autoRead.timezone')}
        value={s.timezone || 'UTC'}
      />
    </ResultBlock>
  )
}

/**
 * An auto-publish change (CON-480): what changed, the posts already
 * scheduled that keep their route — a post's route is set when it is
 * scheduled — and UNDO.
 */
function AutoPublishCard({
  t,
  change: c,
  undo,
}: {
  t: TFunction
  change: NonNullable<Results['autoPublish']>
  undo: ResultUndo
}) {
  const { resolve } = usePlatformCatalog()
  const label = c.platformLabel || (c.platform && resolve(c.platform)?.name)
  return (
    <ResultBlock
      status={t('assistant.workspace.autoPublish.word')}
      title={
        label && c.on !== undefined
          ? c.on
            ? t('assistant.workspace.autoPublish.turnedOn', { platform: label })
            : t('assistant.workspace.autoPublish.turnedOff', {
                platform: label,
              })
          : c.platforms.length > 0
            ? t('assistant.workspace.autoPublish.title', {
                platforms: formatList(
                  c.platforms.map((p) => resolve(p)?.name ?? p),
                ),
              })
            : t('assistant.workspace.autoPublish.none')
      }
      action={<UndoAction t={t} undoId={c.undoId} undo={undo} />}
    >
      <ResultRow className="text-[12.5px] text-tertiary-foreground">
        {c.scheduledUnaffected > 0
          ? t(
              'assistant.workspace.autoPublish.keep',
              counted(c.scheduledUnaffected),
            )
          : t('assistant.workspace.autoPublish.fromNow')}
      </ResultRow>
      <UndoNote t={t} undoId={c.undoId} undo={undo} />
    </ResultBlock>
  )
}
