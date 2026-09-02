import { useTranslation } from 'react-i18next'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Collapse } from '@/components/ui/collapse'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { TextSelect } from '@/components/ui/text-select'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useCampaign } from '@/hooks/useCampaigns'
import { publishingDayNumbers } from '@/lib/campaignScheduling'
import { CARD_FIELDS, canHideField } from './cardFields'
import { weekdayLabel } from './date'

// Displayed Monday-first regardless of the chosen first day of week.
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] as const

/**
 * The weekday names, from `Intl` rather than a table of English.
 *
 * Every other weekday in the app already comes out of `Intl` — the grid's
 * column headers, the week range in the toolbar — so a hard-coded list here
 * would have been the one place they could disagree, on top of freezing the
 * language at import. Any week will do as a source of seven weekdays; the
 * first full week of 2024 starts on a Monday, needs no clock read, and the
 * dates themselves are never shown.
 */
function dayNames(locale: string): Record<number, string> {
  const names: Record<number, string> = {}
  for (const day of WEEK_DAYS) {
    // 2024-01-01 was a Monday, so day 1 is offset 0, …, day 0 (Sunday) is 6.
    names[day] = weekdayLabel(new Date(2024, 0, 1 + ((day + 6) % 7)), locale)
  }
  return names
}

/** The views that draw cards, in the order the view switcher offers them. */
const CARD_VIEWS = [
  {
    view: 'week',
    titleKey: 'calendar.weekCard',
    showKey: 'calendar.showFieldOnWeek',
  },
  {
    view: 'month',
    titleKey: 'calendar.monthCard',
    showKey: 'calendar.showFieldOnMonth',
  },
] as const

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
  const { t, i18n } = useTranslation()
  const dayLabels = dayNames(i18n.language)
  const firstDayOptions = WEEK_DAYS.map((day) => ({
    id: String(day),
    displayValue: dayLabels[day],
  }))
  const {
    firstDayOfWeek,
    hiddenDays,
    imagePreviews,
    card,
    isPending,
    setFirstDayOfWeek,
    setDayVisible,
    setCardField,
    setImagePreviews,
  } = useCalendarSettings(campaignId)
  // The campaign's publishing days, so the panel can say which of these rows
  // the campaign will never put anything on. Shares the cached campaign the
  // page around it already loaded, so opening the panel costs no extra request.
  // While it is loading there is nothing to annotate — and no annotation is the
  // right guess, since a campaign publishes on every day by default.
  const { data: campaign } = useCampaign(campaignId)
  const publishingDays = campaign
    ? publishingDayNumbers(campaign.publishing_days)
    : null

  return (
    <RailPanel
      title={t('calendar.settings')}
      onClose={onClose}
      className="h-full"
    >
      <Collapse
        title={t('calendar.preferences')}
        defaultOpen
        className="border-b border-border pb-6"
      >
        <div className="flex flex-col gap-1.5 pt-2">
          <span className="text-xs text-tertiary-foreground">
            {t('calendar.firstDayOfWeek')}
          </span>
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
              elements={firstDayOptions}
            />
          )}

          {/* One answer, which is why it is here and not a sixth switch on
              each card list: it is the most expensive thing a card can carry,
              and turning it off is a decision about what the calendar is for
              rather than about what a week card needs. It reaches both views —
              the month on a shorter band, and only on the days that have room
              for one (see `cardRungs`). */}
          <div className="mt-2 flex min-h-10 items-center justify-between gap-3 bg-secondary px-4 py-2">
            <span className="flex min-w-0 flex-col">
              <span className="text-sm">{t('calendar.imagePreviews')}</span>
              <span className="text-xs text-tertiary-foreground">
                {t('calendar.imagePreviewsNote')}
              </span>
            </span>
            {isPending ? (
              <Skeleton className="h-5 w-9" />
            ) : (
              <Switch
                checked={imagePreviews}
                onCheckedChange={setImagePreviews}
                aria-label={t('calendar.imagePreviews')}
              />
            )}
          </div>
        </div>
      </Collapse>

      {/* One section per view, and they are independent on purpose: it is the
          same card in both now, but a week column is most of a screen tall and
          a month cell is a hundred pixels, so what fits on one is not what fits
          on the other. The month starts with less switched on for exactly that
          reason — see `DEFAULT_MONTH_FIELDS`. */}
      {CARD_VIEWS.map(({ view, titleKey, showKey }) => (
        <Collapse
          key={view}
          title={t(titleKey)}
          defaultOpen
          className="border-b border-border pb-6"
        >
          <div className="flex flex-col gap-1 pt-2">
            {CARD_FIELDS.map((field) => {
              // The rule, said by the control rather than about it: the last
              // switch left on won't turn off, and it looks like it won't.
              const locked = !canHideField(card[view], field)
              const label = t(`calendar.field.${field}` as const)
              // Only the status row carries one — see `calendar.fieldNoteStatus`.
              const note =
                field === 'status' ? t('calendar.fieldNoteStatus') : null
              return (
                <div
                  key={field}
                  className="flex min-h-10 items-center justify-between gap-3 bg-secondary px-4 py-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm">{label}</span>
                    {note && (
                      <span className="text-xs text-tertiary-foreground">
                        {note}
                      </span>
                    )}
                  </span>
                  {isPending ? (
                    <Skeleton className="h-5 w-9" />
                  ) : (
                    <Switch
                      checked={card[view][field]}
                      disabled={locked}
                      onCheckedChange={(checked) =>
                        setCardField(view, field, checked)
                      }
                      aria-label={t(showKey, { field: label.toLowerCase() })}
                    />
                  )}
                </div>
              )
            })}
            {/* State, not teaching — it names the thing the switches above can't
                reach, so it can't live in a note the user is able to close. */}
            <p className="px-4 pt-1 text-xs text-tertiary-foreground">
              {t('calendar.statusColourAlways')}
            </p>
          </div>
        </Collapse>
      ))}

      {/* Last, and shut.
          It is seven switches — the longest list in the panel — and it is the
          one a user sets once, if ever: which days the grid has columns for is
          a property of how they work, not something they come back to tune the
          way they tune what a card shows. Open by default it pushed the two
          card sections, the ones this panel is actually opened for, off the
          bottom of the rail. Closed, it is a title they can find when they want
          it and a line of chrome when they don't. */}
      <Collapse
        title={t('calendar.daysVisibility')}
        className="border-b border-border pb-6"
      >
        <div className="flex flex-col gap-1 pt-2">
          {WEEK_DAYS.map((day) => {
            // Why a hidden day may be safe to hide: the campaign never
            // publishes on it. State, not teaching, so it sits in the row
            // rather than in a note the user can close.
            const unused =
              publishingDays !== null && !publishingDays.includes(day)
            return (
              <div
                key={day}
                className="flex h-10 items-center justify-between gap-3 bg-secondary px-4"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="text-sm">{dayLabels[day]}</span>
                  {unused && (
                    <span className="truncate text-xs text-tertiary-foreground">
                      {t('calendar.notAPublishingDay')}
                    </span>
                  )}
                </span>
                {isPending ? (
                  <Skeleton className="h-5 w-9" />
                ) : (
                  <Switch
                    checked={!hiddenDays.includes(day)}
                    onCheckedChange={(checked) => setDayVisible(day, checked)}
                    aria-label={t('calendar.showDay', { day: dayLabels[day] })}
                  />
                )}
              </div>
            )
          })}
        </div>
      </Collapse>
    </RailPanel>
  )
}
