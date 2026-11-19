import { useState } from 'react'
import type { CalendarDrawer as DrawerPanel } from '@/lib/calendarDrawer'
import { CalendarSettingsPanel } from '@/components/campaigns/calendar/CalendarSettingsPanel'
import {
  NotScheduledPanel,
  WorkspaceNotScheduledPanel,
} from '@/components/campaigns/calendar/NotScheduledPanel'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

const DRAWER_WIDTH = 'w-100'

/**
 * The calendar's drawer: its settings, or its unscheduled posts, at the right
 * edge of the page — under the bar over the page, beside the grid, and apart
 * from the assistant's rail. Opening it squeezes the grid rather than covering
 * it, because the unscheduled posts are dragged out of it onto the days.
 *
 * It belongs to the calendar and to no other screen, so it is rendered by the
 * two calendar pages rather than by the shell, and needs no panel scope: it is
 * on screen exactly while a calendar is. Which panel is open is
 * `settingsStore.calendarDrawer`, one choice shared by every calendar.
 *
 * `campaignId` absent is the workspace calendar, whose two panels are about
 * every campaign at once.
 */
export function CalendarDrawer({ campaignId }: { campaignId?: string }) {
  const open = useSettingsStore((s) => s.calendarDrawer)
  const close = useSettingsStore((s) => s.closeCalendarDrawer)

  // The panel stays drawn while the drawer slides shut, so it closes with its
  // content rather than emptying first and then folding away.
  const [shown, setShown] = useState<DrawerPanel | null>(open)
  if (open !== null && open !== shown) setShown(open)

  return (
    <aside
      aria-hidden={open === null}
      className={cn(
        'shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
        open === null ? 'w-0' : DRAWER_WIDTH,
      )}
    >
      <div
        className={cn(
          DRAWER_WIDTH,
          'h-full border-l border-border bg-primary',
          open === null && 'pointer-events-none',
        )}
      >
        {shown === 'calendarSettings' && (
          <CalendarSettingsPanel campaignId={campaignId} onClose={close} />
        )}
        {shown === 'notScheduled' &&
          (campaignId ? (
            <NotScheduledPanel campaignId={campaignId} onClose={close} />
          ) : (
            <WorkspaceNotScheduledPanel onClose={close} />
          ))}
      </div>
    </aside>
  )
}
