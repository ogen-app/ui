import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import folderEmptyImage from '@/assets/illustrations/folder-empty.webp'
import { addDays, isSameDay, monthWeeks, startOfWeek, weekdayLabel } from './calendar/date'
import { formatDate } from '@/lib/intl'
import { cn } from '@/lib'

type Props = {
  /** Which surface is empty — decides the backdrop sketch, copy and scale. */
  variant: 'week' | 'month' | 'list' | 'panel'
  /** Whose calendar preferences shape the calendar sketch. */
  campaignId: string
  /** Range to sketch behind the prompt. Defaults to the current week/month. */
  anchor?: Date
  onAddPost: () => void
  pending?: boolean
}

/**
 * Which pair of catalogue keys each surface reads. Week and month deliberately
 * share theirs — it is the same empty calendar, and a user switching
 * granularity on an empty campaign should not be told two different things
 * about it.
 *
 * Keys rather than the copy itself: a table of sentences built at module scope
 * would freeze whichever language loaded first.
 */
const COPY = {
  week: { title: 'calendar.empty.calendarTitle', subtitle: 'calendar.empty.calendarSubtitle' },
  month: { title: 'calendar.empty.calendarTitle', subtitle: 'calendar.empty.calendarSubtitle' },
  list: { title: 'calendar.empty.listTitle', subtitle: 'calendar.empty.listSubtitle' },
  panel: { title: 'calendar.empty.panelTitle', subtitle: 'calendar.empty.panelSubtitle' },
} as const

// How many placeholder cards each weekday column gets. Fixed (not random)
// so the sketch is stable across renders and matches on every reload.
const GHOSTS_PER_DAY = [1, 0, 2, 1, 0, 1, 0]

/**
 * Empty state for a campaign surface with no posts. It draws a faded,
 * non-interactive sketch of whatever would normally fill the space — the week
 * columns, the list rows, the panel's card stack — so the page reads as
 * "waiting to be filled" rather than as a blank slate, then centers the
 * invitation to add the first post on top of it.
 */
