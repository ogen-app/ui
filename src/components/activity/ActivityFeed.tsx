import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { Link } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  ArrowCounterClockwiseIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  InfoIcon,
  NotebookIcon,
  WarningIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState'
import { useActivityFeed } from '@/hooks/useActivity'
import {
  useMarkNotificationsReadThrough,
  useNotificationUnreadCount,
  useReadOnSight,
  useSetNotificationRead,
} from '@/hooks/useNotifications'
import { useTaskReconciliation } from '@/hooks/useTasks'
import { notificationCopy, notificationTarget } from '@/lib/notifications'
import { NOTIFICATION_PAGE_SIZE } from '@/lib/notificationCache'
import { ACTIVITY_REPORT_DAYS } from '@/services/api/activity'
import {
  dayKey,
  isTaskEntry,
  seenBeforeDivider,
  type ActivityEntry,
} from '@/lib/activityFeed'
import type { ActivityReportSummary } from '@/types/activity'
import type { AppNotification } from '@/types/notifications'
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
 * **Notifications** — a post that failed, a connection about to lapse, a
 * content plan that finished — get a section of their own at the moment they
 * happened. Everything routine rolls into the day's **report** section, because
 * successful auto-publishing is the highest-volume thing that happens and
 * listing it one line at a time is what teaches people to stop reading the
 * badge.
 *
 * **Read and unread are the only verbs here**, and that is a decision rather
 * than a first cut. Dismiss, resolve and snooze are all *task* verbs; putting
 * them on a feed teaches people that clearing an entry fixes something, which
 * it never does. The API offers a dismiss and this screen deliberately does not
 * call it — what is owed is the module next door (CON-234).
 *
 * **And reading is looking.** There is no MARK ALL READ: a row is read once it
 * has been on screen (`useReadOnSight`), so the rail's badge drains as the page
 * is scrolled rather than on a button nobody can press honestly — clearing
 * rows you never scrolled to is exactly what the badge exists to stop. What
 * the button did that looking cannot is reach past the page: the count spans
 * the whole inbox and the feed holds the newest hundred rows, so an inbox with
 * more unread than that would badge forever. Reaching the foot of a full page
 * covers it — everything older than the oldest row shown is marked read,
 * because the page is as far back as this screen goes.
 */
