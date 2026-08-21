import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  CalendarDotIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ListDashesIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  addDays,
  addMonths,
  formatAnchor,
  monthLabel,
  startOfWeek,
} from '@/components/campaigns/calendar/date'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useAddPost } from '@/hooks/usePosts'

type PostsToolbarProps = {
  campaignId: string
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

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const startMonth = weekStart.toLocaleDateString(undefined, { month: 'long' })
  const endMonth = weekEnd.toLocaleDateString(undefined, { month: 'long' })
  const sameMonth = startMonth === endMonth && weekStart.getFullYear() === weekEnd.getFullYear()
  // En dash (–) for the date range, per typographic convention.
  if (sameMonth) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
  }
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()
  const startLabel = `${weekStart.getDate()} ${startMonth}${sameYear ? '' : ` ${weekStart.getFullYear()}`}`
  return `${startLabel} – ${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
}

/**
 * Toolbar shared by the posts views: date range (calendar only), the
 * WEEK / MONTH / LIST switch, date navigation, and ADD POST.
 */
export function PostsToolbar({
  campaignId,
  view,
  anchor,
  onAnchorChange,
  subheading,
}: PostsToolbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addPost = useAddPost(campaignId)
  const { firstDayOfWeek, isPending: settingsPending } = useCalendarSettings(campaignId)
  const isCalendar = view === 'week' || view === 'month'

  const handleViewSelect = (next: string) => {
    if (next === view) return
    if (next === 'week' || next === 'month') {
      // The anchor is granularity-free by design (see `calendar/date.ts`), so
      // switching views keeps the day you were looking at and only re-derives
      // the range around it.
      navigate({
        to: '/campaigns/$campaignId/calendar/$anchor/$view',
        params: {
          campaignId,
          anchor: formatAnchor(anchor ?? new Date()),
          view: next,
        },
      })
    } else if (next === 'list') {
      navigate({ to: '/campaigns/$campaignId/list', params: { campaignId } })
    }
  }

  /**
   * The three arrangements of the same posts. Two calendars that differ by
   * how much they hold — one date marked, then many — and a list, which is
   * the grouping that is actually there.
   *
   * Built per render rather than hoisted, so the names come from whichever
   * language is loaded now; a module-level array would freeze the first one.
   */
  const views = [
    { value: 'week', Icon: CalendarDotIcon, label: t('calendar.viewWeek') },
    { value: 'month', Icon: CalendarDotsIcon, label: t('calendar.viewMonth') },
    { value: 'list', Icon: ListDashesIcon, label: t('calendar.viewList') },
  ]

  /** One step of whatever the current view shows — a week, or a month. */
  const step = (direction: 1 | -1) => {
    if (!anchor || !onAnchorChange) return
    onAnchorChange(
      view === 'month' ? addMonths(anchor, direction) : addDays(anchor, direction * 7),
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
        {!anchor ? (
          subheading
        ) : view === 'month' ? (
          monthLabel(anchor)
        ) : settingsPending ? null : (
          formatWeekRange(startOfWeek(anchor, firstDayOfWeek))
        )}
      </span>

      <div className="flex items-center gap-3">
        {isCalendar && anchor && onAnchorChange && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="default"
              size="defaultIcon"
              onClick={() => step(-1)}
              aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
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
              aria-label={view === 'month' ? 'Next month' : 'Next week'}
              aria-keyshortcuts="ArrowRight"
            >
              <CaretRightIcon />
            </Button>
          </div>
        )}

        {/* The view switch stays beside ADD POST; the date navigator sits to
            their left rather than between them. */}
        <div className="flex items-center gap-2">
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

          <Button variant="default" onClick={() => addPost()}>
            <PlusIcon />
            <span>ADD POST</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
