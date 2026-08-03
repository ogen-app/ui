import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Collapse } from '@/components/ui/collapse'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { TextSelect } from '@/components/ui/text-select'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'

// Displayed Monday-first regardless of the chosen first day of week.
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] as const

const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

const FIRST_DAY_OPTIONS = WEEK_DAYS.map((day) => ({
  id: String(day),
  displayValue: DAY_LABELS[day],
}))

/**
 * "Calendar Settings" content for the right sidebar. The sidebar is
 * non-blocking, so the calendar behind it reflects preference changes live.
 *
 * The preferences are per campaign as well as per user — a launch campaign a
 * user works weekends on and an evergreen one they don't shouldn't share a
 * week shape — so the panel needs the campaign it was opened from.
 */
export function CalendarSettingsPanel({
  campaignId,
  onClose,
}: {
  campaignId: string
  onClose?: () => void
}) {
  const { firstDayOfWeek, hiddenDays, isPending, setFirstDayOfWeek, setDayVisible } =
    useCalendarSettings(campaignId)

  return (
    <RailPanel title="Calendar Settings" onClose={onClose} className="h-full">
      <Collapse title="PREFERENCES" defaultOpen className="border-b border-border pb-6">
        <div className="flex flex-col gap-1.5 pt-2">
          <span className="text-xs text-tertiary-foreground">First Day of Week</span>
          {/* The controls are the settings — showing the defaults here would
              not just look wrong, it would let a flip write them back over
              what is stored, since a change sends the whole blob. */}
          {isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <TextSelect
              value={String(firstDayOfWeek)}
              onValueChange={(v) => setFirstDayOfWeek(Number(v))}
              elements={FIRST_DAY_OPTIONS}
            />
          )}
        </div>
      </Collapse>

      <Collapse title="DAYS VISIBILITY" defaultOpen className="border-b border-border pb-6">
        <div className="flex flex-col gap-1 pt-2">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="flex h-10 items-center justify-between bg-secondary px-4"
            >
              <span className="text-sm">{DAY_LABELS[day]}</span>
              {isPending ? (
                <Skeleton className="h-5 w-9" />
              ) : (
                <Switch
                  checked={!hiddenDays.includes(day)}
                  onCheckedChange={(checked) => setDayVisible(day, checked)}
                  aria-label={`Show ${DAY_LABELS[day]}`}
                />
              )}
            </div>
          ))}
        </div>
      </Collapse>
    </RailPanel>
  )
}
