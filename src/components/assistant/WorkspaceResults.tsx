import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { periodLabel, windowDay } from '@/lib/analyticsCitation'
import { counted, formatDate, formatList } from '@/lib/intl'
import { postStatusLabel } from '@/lib/postStatusLabel'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import type { PostStatus } from '@/types/posts'
import type {
  ActivityRange,
  DigestFigure,
  PostHistory,
  PostHistoryEntry,
  UndoState,
  WeeklyDigest,
  WorkspaceResults as Results,
  WorkspaceSetup,
} from '@/types/assistant'
import { ResultBlock, ResultRow } from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/**
 * What the workspace pack read or changed this turn (CON-464), one card each:
 * the activity over a day or a run of days, the setup, the weekly report shown
 * or emailed, a post's history, and an auto-publish change with its UNDO.
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
    [
      'emailed',
      r.emailed && (
        <ResultBlock
          status={t('assistant.workspace.emailed.word')}
          title={t('assistant.workspace.emailed.title')}
          meta={periodLabel(t, r.emailed.from, r.emailed.to)}
        />
      ),
    ],
    ['history', r.history && <HistoryCard history={r.history} />],
    ['setup', r.setup && <SetupCard setup={r.setup} />],
    [
      'autoPublish',
      r.autoPublish && (
        <AutoPublishCard
          t={t}
          platforms={r.autoPublish.platforms}
          undoId={r.autoPublish.undoId}
          undo={undoFor}
        />
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

/** A label and its figure on a hairline; amber when it is the bad news. */
function Line({
  label,
  value,
  detail,
  warn = false,
}: {
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  warn?: boolean
}) {
  return (
    <ResultRow className="flex items-baseline gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-secondary-foreground">
        {label}
      </span>
      <span
        className={cn(
          'shrink-0 tabular-nums',
          warn ? 'text-warning' : 'text-foreground',
        )}
      >
        {value}
      </span>
      {detail && (
        <span className="shrink-0 text-[12.5px] text-tertiary-foreground">
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

/**
 * A day or a run of days: the daily report's totals, zeroes kept — "0 didn't
 * go out" is the sentence most of these exist to say — then each day that had
 * something, opening its own report.
 */
function ActivityCard({ activity: a }: { activity: ActivityRange }) {
  const { t } = useTranslation()
  const oneDay = a.from === a.to
  const dayName = (iso: string) =>
    formatDate(iso, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }) ?? iso
  return (
    <ResultBlock
      status={
        oneDay
          ? t('assistant.workspace.activity.day')
          : t('assistant.workspace.activity.range')
      }
      title={oneDay ? dayName(a.from) : periodLabel(t, a.from, a.to)}
    >
      <Line
        label={t('assistant.workspace.activity.published')}
        value={counted(a.published).formatted}
      />
      <Line
        label={t('assistant.workspace.activity.failed')}
        value={counted(a.failed).formatted}
        warn={a.failed > 0}
      />
      <Line
        label={t('assistant.workspace.activity.created')}
        value={counted(a.created).formatted}
        detail={t(
          'assistant.workspace.activity.scheduled',
          counted(a.scheduled),
        )}
      />
      {a.campaignsCreated > 0 && (
        <Line
          label={t('assistant.workspace.activity.campaigns')}
          value={counted(a.campaignsCreated).formatted}
        />
      )}
      {!oneDay &&
        a.days.map((d) => (
          <ResultRow
            key={d.date}
            className="flex items-baseline gap-3 text-[12.5px]"
          >
            <span className="w-20 shrink-0 text-secondary-foreground">
              {dayName(d.date)}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                d.failed > 0 ? 'text-warning' : 'text-tertiary-foreground',
              )}
            >
              {daySummary(t, d)}
            </span>
            <Link
              to="/activity/$date"
              params={{ date: d.date }}
              className="shrink-0 text-xs font-medium tracking-[0.03em] text-secondary-foreground hover:text-foreground"
            >
              {t('assistant.workspace.open')}
            </Link>
          </ResultRow>
        ))}
      {!oneDay && a.days.length === 0 && (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.workspace.activity.quiet')}
        </ResultRow>
      )}
      <CiteFooter>
        {t('assistant.workspace.activity.zone', { zone: a.tz })}
      </CiteFooter>
    </ResultBlock>
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

/**
 * Monday's report, in the rail (CON-401). Its figures and sentences are the
 * email's own — the server renders them once for both — and the labels around
 * them are ours.
 */
function DigestCard({ digest: d }: { digest: WeeklyDigest }) {
  const { t } = useTranslation()
  const figure = (label: string, f: DigestFigure) => (
    <Line
      label={label}
      value={f.value}
      detail={
        f.delta && (
          <span className={cn(f.good && 'text-accent')}>{f.delta}</span>
        )
      }
    />
  )
  const group = (label: string) => (
    <p className="pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tertiary-foreground">
      {label}
    </p>
  )
  return (
    <ResultBlock
      status={t('assistant.workspace.digest.word')}
      title={periodLabel(t, d.from, d.to)}
      meta={d.headline || undefined}
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
          <span className="text-warning">{a.text}</span>
          {a.detail && (
            <span className="text-[12.5px] text-tertiary-foreground">
              {a.detail}
            </span>
          )}
        </ResultRow>
      ))}
      {d.publishing && (
        <>
          {group(t('assistant.workspace.digest.publishing'))}
          {figure(
            t('assistant.workspace.digest.published'),
            d.publishing.published,
          )}
          {d.publishing.failed && (
            <Line
              label={t('assistant.workspace.digest.failed')}
              value={d.publishing.failed}
              warn
            />
          )}
          {d.publishing.failures.map((f, i) => (
            <ResultRow key={i} className="flex flex-col gap-0.5 text-[12.5px]">
              <span className="text-foreground">{f.title}</span>
              <span className="text-tertiary-foreground">
                {[f.meta, f.reason].filter(Boolean).join(' · ')}
              </span>
            </ResultRow>
          ))}
          {d.publishing.nextWeek && (
            <ResultRow className="text-[12.5px] text-tertiary-foreground">
              {d.publishing.nextWeek}
            </ResultRow>
          )}
        </>
      )}
      {d.performance && (
        <>
          {group(t('assistant.workspace.digest.performance'))}
          {figure(t('assistant.workspace.digest.reach'), d.performance.reach)}
          {figure(
            t('assistant.workspace.digest.interactions'),
            d.performance.interactions,
          )}
          {figure(
            t('assistant.workspace.digest.engagement'),
            d.performance.engagement,
          )}
          {figure(
            t('assistant.workspace.digest.followers'),
            d.performance.followers,
          )}
          {d.performance.top.slice(0, 3).map((p, i) => (
            <Line key={i} label={p.title} value={p.reach} detail={p.multiple} />
          ))}
        </>
      )}
      {d.campaigns && (d.campaigns.rows.length > 0 || d.campaigns.summary) && (
        <>
          {group(t('assistant.workspace.digest.campaigns'))}
          {d.campaigns.rows.map((c, i) => (
            <Line key={i} label={c.name} value={c.goal} detail={c.status} />
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
          {group(t('assistant.workspace.digest.ideas'))}
          <ResultRow className="text-[12.5px] text-secondary-foreground">
            {[d.ideas.waiting, d.ideas.summary].filter(Boolean).join(' · ')}
          </ResultRow>
        </>
      )}
      {d.team && (
        <>
          {group(t('assistant.workspace.digest.team'))}
          <ResultRow className="text-[12.5px] text-secondary-foreground">
            {d.team}
          </ResultRow>
        </>
      )}
      <CiteFooter>{t('assistant.workspace.digest.asEmailed')}</CiteFooter>
    </ResultBlock>
  )
}

/** The server's event sentences, onto ours (CON-464). */
const EVENT_KEYS = {
  scheduled: 'scheduled',
  unscheduled: 'unscheduled',
  'retried publishing': 'retried',
  'created as a copy of another post': 'copied',
  'made from ideas': 'compiled',
  'restored an earlier version': 'restored',
  'status changed': 'statusChanged',
} as const

/**
 * What a history entry did. Words this build knows are ours; a sentence it
 * predates is shown as the server wrote it, as an upload refusal is.
 */
function entryWhat(t: TFunction, e: PostHistoryEntry): string {
  if (e.kind === 'version') {
    const named = e.version
      ? t('assistant.workspace.history.version', { n: e.version })
      : t('assistant.workspace.history.savedVersion')
    const note =
      e.what && e.what !== 'saved a version'
        ? e.what.replace(/\bv(\d+)\b/g, 'version $1')
        : ''
    return note ? `${named} · ${note}` : named
  }
  const status = /^status (\S+) → (\S+)$/.exec(e.what)
  if (status) {
    return t('assistant.workspace.history.status', {
      from: postStatusLabel(t, status[1] as PostStatus),
      to: postStatusLabel(t, status[2] as PostStatus),
    })
  }
  const key = EVENT_KEYS[e.what as keyof typeof EVENT_KEYS]
  return key ? t(`assistant.workspace.history.events.${key}` as const) : e.what
}

/**
 * Who made a change, named from the workspace's members. A version saved by
 * the assistant says whom it was for; one from before people were recorded
 * says only which kind of hand.
 */
function useEntryBy(): (e: PostHistoryEntry) => string {
  const { t } = useTranslation()
  const members = useWorkspaceMembers().data
  const nameOf = (id: string) => {
    const m = members?.find((x) => x.id === id)
    return m ? m.name || m.email : t('assistant.workspace.history.former')
  }
  return (e) => {
    // Members still loading, or unreadable: the server's own words beat
    // calling a current member a former one.
    if (!members && e.byId && e.by) return e.by
    if (e.kind === 'event') {
      return e.byId ? nameOf(e.byId) : t('assistant.workspace.history.system')
    }
    if (!e.byId) {
      if (e.source === 'assistant')
        return t('assistant.workspace.history.assistant')
      if (e.source === 'system') return t('assistant.workspace.history.system')
      return t('assistant.workspace.history.unrecorded')
    }
    const name = nameOf(e.byId)
    if (e.source === 'assistant')
      return t('assistant.workspace.history.assistantFor', { name })
    if (e.source === 'system')
      return t('assistant.workspace.history.systemFor', { name })
    return name
  }
}

function HistoryCard({ history: h }: { history: PostHistory }) {
  const { t } = useTranslation()
  const by = useEntryBy()
  const when = (iso: string) =>
    formatDate(iso, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }) ?? iso
  return (
    <ResultBlock
      status={t('assistant.workspace.history.word')}
      title={h.title || t('assistant.workspace.history.untitled')}
    >
      {h.entries.length === 0 && (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.workspace.history.none')}
        </ResultRow>
      )}
      {h.entries.map((e, i) => (
        <ResultRow
          key={`${e.at}-${i}`}
          className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-sm"
        >
          <span className="min-w-0 text-foreground">{entryWhat(t, e)}</span>
          <span className="text-[12px] tabular-nums text-tertiary-foreground">
            {when(e.at)}
          </span>
          <span className="text-[12.5px] text-tertiary-foreground">
            {by(e)}
          </span>
        </ResultRow>
      ))}
      {h.more && (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.workspace.history.more')}
        </ResultRow>
      )}
      {h.unrecorded && (
        <CiteFooter>
          {t('assistant.workspace.history.unrecordedNote')}
        </CiteFooter>
      )}
    </ResultBlock>
  )
}

/**
 * The accounts' health and which platforms publish on their own. A broken
 * account links straight to its row in Settings — the same address the
 * assistant's `open_connect` lands on.
 */
function SetupCard({ setup: s }: { setup: WorkspaceSetup }) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const broken = s.accounts.filter((a) => a.needsReconnect)
  const auto = s.autoPublish
  return (
    <ResultBlock
      status={t('assistant.workspace.setup.word')}
      tone={broken.length > 0 ? 'warning' : 'neutral'}
      title={
        broken.length > 0
          ? t('assistant.workspace.setup.broken', counted(broken.length))
          : s.accounts.length > 0
            ? t('assistant.workspace.setup.healthy')
            : t('assistant.workspace.setup.none')
      }
    >
      {s.accounts.map((a) => {
        const platform = resolve(a.platform)?.name ?? a.platform
        const expiring = !a.needsReconnect && a.health === 'expiring'
        return (
          <ResultRow key={a.id} className="flex items-baseline gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">
              <span className="text-foreground">
                {a.username ? `@${a.username}` : platform}
              </span>
              <span className="ml-2 text-[12.5px] text-tertiary-foreground">
                {[
                  a.username ? platform : '',
                  a.autoPublish
                    ? t('assistant.workspace.setup.auto')
                    : t('assistant.workspace.setup.byHand'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            {a.needsReconnect ? (
              <Link
                to="/workspace-settings"
                search={{ reconnect: a.id, platform: a.platform }}
                className="shrink-0 text-xs font-medium tracking-[0.03em] text-warning hover:text-foreground"
              >
                {t('assistant.workspace.setup.reconnect')}
              </Link>
            ) : (
              <span
                className={cn(
                  'shrink-0 text-[12.5px]',
                  expiring ? 'text-warning' : 'text-tertiary-foreground',
                )}
              >
                {expiring && a.tokenExpiresAt
                  ? t('assistant.workspace.setup.expires', {
                      day: windowDay(a.tokenExpiresAt),
                    })
                  : t('assistant.workspace.setup.connected')}
              </span>
            )}
          </ResultRow>
        )
      })}
      {auto && (
        <Line
          label={t('assistant.workspace.setup.autoPublish')}
          value={
            auto.length > 0
              ? formatList(auto.map((p) => resolve(p)?.name ?? p))
              : t('assistant.workspace.setup.autoNone')
          }
        />
      )}
      <CiteFooter>
        {t('assistant.workspace.setup.zone', { zone: s.timezone || 'UTC' })}
      </CiteFooter>
    </ResultBlock>
  )
}

/** An auto-publish change: the list as it now stands, and UNDO. */
function AutoPublishCard({
  t,
  platforms,
  undoId,
  undo,
}: {
  t: TFunction
  platforms: string[]
  undoId?: string
  undo: ResultUndo
}) {
  const { resolve } = usePlatformCatalog()
  return (
    <ResultBlock
      status={t('assistant.workspace.autoPublish.word')}
      title={
        platforms.length > 0
          ? t('assistant.workspace.autoPublish.title', {
              platforms: formatList(
                platforms.map((p) => resolve(p)?.name ?? p),
              ),
            })
          : t('assistant.workspace.autoPublish.none')
      }
      action={<UndoAction t={t} undoId={undoId} undo={undo} />}
    >
      <ResultRow className="text-[12.5px] text-tertiary-foreground">
        {t('assistant.workspace.autoPublish.note')}
      </ResultRow>
      <UndoNote t={t} undoId={undoId} undo={undo} />
    </ResultBlock>
  )
}
