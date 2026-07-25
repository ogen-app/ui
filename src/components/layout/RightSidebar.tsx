import { SparkleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { AIAssistantPanel } from '@/components/rail-panels/ComingSoonPanel'
import { useSettingsStore } from '@/stores/settingsStore'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'

const PANEL_WIDTH = 'w-120'

/**
 * The app's right sidebar: a slide-in panel hosting the global AI assistant.
 * Session-only open state lives in the settings store; the floating trigger
 * in the bottom-right corner shifts left while the panel is open.
 */
export function RightSidebar() {
  const isOpen = useSettingsStore((s) => s.isRightSidebarOpen)
  const toggle = useSettingsStore((s) => s.toggleRightSidebar)
  const close = useSettingsStore((s) => s.closeRightSidebar)

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
          <div className="flex-1 min-w-0 min-h-0">
            <AIAssistantPanel onClose={close} />
          </div>
        </div>
      </div>
      <Button
        variant="default"
        size="smIcon"
        active={isOpen}
        onClick={toggle}
        aria-label="AI assistant"
        aria-expanded={isOpen}
        style={{ zIndex: ZIndex.navigation }}
        className={cn(
          'fixed bottom-6 size-12 rounded-full shadow-lg',
          'transition-[right] duration-300 ease-in-out',
          isOpen ? 'right-[calc(30rem+1.5rem)]' : 'right-6',
        )}
      >
        <SparkleIcon className="size-5" />
      </Button>
    </>
  )
}
