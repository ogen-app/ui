import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  CalendarDotIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  addDays,
  addMonths,
  formatAnchor,
  monthLabel,
  startOfWeek,
} from '@/components/campaigns/calendar/date'
import { formatDate } from '@/lib/intl'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useAddPost } from '@/hooks/usePosts'

type PostsToolbarProps = {
  /**
   * The campaign whose posts are being arranged, or `null` on the workspace
   * calendar. Two things come off it: where the view switch navigates, and
   * whether there is an ADD POST at all — a new post needs a campaign to be
   * created in, and "every campaign" is not one.
   */
  campaignId: string | null
  view: 'week' | 'month' | 'list'
  /** Present only on the calendar; drives the range label and date nav. */
  anchor?: Date
  onAnchorChange?: (anchor: Date) => void
  /**
   * Fills the heading slot on views with no date range — the list. Sits where
   * the week range does, in the same type, so switching views moves the
   * content of that line rather than emptying it.
   */
  subheading?: string
}

function formatWeekRange(weekStart: Date, locale: string): string {
  const weekEnd = addDays(weekStart, 6)
  const startMonth = formatDate(weekStart, { month: 'long' }, locale)
  const endMonth = formatDate(weekEnd, { month: 'long' }, locale)
  const sameMonth =
    startMonth === endMonth && weekStart.getFullYear() === weekEnd.getFullYear()
  // En dash (–) for the date range, per typographic convention.
  if (sameMonth) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
  }
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()
  const startLabel = `${weekStart.getDate()} ${startMonth}${sameYear ? '' : ` ${weekStart.getFullYear()}`}`
  return `${startLabel} – ${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
}

/**
 * Toolbar shared by the two posts screens: the date range and the WEEK / MONTH
 * switch on the calendar, the count on the list, and ADD POST on both.
 *
 * **The list is not a third view of the calendar, and the switch no longer
 * pretends it is.** It was WEEK / MONTH / LIST, three segments of one control,
 * which said that the table is a way of looking at a week — and it is not: it
 * has no range at all, it is every post in the campaign. The two are separate
 * destinations with their own rows in the rail (`lib/campaignSections`), so the
 * switch now only picks a granularity, and it only appears where a granularity
 * is a question. What the list keeps is the half of the toolbar that is about
 * the posts rather than about the date: how many there are, and the way to add
 * one.
 *
 * The workspace calendar takes the same toolbar with `campaignId: null`, which
 * drops ADD POST — a new post needs a campaign to be created in. What is left
 * is what the workspace grid actually offers: where you are, and how to move.
 */
export function PostsToolbar({
  campaignId,
  view,
  anchor,
  onAnchorChange,
  subheading,
}: PostsToolbarProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  // Never called where the button isn't drawn; hooks don't take a branch.
  const addPost = useAddPost(campaignId ?? '')
  const { firstDayOfWeek, isPending: settingsPending } = useCalendarSettings()
  const isCalendar = view === 'week' || view === 'month'

  const handleViewSelect = (next: 'week' | 'month') => {
    if (next === view) return
    // The anchor is granularity-free by design (see `calendar/date.ts`), so
    // switching views keeps the day you were looking at and only re-derives
    // the range around it.
    const nextAnchor = formatAnchor(anchor ?? new Date())
    if (campaignId === null) {
      navigate({
        to: '/calendar/$anchor/$view',
        params: { anchor: nextAnchor, view: next },
      })
    } else {
      navigate({
        to: '/campaigns/$campaignId/calendar/$anchor/$view',
        params: { campaignId, anchor: nextAnchor, view: next },
      })
    }
  }

  /**
   * The two arrangements of the calendar: the same posts, differing by how
   * much of the plan is on screen at once — one week marked out, then a month.
   *
   * Built per render rather than hoisted, so the names come from whichever
   * language is loaded now; a module-level array would freeze the first one.
   */
  const views = [
    { value: 'week', Icon: CalendarDotIcon, label: t('calendar.viewWeek') },
    { value: 'month', Icon: CalendarDotsIcon, label: t('calendar.viewMonth') },
  ] as const

  /** One step of whatever the current view shows — a week, or a month. */
  const step = (direction: 1 | -1) => {
    if (!anchor || !onAnchorChange) return
    onAnchorChange(
      view === 'month'
        ? addMonths(anchor, direction)
        : addDays(anchor, direction * 7),
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2 shrink-0 flex-wrap">
      {/* The week's range starts on the user's first day of the week, so it
          can't be written until that setting is known — a Monday–Sunday label
          that turns into Sunday–Saturday is worse than a beat of nothing. The
          month's label doesn't depend on it and needs no such wait.
          The list has no range to show, so the slot carries what the view is
          showing instead of standing empty. */}
      <span className="flex h-6 items-center text-[18px] font-medium">
        {!anchor
          ? subheading
          : view === 'month'
            ? monthLabel(anchor, i18n.language)
            : settingsPending
              ? null
              : formatWeekRange(
                  startOfWeek(anchor, firstDayOfWeek),
                  i18n.language,
                )}
      </span>

      <div className="flex items-center gap-3">
        {isCalendar && anchor && onAnchorChange && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="default"
              size="defaultIcon"
              onClick={() => step(-1)}
              aria-label={t(
                view === 'month'
                  ? 'calendar.previousMonth'
                  : 'calendar.previousWeek',
              )}
              // The calendar binds the arrow keys to these two buttons; saying
              // so here is what puts the shortcut in front of a screen-reader
              // user, who has nothing else to discover it from.
              aria-keyshortcuts="ArrowLeft"
            >
              <CaretLeftIcon />
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={() => onAnchorChange(new Date())}
            >
              TODAY
            </Button>
            <Button
              variant="default"
              size="defaultIcon"
              onClick={() => step(1)}
              aria-label={t(
                view === 'month' ? 'calendar.nextMonth' : 'calendar.nextWeek',
              )}
              aria-keyshortcuts="ArrowRight"
            >
              <CaretRightIcon />
            </Button>
          </div>
        )}

        {/* The view switch stays beside ADD POST; the date navigator sits to
            their left rather than between them. The list has no switch at all
            — it is not a granularity — so ADD POST moves up against the count
            rather than leaving a gap where a control used to be. */}
        <div className="flex items-center gap-2">
          {isCalendar && (
            <Tabs value={view}>
              <TabsList variant="segmented" size="excluded">
                {views.map(({ value, Icon, label }) => (
                  // The tooltip is what the label used to do for a sighted
                  // reader; `aria-label` keeps saying it to everyone else.
                  <Tooltip key={value}>
                    {/* The span is the tooltip's trigger, not the tab. Both
                      primitives write `data-state`, and merged onto one
                      element the tooltip's wins — the selected segment loses
                      its fill. The wrapper has to keep a box of its own (the
                      tooltip is positioned against it, and `display: contents`
                      leaves it nothing to measure), so it is hidden from the
                      accessibility tree instead: `presentation` is what keeps
                      the tab a child of the tablist. The tooltip still answers
                      the keyboard — focus bubbles to it from the button. */}
                    <TooltipTrigger asChild>
                      <span role="presentation" className="inline-flex">
                        <TabsTrigger
                          variant="segmented"
                          size="icon"
                          value={value}
                          aria-label={label}
                          onClick={() => handleViewSelect(value)}
                        >
                          {/* Bold: at 16px the regular weight goes spindly
                            against the type beside it, and the dots that tell
                            the two calendars apart stop reading. */}
                          <Icon weight="bold" />
                        </TabsTrigger>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{label}</TooltipContent>
                  </Tooltip>
                ))}
              </TabsList>
            </Tabs>
          )}

          {campaignId !== null && (
            <Button variant="default" onClick={() => addPost()}>
              <PlusIcon />
              <span>{t('calendar.addPost')}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
