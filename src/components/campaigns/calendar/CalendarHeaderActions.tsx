import { useEffect } from 'react'
import { CalendarBlankIcon, GearSixIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useCampaignPosts } from '@/hooks/usePosts'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

/**
 * Header icon set for the calendar section: settings and the not-scheduled
 * counter. The panels themselves live in the right sidebar (shared with the
 * AI assistant — one active at a time); these buttons only switch what it
 * shows. The active icon renders filled in the accent color.
 */
export function CalendarHeaderActions({ campaignId }: { campaignId: string }) {
  const activePanel = useSettingsStore((s) => s.activeRightPanel)
  const toggle = useSettingsStore((s) => s.toggleRightPanel)
  const { data: posts } = useCampaignPosts(campaignId)
  const unscheduledCount = (posts ?? []).filter((p) => !p.scheduled_at).length

  const settingsActive = activePanel === 'calendarSettings'
  const unscheduledActive = activePanel === 'notScheduled'

  // Leaving the calendar (or switching campaigns) closes calendar-owned
  // panels; an open assistant stays open.
  useEffect(
    () => () => {
      const s = useSettingsStore.getState()
      if (
        s.activeRightPanel === 'calendarSettings' ||
        s.activeRightPanel === 'notScheduled'
      ) {
        s.closeRightPanel()
      }
    },
    [campaignId],
  )

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="headerIcon"
        size="excluded"
        className={cn(settingsActive && 'text-accent hover:text-accent')}
        onClick={() => toggle('calendarSettings')}
        aria-label="Calendar settings"
        aria-pressed={settingsActive}
      >
        <GearSixIcon weight={settingsActive ? 'fill' : 'regular'} className="size-5" />
      </Button>
      <Button
        variant="headerIcon"
        size="excluded"
        className={cn('relative', unscheduledActive && 'text-accent hover:text-accent')}
        onClick={() => toggle('notScheduled', campaignId)}
        aria-label="Not scheduled posts"
        aria-pressed={unscheduledActive}
      >
        <CalendarBlankIcon
          weight={unscheduledActive || unscheduledCount > 0 ? 'fill' : 'regular'}
          className="size-5"
        />
        {unscheduledCount > 0 && (
          // Knocked out of the filled icon in the page background color; the
          // 2px nudge centers it optically in the calendar body below the
          // header strip of the glyph.
          <span className="absolute inset-0 flex translate-y-[2px] items-center justify-center text-[10px]/none font-medium tabular-nums text-background">
            {unscheduledCount}
          </span>
        )}
      </Button>
    </div>
  )
}
