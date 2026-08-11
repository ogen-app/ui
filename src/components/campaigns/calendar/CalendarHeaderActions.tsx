import { CalendarBlankIcon, GearSixIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useCampaignPosts } from '@/hooks/usePosts'
import { usePanelScope } from '@/hooks/usePanelScope'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

/**
 * Header icon set for the calendar section: settings and the not-scheduled
 * counter. The panels themselves live in the right sidebar (shared with the
 * AI assistant — one at a time); these buttons only switch what it shows. The
 * active icon renders filled in the accent color.
 *
 * This component exists exactly while the calendar does, so it is also where
 * the calendar declares its panel scope: leaving hides the calendar's panels
 * without forgetting which one was open, and coming back brings it straight
 * back up.
 */
export function CalendarHeaderActions({ campaignId }: { campaignId: string }) {
  usePanelScope('calendar', campaignId)

  const activePanel = useSettingsStore(selectActivePanel)
  const toggle = useSettingsStore((s) => s.toggleRightPanel)
  const { data: posts } = useCampaignPosts(campaignId)
  const unscheduledCount = (posts ?? []).filter((p) => !p.scheduled_at).length

  const settingsActive = activePanel === 'calendarSettings'
  const unscheduledActive = activePanel === 'notScheduled'

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
        onClick={() => toggle('notScheduled')}
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
