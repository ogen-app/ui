import { useNavigate } from '@tanstack/react-router'
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addDays, formatAnchor, startOfWeek } from '@/components/campaigns/calendar/date'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useAddPost } from '@/hooks/usePosts'

type PostsToolbarProps = {
  campaignId: string
  view: 'week' | 'list'
  /** Present only on the calendar; drives the range label and day nav. */
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
 * WEEK / MONTH / LIST switch, week navigation, and ADD POST.
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

  const handleViewSelect = (next: string) => {
    if (next === view) return
    if (next === 'week') {
      navigate({
        to: '/campaigns/$campaignId/calendar/$anchor/$view',
        params: {
          campaignId,
          anchor: formatAnchor(anchor ?? new Date()),
          view: 'week',
        },
      })
    } else if (next === 'list') {
      navigate({ to: '/campaigns/$campaignId/list', params: { campaignId } })
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2 shrink-0 flex-wrap">
      {/* The range starts on the user's first day of the week, so it can't be
          written until that setting is known — a Monday–Sunday label that
          turns into Sunday–Saturday is worse than a beat of nothing.
          The list has no range to show, so the slot carries what the view is
          showing instead of standing empty. */}
      <span className="flex h-6 items-center text-[18px] font-medium">
        {anchor ? (
          settingsPending ? (
            <Skeleton className="h-4 w-56" />
          ) : (
            formatWeekRange(startOfWeek(anchor, firstDayOfWeek))
          )
        ) : (
          subheading
        )}
      </span>

      {/* Week navigation, then the view switch, then ADD POST: the switch sits
          between the two so navigating the current view and leaving it are not
          adjacent, and the action that creates something stays last. */}
      <div className="flex items-center gap-3">
        {view === 'week' && anchor && onAnchorChange && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="default"
              size="defaultIcon"
              onClick={() => onAnchorChange(addDays(anchor, -7))}
              aria-label="Previous week"
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
              onClick={() => onAnchorChange(addDays(anchor, 7))}
              aria-label="Next week"
            >
              <CaretRightIcon />
            </Button>
          </div>
        )}

        {/* MONTH is hidden until the month view exists. */}
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
  )
}
