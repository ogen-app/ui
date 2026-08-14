import { useNavigate } from '@tanstack/react-router'
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
        ) : settingsPending ? (
          <Skeleton className="h-4 w-56" />
        ) : (
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
              <TabsTrigger
                variant="segmented"
                value="week"
                onClick={() => handleViewSelect('week')}
              >
                WEEK
              </TabsTrigger>
              <TabsTrigger
                variant="segmented"
                value="month"
                onClick={() => handleViewSelect('month')}
              >
                MONTH
              </TabsTrigger>
              <TabsTrigger
                variant="segmented"
                value="list"
                onClick={() => handleViewSelect('list')}
              >
                LIST
              </TabsTrigger>
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
