import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Collapse } from '@/components/ui/collapse'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { TextSelect } from '@/components/ui/text-select'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useCampaign } from '@/hooks/useCampaigns'
import { publishingDayNumbers } from '@/lib/campaignScheduling'
import {
  CARD_FIELDS,
  CARD_FIELD_LABELS,
  CARD_FIELD_NOTES,
  canHideField,
} from './cardFields'

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
  const {
    firstDayOfWeek,
    hiddenDays,
    card,
    isPending,
    setFirstDayOfWeek,
    setDayVisible,
    setCardField,
  } = useCalendarSettings(campaignId)
  // The campaign's publishing days, so the panel can say which of these rows
  // the campaign will never put anything on. Shares the cached campaign the
  // page around it already loaded, so opening the panel costs no extra request.
  // While it is loading there is nothing to annotate — and no annotation is the
  // right guess, since a campaign publishes on every day by default.
  const { data: campaign } = useCampaign(campaignId)
  const publishingDays = campaign ? publishingDayNumbers(campaign.publishing_days) : null

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
              variant="default"
              size="default"
              value={String(firstDayOfWeek)}
              onValueChange={(v) => setFirstDayOfWeek(Number(v))}
              elements={FIRST_DAY_OPTIONS}
            />
          )}
        </div>
      </Collapse>

      <Collapse title="DAYS VISIBILITY" defaultOpen className="border-b border-border pb-6">
        <div className="flex flex-col gap-1 pt-2">
          {WEEK_DAYS.map((day) => {
            // Why a hidden day may be safe to hide: the campaign never
            // publishes on it. State, not teaching, so it sits in the row
            // rather than in a note the user can close.
            const unused = publishingDays !== null && !publishingDays.includes(day)
            return (
              <div
                key={day}
                className="flex h-10 items-center justify-between gap-3 bg-secondary px-4"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="text-sm">{DAY_LABELS[day]}</span>
                  {unused && (
                    <span className="truncate text-xs text-tertiary-foreground">
                      Not a publishing day
                    </span>
                  )}
                </span>
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
            )
          })}
        </div>
      </Collapse>

      {/* The week card only. The month card is a single 20px line carrying two
          of these six, and switching four things that aren't there for a view
          they can't affect would be a worse control than none. */}
      <Collapse title="WEEK CARD" defaultOpen className="border-b border-border pb-6">
        <div className="flex flex-col gap-1 pt-2">
          {CARD_FIELDS.map((field) => {
            // The rule, said by the control rather than about it: the last
            // switch left on won't turn off, and it looks like it won't.
            const locked = !canHideField(card, field)
            const note = CARD_FIELD_NOTES[field]
            return (
              <div
                key={field}
                className="flex min-h-10 items-center justify-between gap-3 bg-secondary px-4 py-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm">{CARD_FIELD_LABELS[field]}</span>
                  {note && <span className="text-xs text-tertiary-foreground">{note}</span>}
                </span>
                {isPending ? (
                  <Skeleton className="h-5 w-9" />
                ) : (
                  <Switch
                    checked={card[field]}
                    disabled={locked}
                    onCheckedChange={(checked) => setCardField(field, checked)}
                    aria-label={`Show ${CARD_FIELD_LABELS[field].toLowerCase()} on the week card`}
                  />
                )}
              </div>
            )
          })}
          {/* State, not teaching — it names the thing the switches above can't
              reach, so it can't live in a note the user is able to close. */}
          <p className="px-4 pt-1 text-xs text-tertiary-foreground">
            The status colour down the card&apos;s left edge is always shown.
          </p>
        </div>
      </Collapse>
    </RailPanel>
  )
}
