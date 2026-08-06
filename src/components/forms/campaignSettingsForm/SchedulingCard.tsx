import { useMemo } from 'react'

import { Explainer } from '@/components/page-primitives/Explainer'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TextSelect } from '@/components/ui/text-select'
import { useSchedulingPreferences } from '@/hooks/useSchedulingPreferences'
import { cn } from '@/lib'
import { describeTimeZone, timeZoneNames } from '@/lib/timeZones'

// Monday-first, which is how a publishing week reads even where the calendar
// starts on Sunday.
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] as const

const DAY_LABELS: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
}

const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

const DEVIATION_OPTIONS = [
  { id: '0', displayValue: 'Exactly on time' },
  { id: '15', displayValue: '± 15 minutes' },
  { id: '30', displayValue: '± 30 minutes' },
  { id: '60', displayValue: '± 1 hour' },
  { id: '120', displayValue: '± 2 hours' },
] as const

/**
 * When the campaign publishes: the hour the scheduler aims at, how far it may
 * drift from it, and the days it must skip (CON-156 §1).
 *
 * These are not campaign fields — they are saved on their own, immediately,
 * through the settings store rather than through the page's Save. See
 * `useSchedulingPreferences`.
 */
export function SchedulingCard({ campaignId }: { campaignId: string }) {
  const {
    publishTime,
    timeZone,
    maxDeviationMinutes,
    bannedDays,
    isPending,
    setPublishTime,
    setTimeZone,
    setMaxDeviationMinutes,
    setDayBanned,
  } = useSchedulingPreferences(campaignId)

  // A stored zone this browser's ICU data doesn't list still has to be
  // selectable, or opening the page would silently offer to replace it.
  const zoneOptions = useMemo(() => {
    const names = timeZoneNames()
    const all = names.includes(timeZone) ? names : [timeZone, ...names]
    return all.map((name) => ({ id: name, displayValue: describeTimeZone(name) }))
  }, [timeZone])

  // The deviation the campaign actually has may not be one of the presets — a
  // value written before the list changed, or by the assistant. Show it rather
  // than silently snapping to a neighbour.
  const deviationOptions = DEVIATION_OPTIONS.some(
    (o) => Number(o.id) === maxDeviationMinutes,
  )
    ? DEVIATION_OPTIONS
    : [
        ...DEVIATION_OPTIONS,
        { id: String(maxDeviationMinutes), displayValue: `± ${maxDeviationMinutes} minutes` },
      ]

  return (
    <SettingsCard title="Scheduling">
      <Explainer id="campaign-scheduling-preferences">
        The assistant places every post at the publishing time, then nudges each one a
        little either side of it so a week of posts doesn&rsquo;t all land on the same
        minute. Days you switch off are skipped entirely.
      </Explainer>

      {/* One gap for all three controls: time, zone and spread sit on the same
          line, and a tighter gap inside the pair than beside it made the row
          read as two rows that happen to be level. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-5">
        {/* Time and zone are one setting read in two parts — an hour without
            its zone means nothing — so they share a column and a single
            description under the pair rather than each carrying their own. */}
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="publish-time">Publishing time</Label>
          {isPending ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="flex items-stretch gap-4 min-w-0">
              <Input
                id="publish-time"
                type="time"
                inputSize="lg"
                value={publishTime}
                onChange={(e) => setPublishTime(e.target.value)}
                className="w-28 shrink-0"
              />
              {/* The zone name is the long one — "Europe/Amsterdam (GMT+2)" —
                  so it takes what the time field leaves and truncates rather
                  than pushing the row wider. */}
              <div className="min-w-0 flex-1">
                <TextSelect
                  id="publish-timezone"
                  variant="default"
                  size="lg"
                  value={timeZone}
                  onValueChange={setTimeZone}
                  elements={zoneOptions}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-tertiary-foreground">
            Posts are placed around this time, in this zone, on every publishing day.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="publish-spread">Spread</Label>
          {isPending ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <TextSelect
              id="publish-spread"
              variant="default"
              size="lg"
              value={String(maxDeviationMinutes)}
              onValueChange={(v) => setMaxDeviationMinutes(Number(v))}
              elements={deviationOptions}
            />
          )}
          <p className="text-xs text-tertiary-foreground">
            How far a post may drift from the publishing time.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label asChild>
          <span>Publishing days</span>
        </Label>
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          // Seven equal columns across the full width, so the week reads as a
          // week rather than as a row of chips that happens to be seven long.
          <div className="grid grid-cols-7 gap-2">
            {WEEK_DAYS.map((day) => {
              const banned = bannedDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  role="switch"
                  aria-checked={!banned}
                  aria-label={DAY_NAMES[day]}
                  onClick={() => setDayBanned(day, !banned)}
                  className={cn(
                    'flex h-16 min-w-0 items-center justify-center rounded-lg border',
                    'px-2 text-[13px] font-medium',
                    'transition-colors cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    banned
                      ? 'border-senary-foreground bg-transparent text-tertiary-foreground line-through'
                      : 'border-transparent bg-tertiary text-foreground',
                  )}
                >
                  {DAY_LABELS[day]}
                </button>
              )
            })}
          </div>
        )}
        {/* Outside the Explainer on purpose: this is the state of the campaign,
            not a lesson, so it has to survive the note being closed. */}
        <p className="text-xs text-tertiary-foreground">
          {bannedDays.length === 0
            ? 'Publishing on every day of the week.'
            : `Skipping ${bannedDays
                .slice()
                .sort((a, b) => a - b)
                .map((d) => DAY_NAMES[d])
                .join(', ')}.`}
        </p>
      </div>
    </SettingsCard>
  )
}
