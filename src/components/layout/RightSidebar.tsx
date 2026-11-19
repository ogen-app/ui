import type { ReactNode } from 'react'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import { HelpPanel } from '@/components/help/HelpPanel'
import { useFeatureFlag } from '@/config/featureFlags'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

const PANEL_WIDTH = 'w-120'

/**
 * One stacked content layer inside the rail. Inactive layers stay mounted and
 * fade out (opacity only), so opening help cross-fades and the assistant keeps
 * running invisibly underneath it.
 */
function PanelLayer({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
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
 * The app's right rail: a slide-in column that holds the assistant, and help
 * (CON-173) on top of it. The post editor's settings, preview, checks and
 * history are tabs in the editor's own side column
 * (`posts/editor/PostSideColumn`), and the calendar's settings and unscheduled
 * posts are its own drawer (`CalendarDrawer`), so neither ever puts the
 * assistant away. The assistant opens from Work with Ogen in the bar over the
 * page (`TopBar`), `o` and `]`; help from the button beside it, replacing
 * whatever was showing until it is closed.
 *
 * Closing it only collapses the column: the assistant never unmounts, so a
 * running thread keeps working while the rail is shut.
 */
export function RightSidebar() {
  const activePanel = useSettingsStore(selectActivePanel)
  const close = useSettingsStore((s) => s.closeRightPanel)
  const helpEnabled = useFeatureFlag('help-center')
  const isOpen = activePanel !== null

  return (
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
          <PanelLayer active={activePanel === 'assistant'}>
            <AssistantPanel onClose={close} />
          </PanelLayer>
          {helpEnabled && (
            <PanelLayer active={activePanel === 'help'}>
              <HelpPanel onClose={close} />
            </PanelLayer>
          )}
        </div>
      </div>
    </div>
  )
}
