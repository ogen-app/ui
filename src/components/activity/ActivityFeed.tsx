import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowCounterClockwiseIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  ChecksIcon,
  NotebookIcon,
  ProhibitIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState'
import { Button } from '@/components/ui/button'
import { useActivityFeed, useActivityLastSeen } from '@/hooks/useActivity'
import { useTaskReconciliation } from '@/hooks/useTasks'
import { getPlatformInfo } from '@/lib/platformDictionary'
import {
  dayKey,
  isTaskEntry,
  isUnread,
  type ActivityEntry,
} from '@/lib/activityFeed'
import { cn } from '@/lib'
import { useDayLabel, useTimeLabel } from '@/hooks/useActivityLabels'

/**
 * The Activity page: everything that happened in this workspace, newest first.
 *
 * Tasks are the module next door (`components/tasks/TasksBoard`), not a card at
 * the top of this one: what happened and what is owed are two objects, read at
 * different times and for different reasons, and stacking them made the feed
 * carry a permanent lid that had nothing to do with the feed.
 *
 * **A day is a card** — the same object the Campaigns list is built from, for
 * the same reason: these are the units you compare, and the page reads as a
 * short stack of them rather than an undifferentiated list of rows. Inside a
 * card sit its sections, one per thing that needs saying that day.
 *
 * Two kinds of section, and the split is the design (`docs/activity.md`).
 * **Exceptions** — a post that failed, a post that was never published — get a
 * section of their own at the moment they happened. Everything routine rolls
 * into the day's **report** section, because successful auto-publishing is the
 * highest-volume thing that happens and listing it one line at a time is what
 * teaches people to stop reading the badge.
 */
