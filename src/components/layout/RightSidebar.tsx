import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { AIAssistantPanel } from '@/components/rail-panels/ComingSoonPanel'
import { CalendarSettingsPanel } from '@/components/campaigns/calendar/CalendarSettingsPanel'
import { NotScheduledPanel } from '@/components/campaigns/calendar/NotScheduledPanel'
import { useSettingsStore } from '@/stores/settingsStore'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'

const PANEL_WIDTH = 'w-120'

/**
 * Portal target for the post editor's settings form. The form needs the
 * editor's `usePost` instance (one autosave pipeline per post), so the post
 * route renders it and portals it into this layer.
 */
export const POST_SETTINGS_PORTAL_ID = 'right-sidebar-post-settings'

/**
 * One stacked content layer inside the sidebar. Inactive layers stay mounted
 * and fade out (opacity only), so switching panels cross-fades and the AI
 * assistant keeps running invisibly.
 */
function PanelLayer({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        'absolute inset-0 transition-opacity duration-200',
        active ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {children}
    </div>
  )
}

/**
 * The app's right sidebar: a single slide-in container hosting the global AI
 * assistant and contextual panels (calendar settings, not-scheduled posts).
 * Only one panel is active at a time; the container stays open while panels
 * swap. Session-only state lives in the settings store; the floating trigger
 * in the bottom-right corner shifts left while the sidebar is open.
 */
export function RightSidebar() {
  const activePanel = useSettingsStore((s) => s.activeRightPanel)
  const campaignId = useSettingsStore((s) => s.rightPanelCampaignId)
  const toggle = useSettingsStore((s) => s.toggleRightPanel)
  const close = useSettingsStore((s) => s.closeRightPanel)

  const isOpen = activePanel !== null
  const assistantActive = activePanel === 'assistant'

  // Whether the assistant is doing work (streaming a reply, running a task).
  // Not wired yet — flips the logo into its line-drawing loading animation.
  const isBusy = false

  return (
    <>
      <div
        className={cn(
          'shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
          isOpen ? PANEL_WIDTH : 'w-0',
        )}
      >
        <div className={cn(PANEL_WIDTH, 'h-full bg-primary flex flex-row')}>
          <div className="w-px self-stretch bg-border shrink-0" aria-hidden />
          <div className="flex-1 min-w-0 min-h-0 relative">
            {/* Never unmounts — assistant processes continue while hidden. */}
            <PanelLayer active={assistantActive}>
              <AIAssistantPanel onClose={close} />
            </PanelLayer>
            <PanelLayer active={activePanel === 'calendarSettings'}>
              <CalendarSettingsPanel onClose={close} />
            </PanelLayer>
            {campaignId && (
              <PanelLayer active={activePanel === 'notScheduled'}>
                <NotScheduledPanel campaignId={campaignId} onClose={close} />
              </PanelLayer>
            )}
            <PanelLayer active={activePanel === 'postSettings'}>
              <div id={POST_SETTINGS_PORTAL_ID} className="h-full" />
            </PanelLayer>
          </div>
        </div>
      </div>
      <Button
        variant="container"
        size="excluded"
        onClick={() => toggle('assistant')}
        aria-label="AI assistant"
        aria-expanded={assistantActive}
        style={{ zIndex: ZIndex.navigation }}
        className={cn(
          'fixed bottom-6 size-12 rounded-none shadow-lg bg-primary justify-center',
          'transition-[right,color] duration-300 ease-in-out',
          // The logo mark inherits its fill via currentColor.
          isOpen ? 'right-[calc(30rem+1.5rem)]' : 'right-6',
          assistantActive
            ? 'text-accent'
            : 'text-primary-foreground hover:text-accent',
        )}
      >
        <Logo variant="mark" className="size-8" loading={isBusy} />
      </Button>
    </>
  )
}
