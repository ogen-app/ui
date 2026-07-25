import { useNavigate } from '@tanstack/react-router'
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { addDays, formatAnchor, startOfWeek } from '@/components/campaigns/calendar/date'
import { useCalendarSettingsStore } from '@/stores/calendarSettingsStore'
import { useAddPost } from '@/hooks/usePosts'

type PostsToolbarProps = {
  campaignId: string
  view: 'week' | 'list'
  /** Present only on the calendar; drives the range label and day nav. */
  anchor?: Date
  onAnchorChange?: (anchor: Date) => void
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const startMonth = weekStart.toLocaleDateString(undefined, { month: 'long' })
  const endMonth = weekEnd.toLocaleDateString(undefined, { month: 'long' })
  const sameMonth = startMonth === endMonth && weekStart.getFullYear() === weekEnd.getFullYear()
  if (sameMonth) {
    return `${weekStart.getDate()}-${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
  }
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()
  const startLabel = `${weekStart.getDate()} ${startMonth}${sameYear ? '' : ` ${weekStart.getFullYear()}`}`
  return `${startLabel} - ${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
}

/**
 * Toolbar shared by the posts views: date range (calendar only), the
 * WEEK / MONTH / LIST switch, week navigation, and ADD POST.
 */
export function PostsToolbar({ campaignId, view, anchor, onAnchorChange }: PostsToolbarProps) {
  const navigate = useNavigate()
  const addPost = useAddPost(campaignId)
  const firstDayOfWeek = useCalendarSettingsStore((s) => s.firstDayOfWeek)

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
      <span className="text-[16px] font-medium">
        {anchor ? formatWeekRange(startOfWeek(anchor, firstDayOfWeek)) : ''}
      </span>

      <div className="flex items-center gap-3">
        <Tabs value={view}>
          <TabsList variant="underline" size="lg">
            <TabsTrigger
              variant="underline"
              value="week"
              onClick={() => handleViewSelect('week')}
            >
              WEEK
            </TabsTrigger>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span so the tooltip works on the disabled trigger */}
                <span>
                  <TabsTrigger variant="underline" value="month" disabled>
                    MONTH
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
            <TabsTrigger
              variant="underline"
              value="list"
              onClick={() => handleViewSelect('list')}
            >
              LIST
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'week' && anchor && onAnchorChange && (
          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="smIcon"
              onClick={() => onAnchorChange(addDays(anchor, -7))}
              aria-label="Previous week"
            >
              <CaretLeftIcon className="size-3.5" />
            </Button>
            <Button variant="default" size="sm" onClick={() => onAnchorChange(new Date())}>
              TODAY
            </Button>
            <Button
              variant="default"
              size="smIcon"
              onClick={() => onAnchorChange(addDays(anchor, 7))}
              aria-label="Next week"
            >
              <CaretRightIcon className="size-3.5" />
            </Button>
          </div>
        )}

        <Button variant="default" onClick={addPost}>
          <PlusIcon className="size-4" />
          <span>ADD POST</span>
        </Button>
      </div>
    </div>
  )
}