export function ActivityFeed() {
  const { t } = useTranslation()
  const { entries, now, isLoading, isError } = useActivityFeed()
  const {
    lastSeen,
    isLoading: lastSeenLoading,
    markAllRead,
  } = useActivityLastSeen()
  // There is no server raising or resolving tasks, so a screen has to. Both
  // this one and the Tasks board do — they are separate destinations and can
  // never be mounted at once, so there is still only ever one writer, and a
  // task's closure reaches the feed on whichever of the two you opened. See
  // `useTaskReconciliation`.
  useTaskReconciliation()

  const unread = useMemo(
    () => entries.filter((entry) => isUnread(entry, lastSeen, now)).length,
    [entries, lastSeen, now],
  )

  // The feed is already in time order; grouping only cuts it into days.
  const days = useMemo(() => {
    const out: { date: string; entries: ActivityEntry[] }[] = []
    for (const entry of entries) {
      const date = dayKey(new Date(entry.at))
      const last = out[out.length - 1]
      if (last?.date === date) last.entries.push(entry)
      else out.push({ date, entries: [entry] })
    }
    return out
  }, [entries])

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    )
  }

  if (isError) {
    return (
      <PageContainer>
        <PageError header={t('activity.loadFailed')} />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="fullFlex">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader
          title={t('activity.title')}
          actions={
            // Top-right, against the corner contract's "views only" rule, and
            // deliberately: marking the feed read changes nothing in the
            // workspace — no document, no post, nothing another member can see
            // — only which of these sections are still lit for this reader.
            // That is a property of the view, which is what this corner is for.
            <MarkAllReadButton
              unread={unread}
              settled={!lastSeenLoading}
              onClick={markAllRead}
            />
          }
        />

        {days.length === 0 ? (
          <div className="grow grid px-3 lg:px-6 pb-6">
            <PageGridEmptyState
              title={t('activity.empty.title')}
              subtitle={t('activity.empty.subtitle')}
            />
          </div>
        ) : (
          // Same stack as the Campaigns list — one card per day, same gap, same
          // gutters — so the two screens are read the same way.
          <div className="flex flex-col gap-3 px-3 lg:px-6 pt-4 pb-10">
            {days.map((day) => (
              <DayCard
                key={day.date}
                date={day.date}
                entries={day.entries}
                lastSeen={lastSeen}
                now={now}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}

/**
 * MARK ALL READ, which is only worth words while there is something to mark.
 *
 * With nothing unread it keeps the ticks and drops the label — the calendar's
 * unscheduled counter verbatim, and for the same reason: reading the last
 * entry is a thing the user just did, and the corner it happened in should
 * settle rather than jump. So the label slides shut on the chrome's own 200ms
 * linear curve instead of being unmounted.
 *
 * The measured width is what makes that animate at all: `width: auto` does not
 * interpolate. The 8px gap lives on the inner span rather than on the button,
 * so it is inside the measured width and collapses with the word instead of
 * leaving a space behind the ticks.
 */
function MarkAllReadButton({
  unread,
  settled,
  onClick,
}: {
  unread: number
  settled: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()
  const hasUnread = unread > 0

  const labelRef = useRef<HTMLSpanElement>(null)
  const [labelWidth, setLabelWidth] = useState(0)
  useLayoutEffect(() => {
    const el = labelRef.current
    if (!el) return
    const measure = () => setLabelWidth(el.offsetWidth)
    measure()
    // `w-max` keeps the span's natural width inside the collapsed box, so this
    // fires for a language switch or a webfont landing late.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Held off until the stored last-read moment is in: before that everything
  // counts as read, so the label would play its opening on every cold load —
  // an animation reporting nothing.
  const [animate, setAnimate] = useState(false)
  useEffect(() => {
    if (!settled || animate) return
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [settled, animate])

  return (
    <Button
      variant="ghost"
      size="lg"
      className="gap-0"
      disabled={!hasUnread}
      onClick={onClick}
      // The label is gone in the state where it is needed most for anyone not
      // reading the screen, so the name lives here in both states.
      aria-label={t('activity.markAllRead')}
    >
      <ChecksIcon weight="bold" className="size-4" />
      <span
        className={cn(
          'overflow-hidden',
          animate && 'transition-[width] duration-200 ease-linear',
        )}
        style={{ width: hasUnread ? labelWidth : 0 }}
      >
        <span ref={labelRef} className="block w-max whitespace-nowrap pl-2">
          {t('activity.markAllRead')}
        </span>
      </span>
    </Button>
  )
}

/**
 * One day. The card itself is not a link — it holds several destinations, and
 * a card that also went somewhere would be competing with its own sections.
 */
function DayCard({
  date,
  entries,
  lastSeen,
  now,
}: {
  date: string
  entries: ActivityEntry[]
  lastSeen: string | null
  now: Date
}) {
  const dayLabel = useDayLabel()

  return (
    <article className="w-full max-w-content mx-auto rounded-md bg-primary p-5 flex flex-col gap-4 min-w-0">
      {/* The day is the card's whole title. No second line: what happened is
          the sections' job, and a summary above them would say it twice. */}
      <h2 className="font-display text-base/6 font-medium truncate">
        {dayLabel(date, now)}
      </h2>

      <div className="flex flex-col">
        {entries.map((entry) => (
          <EntrySection
            key={entry.id}
            entry={entry}
            unread={isUnread(entry, lastSeen, now)}
          />
        ))}
      </div>
    </article>
  )
}

/**
 * One section of a day: a report, or a single exception. Both are links — an
 * entry that tells you something happened and then leaves you to find it is
 * half a feature — so the whole section is the target rather than a trailing
 * "view" affordance.
 */
function EntrySection({
  entry,
  unread,
}: {
  entry: ActivityEntry
  unread: boolean
}) {
  const { t } = useTranslation()
  const timeLabel = useTimeLabel()

  const heading = (icon: ReactNode, title: string, linked = true) => (
    <div className="flex items-center gap-3 min-w-0">
      {icon}
      <span className="min-w-0 flex-1 truncate text-sm text-primary-foreground">
        {title}
      </span>
      <span className="shrink-0 font-mono text-xs text-tertiary-foreground">
        {timeLabel(entry.at)}
      </span>
      {/* The dot is what "unread" means here — there is no other state, and
          there deliberately won't be one until tasks arrive to own dismissing
          and resolving. */}
      <span
        className={cn(
          'size-2 shrink-0 rounded-md',
          unread ? 'bg-tertiary-foreground' : 'bg-transparent',
        )}
        aria-label={unread ? t('activity.unread') : undefined}
      />
      {/* A caret is a promise that there is somewhere to go. What happened to
          a task has no destination of its own — the task is upstairs on the
          card — so that row keeps the space and drops the mark. */}
      {linked ? (
        <CaretRightIcon
          className="size-4 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
          weight="bold"
          aria-hidden
        />
      ) : (
        <span className="size-4 shrink-0" aria-hidden />
      )}
    </div>
  )

  // Sections stack inside the card, divided rather than boxed: a border on a
  // border reads as a card in a card, and the card's own surface is already
  // doing that work.
  const className =
    'group flex flex-col gap-3 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0'

  if (entry.kind === 'report') {
    return (
      // The counts stay in the report itself: a tile row per day turned the
      // page into a wall of mostly-zero figures, and the feed's job is to say
      // a day is worth opening, not to be the report.
      <Link
        to="/activity/$date"
        params={{ date: entry.report.date }}
        className={className}
      >
        {heading(
          <NotebookIcon
            weight="regular"
            className="size-5 shrink-0 text-tertiary-foreground"
          />,
          t('activity.entry.reportTitle'),
        )}
      </Link>
    )
  }

  if (isTaskEntry(entry)) {
    return (
      <div className={className}>
        {heading(
          entry.kind === 'task_completed' ? (
            <CheckCircleIcon
              weight="regular"
              className="size-5 shrink-0 text-positive"
            />
          ) : entry.kind === 'task_resolved' ? (
            <ArrowCounterClockwiseIcon
              weight="regular"
              className="size-5 shrink-0 text-tertiary-foreground"
            />
          ) : (
            <CheckSquareIcon
              weight="regular"
              className="size-5 shrink-0 text-tertiary-foreground"
            />
          ),
          t(`activity.entry.${entry.kind}`, { title: entry.title }),
          false,
        )}
      </div>
    )
  }

  return (
    <Link
      to="/campaigns/$campaignId/posts/$postId"
      params={{ campaignId: entry.campaignId, postId: entry.postId }}
      className={className}
    >
      {heading(
        entry.kind === 'failed' ? (
          <WarningOctagonIcon
            weight="regular"
            className="size-5 shrink-0 text-negative"
          />
        ) : (
          <ProhibitIcon
            weight="regular"
            className="size-5 shrink-0 text-warning"
          />
        ),
        t(
          entry.kind === 'failed'
            ? 'activity.entry.failed'
            : 'activity.entry.notPublished',
          {
            channel: channelName(entry.platformId),
          },
        ),
      )}
    </Link>
  )
}

/**
 * A channel's display name. The dictionary still knows a platform the API has
 * stopped returning, and naming it is the difference between a row you can act
 * on and one that says something failed somewhere.
 */
export function channelName(platformId: string): string {
  return getPlatformInfo(platformId)?.name ?? platformId
}