export function PostsEmptyState({
  variant,
  campaignId,
  anchor,
  onAddPost,
  pending,
}: Props) {
  const { t, i18n } = useTranslation()
  const { firstDayOfWeek, hiddenDays } = useCalendarSettings(campaignId)
  const compact = variant === 'panel'
  const locale = i18n.language

  const columns = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeek(anchor ?? today, firstDayOfWeek)
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      .filter((day) => !hiddenDays.includes(day.getDay()))
      .map((day, i) => ({
        key: day.toDateString(),
        label: weekdayLabel(day, locale),
        dateLabel: `${day.getDate()} ${formatDate(day, { month: 'long' }, locale)}`,
        isToday: isSameDay(day, today),
        ghosts: GHOSTS_PER_DAY[i % GHOSTS_PER_DAY.length],
      }))
  }, [anchor, firstDayOfWeek, hiddenDays, locale])

  const monthGrid = useMemo(
    () =>
      variant === 'month'
        ? monthWeeks(anchor ?? new Date(), firstDayOfWeek, hiddenDays)
        : null,
    [variant, anchor, firstDayOfWeek, hiddenDays],
  )

  return (
    <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden">
      {/* Backdrop sketch — decorative only. The rail panel is too narrow for
          it to read as anything but noise, so it gets a plain background. */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 select-none',
          variant === 'week' ? 'flex gap-0.5' : 'flex flex-col gap-0.5',
        )}
      >
        {variant === 'list' && <ListSketch />}
        {monthGrid && <MonthSketch weeks={monthGrid} />}
        {variant === 'week' &&
          columns.map((col) => (
            <div key={col.key} className="flex flex-col min-w-[150px] flex-1 gap-0.5">
              <div className="shrink-0 bg-secondary px-2 pt-2.5 pb-2 flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    'text-base font-medium leading-6 text-secondary-foreground',
                    col.isToday && 'underline decoration-2 underline-offset-2',
                  )}
                >
                  {col.label}
                </span>
                <span className="text-xs leading-4 text-tertiary-foreground tabular-nums">
                  {col.dateLabel}
                </span>
              </div>
              <div className="flex-1 bg-secondary px-2 py-2 flex flex-col gap-2">
                {Array.from({ length: col.ghosts }, (_, i) => (
                  <div
                    key={i}
                    className="h-16 shrink-0 border-2 border-dashed border-border"
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Wash the sketch back so the prompt stays the focal point. */}
      {!compact && (
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-b from-background/60 via-background/85 to-background"
        />
      )}

      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          compact ? 'px-3' : 'px-6',
        )}
      >
        {/* Capped at 360px so the copy breaks the same way on a narrow rail
            panel as on a full-width page. */}
        <div
          className={cn(
            'w-full max-w-[360px] flex flex-col items-center text-center',
            compact ? 'gap-3' : 'gap-5',
          )}
        >
          <img
            src={folderEmptyImage}
            alt=""
            aria-hidden
            className={cn('h-auto', compact ? 'w-24 mb-1' : 'w-40 mb-5')}
          />
          <div
            className={cn(
              'text-tertiary-foreground',
              compact ? 'space-y-1 text-sm' : 'space-y-2',
            )}
          >
            <div
              className={cn(
                'text-foreground font-display font-medium',
                compact ? 'text-lg/6' : 'text-2xl/8',
              )}
            >
              {t(COPY[variant].title)}
            </div>
            <div>{t(COPY[variant].subtitle)}</div>
          </div>
          <Button
            variant="defaultInverted"
            size={compact ? 'sm' : 'default'}
            // Wrapped, not passed bare: callers hand us `useAddPost`, whose
            // optional `day` parameter would swallow the MouseEvent and blow
            // up in `atDefaultTime`. The `() => void` prop type hides that
            // from the compiler, so the wrapper has to live here.
            onClick={() => onAddPost()}
            loading={pending}
          >
            <PlusIcon className="size-4" />
            <span>{t('calendar.addPost')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Grid-shaped twin of the week sketch, for the month view. Draws the real
 * month's shape — the row count is what makes a month look like that month —
 * with a scattering of ghost cards, so the empty state reads as the same
 * surface the posts will land on.
 */
function MonthSketch({ weeks }: { weeks: Date[][] }) {
  return (
    <>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-1 gap-0.5">
          {week.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className="flex flex-1 min-w-0 flex-col gap-1 overflow-hidden bg-secondary p-1"
            >
              <span className="text-xs leading-4 tabular-nums text-tertiary-foreground">
                {day.getDate()}
              </span>
              {Array.from(
                { length: GHOSTS_PER_DAY[(weekIndex + dayIndex) % GHOSTS_PER_DAY.length] },
                (_, i) => (
                  <div key={i} className="h-5 shrink-0 border-2 border-dashed border-border" />
                ),
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

/**
 * The real table's headers, read from the same keys it reads — this is a
 * sketch of *that* table, so a column renamed there must not leave a
 * different word behind here.
 */
const LIST_COLUMNS = [
  'postsTable.columnTitle',
  'postsTable.columnStatus',
  'postsTable.columnPlatform',
  'postsTable.columnPublishDate',
  'postsTable.columnWhen',
] as const

/** Table-shaped twin of the week sketch, for the list view. */
function ListSketch() {
  const { t } = useTranslation()
  return (
    <>
      <div className="shrink-0 grid grid-cols-5 gap-px bg-table-header px-3 py-2">
        {LIST_COLUMNS.map((key) => (
          <span key={key} className="text-xs text-tertiary-foreground">
            {t(key)}
          </span>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-2 px-3 py-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="h-[34px] shrink-0 border-2 border-dashed border-border"
          />
        ))}
      </div>
    </>
  )
}
