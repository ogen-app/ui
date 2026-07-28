import { useMemo } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useCalendarSettingsStore } from '@/stores/calendarSettingsStore'
import folderEmptyImage from '@/assets/illustrations/folder-empty.webp'
import { addDays, isSameDay, startOfWeek } from './calendar/date'
import { cn } from '@/lib'

type Props = {
  /** Which surface is empty — decides the backdrop sketch, copy and scale. */
  variant: 'week' | 'list' | 'panel'
  /** Week to sketch behind the prompt. Defaults to the current week. */
  anchor?: Date
  onAddPost: () => void
  pending?: boolean
}

const COPY = {
  week: {
    title: 'Your calendar is empty',
    subtitle: 'Add your first post and it will show up here, ready to schedule.',
  },
  list: {
    title: 'No posts yet',
    subtitle: 'Add your first post to start building this campaign.',
  },
  panel: {
    title: 'Nothing unscheduled',
    subtitle: 'Posts without a date wait here — drag one off the calendar, or add a new one.',
  },
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
export function PostsEmptyState({ variant, anchor, onAddPost, pending }: Props) {
  const firstDayOfWeek = useCalendarSettingsStore((s) => s.firstDayOfWeek)
  const hiddenDays = useCalendarSettingsStore((s) => s.hiddenDays)
  const compact = variant === 'panel'

  const columns = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeek(anchor ?? today, firstDayOfWeek)
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      .filter((day) => !hiddenDays.includes(day.getDay()))
      .map((day, i) => ({
        key: day.toDateString(),
        label: day.toLocaleDateString(undefined, { weekday: 'long' }),
        dateLabel: `${day.getDate()} ${day.toLocaleDateString(undefined, { month: 'long' })}`,
        isToday: isSameDay(day, today),
        ghosts: GHOSTS_PER_DAY[i % GHOSTS_PER_DAY.length],
      }))
  }, [anchor, firstDayOfWeek, hiddenDays])

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
              {COPY[variant].title}
            </div>
            <div>{COPY[variant].subtitle}</div>
          </div>
          <Button
            variant="defaultInverted"
            size={compact ? 'sm' : 'default'}
            onClick={onAddPost}
            loading={pending}
          >
            <PlusIcon className="size-4" />
            <span>ADD POST</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

const LIST_COLUMNS = ['Title', 'Status', 'Platform', 'Publish date', 'When']

/** Table-shaped twin of the week sketch, for the list view. */
function ListSketch() {
  return (
    <>
      <div className="shrink-0 grid grid-cols-5 gap-px bg-table-header px-3 py-2">
        {LIST_COLUMNS.map((label) => (
          <span key={label} className="text-xs text-tertiary-foreground">
            {label}
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
