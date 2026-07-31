import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { dayLabel, isSameDay, visibleWeekDays, weekdayLabel } from './date'
import { cn } from '@/lib'

type Props = {
  /** The anchor day from the route; the visible week is derived from it. */
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

/** How many cards each column sketches. Fixed, so the week doesn't flicker. */
const CARDS_PER_COLUMN = [2, 1, 3, 1, 2, 0, 1]

/**
 * The weekly calendar with its posts not yet loaded: same columns, same
 * gutters, same card rhythm, so the real week lands into the shape already on
 * screen instead of replacing something else.
 */
export function WeeklyCalendarSkeleton({ anchor, firstDayOfWeek, hiddenDays = [] }: Props) {
  const columns = useMemo(() => {
    if (firstDayOfWeek === null) {
      return Array.from({ length: 7 }, (_, i) => ({
        key: `col-${i}`,
        day: null as Date | null,
      }))
    }
    return visibleWeekDays(anchor, firstDayOfWeek, hiddenDays).map((day) => ({
      key: day.toDateString(),
      day: day as Date | null,
    }))
  }, [anchor, firstDayOfWeek, hiddenDays])

  const today = new Date()

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-auto">
      <div className="flex h-full gap-0.5">
        {columns.map((col, colIndex) => (
          <div key={col.key} className="flex flex-col min-w-[150px] flex-1 min-h-0 gap-0.5">
            <div className="shrink-0 bg-secondary px-2 pt-2.5 pb-2 flex flex-col items-center gap-0.5">
              {col.day ? (
                <>
                  <span
                    className={cn(
                      'text-base font-medium leading-6',
                      isSameDay(col.day, today) &&
                        'underline decoration-2 underline-offset-2',
                    )}
                  >
                    {weekdayLabel(col.day)}
                  </span>
                  <span className="text-xs leading-4 text-tertiary-foreground tabular-nums">
                    {dayLabel(col.day)}
                  </span>
                </>
              ) : (
                <>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </>
              )}
            </div>

            <div className="flex-1 min-h-0 bg-secondary p-1 flex flex-col gap-2">
              {Array.from(
                { length: CARDS_PER_COLUMN[colIndex % CARDS_PER_COLUMN.length] },
                (_, i) => (
                  <Skeleton key={i} className="h-16 shrink-0 w-full" />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
