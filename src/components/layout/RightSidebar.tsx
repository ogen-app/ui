import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

const PANEL_WIDTH = 'w-120'

/**
 * The app's right rail: a slide-in column that holds the assistant and nothing
 * else. The post editor's settings, preview, checks and history are tabs in the
 * editor's own side column (`posts/editor/PostSideColumn`), and the calendar's
 * settings and unscheduled posts are its own drawer (`CalendarDrawer`), so
 * neither ever puts the assistant away. It opens from Ask Ogen in the bar over
 * the page (`TopBar`), `o` and `]`.
 *
 * Closing it only collapses the column: the assistant never unmounts, so a
 * running thread keeps working while the rail is shut.
 */
export function RightSidebar() {
  const isOpen = useSettingsStore(selectActivePanel) === 'assistant'
  const close = useSettingsStore((s) => s.closeRightPanel)

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
        isOpen ? PANEL_WIDTH : 'w-0',
      )}
    >
      <div className={cn(PANEL_WIDTH, 'h-full bg-primary flex flex-row')}>
        <div className="w-px self-stretch bg-border shrink-0" aria-hidden />
        <div
          aria-hidden={!isOpen}
          className={cn(
            'flex-1 min-w-0 min-h-0 relative transition-opacity duration-200',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <div className="absolute inset-0">
            <AssistantPanel onClose={close} />
          </div>
        </div>
      </div>
    </div>
  )
}