export function ActivityFeed() {
  const { t } = useTranslation()
  const {
    entries,
    now,
    isLoading,
    isError,
    isTruncated,
    degraded,
    campaignOfPost,
  } = useActivityFeed()
  // The badge is the inbox's own count, not a count of what is on screen: the
  // page is the newest hundred rows and the number is over all of them.
  const unread = useNotificationUnreadCount()
  const setRead = useSetNotificationRead()
  const { recent, watch } = useReadOnSight()
  const markReadThrough = useMarkNotificationsReadThrough()
  // There is no server raising or resolving tasks, so a screen has to. Both
  // this one and the Tasks board do — they are separate destinations and can
  // never be mounted at once, so there is still only ever one writer, and a
  // task's closure reaches the feed on whichever of the two you opened. See
  // `useTaskReconciliation`.
  useTaskReconciliation()

  // What the page holds of the inbox: its oldest row, and how many of its rows
  // are unread. More unread in the count than on the page means some are older
  // than anything this screen can show.
  const page = useMemo(() => {
    let oldest: number | null = null
    let unreadHere = 0
    for (const entry of entries) {
      if (entry.kind !== 'notification') continue
      const { seq, read_at } = entry.notification
      if (oldest === null || seq < oldest) oldest = seq
      if (!read_at) unreadHere += 1
    }
    return { oldest, unreadHere }
  }, [entries])
  const unreadBeyondPage =
    isTruncated && page.oldest !== null && unread > page.unreadHere
  const endRef = useSightedOnce(
    unreadBeyondPage && page.oldest !== null
      ? markReadThrough.bind(null, page.oldest)
      : null,
  )

  // Where what is new on this visit ends — see `seenBeforeDivider`.
  const dividerBefore = useMemo(
    () => seenBeforeDivider(entries, recent),
    [entries, recent],
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
        <PageHeader title={t('activity.title')} />

        {/* A source failed while another answered. Above the cards and above
            the empty state, because the empty state is where the silence lies
            hardest: a feed whose notifications failed reads as a quiet
            workspace without it. */}
        {degraded.length > 0 && (
          <div className="px-3 lg:px-6 pt-4">
            {degraded.map((source) => (
              <p
                key={source}
                className="w-full max-w-content mx-auto px-1 text-xs text-warning"
              >
                {t(`activity.unavailable.${source}`)}
              </p>
            ))}
          </div>
        )}

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
                now={now}
                campaignOfPost={campaignOfPost}
                recent={recent}
                watch={watch}
                dividerBefore={dividerBefore}
                onOpen={(id) => setRead.mutate({ id, read: true })}
              />
            ))}
            {/* Said rather than swallowed: a list that stops at a round number
                with no word about it reads as "that is everything". Both halves
                have a ceiling now — the recorded page and the run of days — so
                the sentence names both rather than implying one goes further. */}
            {isTruncated && (
              <p
                ref={endRef}
                className="w-full max-w-content mx-auto px-1 text-xs text-tertiary-foreground"
              >
                {t('activity.truncated', {
                  entries: NOTIFICATION_PAGE_SIZE,
                  days: ACTIVITY_REPORT_DAYS,
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}

/**
 * Runs `action` the first time the element is on screen with the tab visible,
 * and never again for this mount. `null` means there is nothing to do yet —
 * the element is still watched, so the action fires if it becomes due while
 * the element is already in view.
 */
function useSightedOnce(action: (() => void) | null) {
  const actionRef = useRef(action)
  const inView = useRef(false)
  const done = useRef(false)

  const fire = useCallback(() => {
    if (done.current || !inView.current || !actionRef.current) return
    if (document.visibilityState !== 'visible') return
    done.current = true
    actionRef.current()
  }, [])

  useEffect(() => {
    actionRef.current = action
    fire()
  }, [action, fire])

  useEffect(() => {
    document.addEventListener('visibilitychange', fire)
    return () => document.removeEventListener('visibilitychange', fire)
  }, [fire])

  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return undefined
      const io = new IntersectionObserver(([entry]) => {
        inView.current = entry?.isIntersecting ?? false
        fire()
      })
      io.observe(el)
      return () => io.disconnect()
    },
    [fire],
  )
}

/**
 * One day. The card itself is not a link — it holds several destinations, and
 * a card that also went somewhere would be competing with its own sections.
 */
function DayCard({
  date,
  entries,
  now,
  campaignOfPost,
  recent,
  watch,
  dividerBefore,
  onOpen,
}: {
  date: string
  entries: ActivityEntry[]
  now: Date
  campaignOfPost: (postId: string) => string | null
  recent: ReadonlySet<string>
  watch: (el: HTMLElement | null) => (() => void) | undefined
  /** The entry the "seen before this visit" line sits above, if it is here. */
  dividerBefore: string | null
  onOpen: (notificationId: string) => void
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
        {entries.map((entry) => {
          const divided = entry.id === dividerBefore
          return (
            <Fragment key={entry.id}>
              {divided && <SeenBeforeDivider />}
              <EntrySection
                entry={entry}
                campaignOfPost={campaignOfPost}
                recent={recent}
                watch={watch}
                divided={divided}
                onOpen={onOpen}
              />
            </Fragment>
          )
        })}
      </div>
    </article>
  )
}

/**
 * The line between what is new on this visit and what was there before it.
 *
 * It stands in for the section border it replaces rather than adding a second
 * rule beside it, and it is labelled on the *old* side, because it sits below
 * the new rows: in a newest-first feed "new" is simply the top, and what needs
 * saying is where that stops.
 */
function SeenBeforeDivider() {
  const { t } = useTranslation()
  return (
    <div
      role="separator"
      aria-label={t('activity.seenBefore')}
      className="flex items-center gap-3 py-2 first:pt-0"
    >
      {/* A short lead-in, so the label reads as set into the rule rather than
          as a heading above it. */}
      <span aria-hidden className="h-px w-5 shrink-0 bg-border" />
      {/* Capitals are styling here, not copy: this is a label, not a
          destructive action, and the `aria-label` should read as a sentence. */}
      <span
        aria-hidden
        className="shrink-0 font-mono text-xs uppercase text-tertiary-foreground"
      >
        {t('activity.seenBefore')}
      </span>
      <span aria-hidden className="h-px grow bg-border" />
    </div>
  )
}

/**
 * One section of a day: a report, or one recorded notification, or something
 * that happened to a task. Most are links — an entry that tells you something
 * happened and then leaves you to find it is half a feature — so the whole
 * section is the target rather than a trailing "view" affordance.
 */
function EntrySection({
  entry,
  campaignOfPost,
  recent,
  watch,
  divided = false,
  onOpen,
}: {
  entry: ActivityEntry
  campaignOfPost: (postId: string) => string | null
  recent: ReadonlySet<string>
  watch: (el: HTMLElement | null) => (() => void) | undefined
  /** Sits under the "seen before" line, which takes the place of its border. */
  divided?: boolean
  onOpen: (notificationId: string) => void
}) {
  const { t } = useTranslation()
  const timeLabel = useTimeLabel()
  // Only a recorded row can be unread. A report is arithmetic and a task entry
  // belongs to the module next door; neither has a read state to carry, and
  // inventing one would put a dot beside something nobody can clear.
  //
  // `recent` wins over the record: a row read on sight is written read at
  // once, but it keeps its mark until the reader leaves — see `useReadOnSight`.
  const seen: 'unseen' | 'recent' | 'seen' =
    entry.kind !== 'notification'
      ? 'seen'
      : recent.has(entry.notification.id)
        ? 'recent'
        : entry.notification.read_at
          ? 'seen'
          : 'unseen'

  const heading = (icon: ReactNode, title: string, linked = true) => (
    <div className="flex items-center gap-3 min-w-0">
      {icon}
      <span className="min-w-0 flex-1 truncate text-sm text-primary-foreground">
        {title}
      </span>
      <span className="shrink-0 font-mono text-xs text-tertiary-foreground">
        {timeLabel(entry.at)}
      </span>
      {/* A filled dot is unseen; a ring is seen for the first time on this
          visit — already read as far as the badge is concerned, and marked
          only so that arriving on the page does not wipe out the one thing it
          came to show. The ring is the dot hollowed out rather than a second
          mark, so a row turning from one to the other reads as the same
          signal settling. */}
      <span
        className={cn(
          'size-2 shrink-0 rounded-md border-[1.5px] transition-colors duration-200',
          seen === 'unseen' &&
            'border-tertiary-foreground bg-tertiary-foreground',
          seen === 'recent' && 'border-tertiary-foreground bg-transparent',
          seen === 'seen' && 'border-transparent bg-transparent',
        )}
        aria-label={
          seen === 'unseen'
            ? t('activity.unread')
            : seen === 'recent'
              ? t('activity.recent')
              : undefined
        }
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
  const className = cn(
    'group flex flex-col gap-3 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0',
    divided && 'border-t-0 pt-2',
  )

  if (entry.kind === 'report') {
    const headline = reportHeadline(t, entry.report)
    return (
      // One line, not a tile row: the figures a day is worth opening *for* are
      // the four totals, and the list endpoint carries them, but a grid of
      // mostly-zero tiles per day turned the page into a wall. Everything else
      // — by channel, by author, which posts failed — stays in the report.
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
        {headline && (
          <p className="pl-8 text-xs text-tertiary-foreground">{headline}</p>
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

  const { notification } = entry
  const copy = notificationCopy(notification)
  // The catalogue where this build knows the type, the server's own English
  // where it doesn't. A producer can ship before its copy does, and a blank
  // row would be the worse of the two failures — see `lib/notifications`.
  const title = copy ? t(copy.key, copy.vars) : notification.title
  const target = notificationTarget(notification, campaignOfPost)
  const icon = <LevelIcon level={notification.level} />
  // Watched only while unseen: once the row is recent or read there is nothing
  // left for looking at it to change, and dropping the ref stops the watch.
  const sight = {
    ref: seen === 'unseen' ? watch : undefined,
    'data-notification-id': notification.id,
  }

  if (!target) {
    // Nothing to open — an entity that has been deleted, or a type this build
    // cannot place. The row still says what happened, which is the part that
    // matters; it just makes no promise about going anywhere.
    return (
      <div {...sight} className={className}>
        {heading(icon, title, false)}
      </div>
    )
  }

  return (
    <Link
      {...sight}
      to={target.to}
      params={target.params}
      className={className}
      // Opening what an entry points at *is* reading it. The click navigates
      // either way — a failed write leaves the row unread, which is the
      // harmless direction to fail in.
      onClick={() => onOpen(notification.id)}
    >
      {heading(icon, title)}
    </Link>
  )
}

/**
 * A day in one line — "6 posts published · 1 post failed to publish".
 *
 * Each count is a whole sentence from its own key, so the plural agrees in
 * every language, and the separator joins statements rather than assembling one
 * out of fragments. Zeroes are dropped here where the report's tiles keep them:
 * a tile that disappears on a good day makes the reader doubt it was measured,
 * but a feed row listing what did *not* happen is the noise this row exists to
 * avoid. A day with nothing on it is not in the list at all, so the empty
 * string is only reachable if the server sends a row of zeroes.
 */
function reportHeadline(t: TFunction, report: ActivityReportSummary): string {
  return [
    report.published_total > 0 &&
      t('activity.report.published', { count: report.published_total }),
    report.failed_total > 0 &&
      t('activity.report.failed', { count: report.failed_total }),
    report.created_total > 0 &&
      t('activity.report.created', { count: report.created_total }),
    report.campaigns_created_total > 0 &&
      t('activity.report.campaignsCreated', {
        count: report.campaigns_created_total,
      }),
  ]
    .filter((part): part is string => typeof part === 'string')
    .join(' · ')
}

/**
 * The mark beside an entry, chosen by severity and never by type.
 *
 * `type` is an open vocabulary that grows whenever the back end has something
 * new to say; `level` is four values and closed. Switching on the first would
 * mean every new producer arrives unstyled — see `lib/notifications`.
 */
function LevelIcon({ level }: { level: AppNotification['level'] }) {
  const className = 'size-5 shrink-0'
  switch (level) {
    case 'error':
      return (
        <WarningOctagonIcon
          weight="regular"
          className={cn(className, 'text-negative')}
        />
      )
    case 'warning':
      return (
        <WarningIcon
          weight="regular"
          className={cn(className, 'text-warning')}
        />
      )
    case 'success':
      return (
        <CheckCircleIcon
          weight="regular"
          className={cn(className, 'text-positive')}
        />
      )
    default:
      return (
        <InfoIcon
          weight="regular"
          className={cn(className, 'text-tertiary-foreground')}
        />
      )
  }
}
