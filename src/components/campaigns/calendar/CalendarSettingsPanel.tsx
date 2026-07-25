import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Collapse } from '@/components/ui/collapse'
import { Switch } from '@/components/ui/switch'
import { TextSelect } from '@/components/ui/text-select'
import { useCalendarSettingsStore } from '@/stores/calendarSettingsStore'

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
 */
export function CalendarSettingsPanel({ onClose }: { onClose?: () => void }) {
  const firstDayOfWeek = useCalendarSettingsStore((s) => s.firstDayOfWeek)
  const hiddenDays = useCalendarSettingsStore((s) => s.hiddenDays)
  const setFirstDayOfWeek = useCalendarSettingsStore((s) => s.setFirstDayOfWeek)
  const setDayVisible = useCalendarSettingsStore((s) => s.setDayVisible)

  return (
    <RailPanel title="Calendar Settings" onClose={onClose} className="h-full">
      <Collapse title="PREFERENCES" defaultOpen className="border-b border-border pb-6">
        <div className="flex flex-col gap-1.5 pt-2">
          <span className="text-xs text-tertiary-foreground">First Day of Week</span>
          <TextSelect
            value={String(firstDayOfWeek)}
            onValueChange={(v) => setFirstDayOfWeek(Number(v))}
            elements={FIRST_DAY_OPTIONS}
          />
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
              <Switch
                checked={!hiddenDays.includes(day)}
                onCheckedChange={(checked) => setDayVisible(day, checked)}
                aria-label={`Show ${DAY_LABELS[day]}`}
              />
            </div>
          ))}
        </div>
      </Collapse>
    </RailPanel>
  )
}
