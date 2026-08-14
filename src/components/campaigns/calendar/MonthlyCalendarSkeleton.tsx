import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { isSameDay, isSameMonth, monthColumnDays, monthWeeks, weekdayShortLabel } from './date'
import { cn } from '@/lib'

type Props = {
  /** The anchor day from the route; the visible month is derived from it. */
  anchor: Date
  /**
   * The user's first day, or `null` while it is still being read. Null draws
   * seven anonymous columns rather than naming days we may have to rename —
   * a wrong Monday is worse than no Monday.
   */
  firstDayOfWeek: number | null
  /** Days this user hides. Ignored while `firstDayOfWeek` is null. */
  hiddenDays?: number[]
}

/**
 * How many cards each cell sketches, walked cyclically across the grid. Fixed
 * rather than random so the month doesn't flicker between renders, and prime
 * (11) so the pattern doesn't line up into stripes down a 7-column grid.
 */
const CARDS_PER_CELL = [1, 0, 2, 0, 1, 3, 0, 1, 0, 2, 1]

/**
 * The month with its posts not yet loaded: same columns, same row count, same
 * card rhythm — so the real month lands into the shape already on screen.
 *
 * It derives its grid from the same `monthWeeks` the calendar uses, which is
 * the only way the two can agree on whether this month takes five rows or six.
 */
export function MonthlyCalendarSkeleton({ anchor, firstDayOfWeek, hiddenDays = [] }: Props) {
  const known = firstDayOfWeek !== null

  const columnDays = useMemo(
    () => (known ? monthColumnDays(firstDayOfWeek, hiddenDays) : null),
    [known, firstDayOfWeek, hiddenDays],
  )

  const weeks = useMemo(() => {
    // Without the first day we can't say which column is which, but the row
    // count is still worth getting right — it decides how tall a row is.
    if (!known) return monthWeeks(anchor, 1)
    return monthWeeks(anchor, firstDayOfWeek, hiddenDays)
  }, [known, anchor, firstDayOfWeek, hiddenDays])

  const today = new Date()

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-0.5">
      <div className="flex shrink-0 gap-0.5">
        {(columnDays ?? weeks[0]).map((day, i) => (
          <div
            key={i}
            className="flex-1 min-w-0 bg-secondary px-2 py-1.5 text-center text-xs font-medium leading-4"
          >
            {columnDays ? weekdayShortLabel(day) : <Skeleton className="mx-auto h-3 w-8" />}
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-0.5">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-1 min-h-0 gap-0.5">
            {week.map((day, dayIndex) => {
              const cells = CARDS_PER_CELL.length
              const ghosts =
                CARDS_PER_CELL[(weekIndex * week.length + dayIndex) % cells]
              const outside = known && !isSameMonth(day, anchor)
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    'flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden bg-secondary p-1',
                    outside && 'bg-secondary/50',
                  )}
                >
                  <div className="flex h-5 shrink-0 items-center">
                    {known ? (
                      <span
                        className={cn(
                          'text-xs leading-4 tabular-nums',
                          outside
                            ? 'text-quaternary-foreground'
                            : 'text-tertiary-foreground',
                          isSameDay(day, today) &&
                            'font-medium text-secondary-foreground underline decoration-2 underline-offset-2',
                        )}
                      >
                        {day.getDate()}
                      </span>
                    ) : (
                      <Skeleton className="h-3 w-4" />
                    )}
                  </div>
                  <div className="flex flex-1 min-h-0 flex-col gap-0.5 overflow-hidden">
                    {Array.from({ length: ghosts }, (_, i) => (
                      <Skeleton key={i} className="h-5 w-full shrink-0" />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
