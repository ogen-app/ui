import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { Explainer } from '@/components/page-primitives/Explainer'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextSelect } from '@/components/ui/text-select'
import { cn } from '@/lib'
import {
  WEEKDAY_TOKENS,
  isValidClock,
  type WeekdayToken,
} from '@/lib/campaignScheduling'
import { describeTimeZone, timeZoneNames } from '@/lib/timeZones'
import type { SettingsFormValues } from './schema'

// The server's own token order is Monday-first, which is also how a publishing
// week reads even where the calendar starts on Sunday — so the picker walks the
// tokens as they come.
const DAY_LABELS: Record<WeekdayToken, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

const DAY_NAMES: Record<WeekdayToken, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

const SPREAD_OPTIONS = [
  { id: '0', displayValue: 'Exactly on time' },
  { id: '15', displayValue: '± 15 minutes' },
  { id: '30', displayValue: '± 30 minutes' },
  { id: '60', displayValue: '± 1 hour' },
  { id: '120', displayValue: '± 2 hours' },
] as const

/**
 * When the campaign publishes: the hour the scheduler aims at, how far it may
 * drift from it, and the days it skips (CON-181).
 *
 * These are campaign columns, edited on the same form as the rest of the page
 * and written by the header's Save. The content-plan flow reads them when it
 * places each generated draft.
 */
export function SchedulingCard() {
  const form = useFormContext<SettingsFormValues>()
  const publishingTime = form.watch('publishing_time')
  const timezone = form.watch('timezone')
  const spreadMinutes = form.watch('spread_minutes')
  const publishingDays = form.watch('publishing_days')

  const enabledDays = useMemo(
    () => new Set(publishingDays.map((d) => d.trim().toLowerCase())),
    [publishingDays],
  )

  // A stored zone this browser's ICU data doesn't list still has to be
  // selectable, or opening the page would silently offer to replace it.
  const zoneOptions = useMemo(() => {
    const names = timeZoneNames()
    const all = names.includes(timezone) ? names : [timezone, ...names]
    return all.map((name) => ({ id: name, displayValue: describeTimeZone(name) }))
  }, [timezone])

  // The spread the campaign actually has may not be one of the presets — a
  // value written before the list changed, or by the assistant. Show it rather
  // than silently snapping to a neighbour.
  const spreadOptions = SPREAD_OPTIONS.some((o) => Number(o.id) === spreadMinutes)
    ? SPREAD_OPTIONS
    : [
        ...SPREAD_OPTIONS,
        { id: String(spreadMinutes), displayValue: `± ${spreadMinutes} minutes` },
      ]

  const toggleDay = (token: WeekdayToken) => {
    const next = new Set(enabledDays)
    if (next.has(token)) {
      // Switching the last day off would not stop publishing — the server reads
      // an empty set as every day (`scheduling.EnabledWeekdays`), so the card
      // would say "never" while the scheduler published daily.
      if (next.size <= 1) return
      next.delete(token)
    } else {
      next.add(token)
    }
    form.setValue(
      'publishing_days',
      WEEKDAY_TOKENS.filter((t) => next.has(t)),
      { shouldDirty: true },
    )
  }

  const skipped = WEEKDAY_TOKENS.filter((t) => !enabledDays.has(t))

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
          <div className="flex items-stretch gap-4 min-w-0">
            <Input
              id="publish-time"
              type="time"
              inputSize="lg"
              value={publishingTime}
              onChange={(e) => {
                // The time input clears to "" mid-edit, and the server rejects
                // anything that isn't a zero-padded HH:MM.
                if (!isValidClock(e.target.value)) return
                form.setValue('publishing_time', e.target.value, { shouldDirty: true })
              }}
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
                value={timezone}
                onValueChange={(value) =>
                  form.setValue('timezone', value, { shouldDirty: true })
                }
                elements={zoneOptions}
              />
            </div>
          </div>
          <p className="text-xs text-tertiary-foreground">
            Posts are placed around this time, in this zone, on every publishing day.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="publish-spread">Spread</Label>
          <TextSelect
            id="publish-spread"
            variant="default"
            size="lg"
            value={String(spreadMinutes)}
            onValueChange={(v) =>
              form.setValue('spread_minutes', Number(v), { shouldDirty: true })
            }
            elements={spreadOptions}
          />
          <p className="text-xs text-tertiary-foreground">
            How far a post may drift from the publishing time.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label asChild>
          <span>Publishing days</span>
        </Label>
        {/* Seven equal columns across the full width, so the week reads as a
            week rather than as a row of chips that happens to be seven long. */}
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_TOKENS.map((token) => {
            const on = enabledDays.has(token)
            return (
              <button
                key={token}
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={DAY_NAMES[token]}
                onClick={() => toggleDay(token)}
                className={cn(
                  'flex h-16 min-w-0 items-center justify-center rounded-lg border',
                  'px-2 text-[13px] font-medium',
                  'transition-colors cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  on
                    ? 'border-transparent bg-tertiary text-foreground'
                    : 'border-senary-foreground bg-transparent text-tertiary-foreground line-through',
                )}
              >
                {DAY_LABELS[token]}
              </button>
            )
          })}
        </div>
        {/* Outside the Explainer on purpose: this is the state of the campaign,
            not a lesson, so it has to survive the note being closed. */}
        <p className="text-xs text-tertiary-foreground">
          {skipped.length === 0
            ? 'Publishing on every day of the week.'
            : `Skipping ${skipped.map((t) => DAY_NAMES[t]).join(', ')}.`}
        </p>
      </div>
    </SettingsCard>
  )
}
