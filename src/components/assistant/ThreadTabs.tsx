import { XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { useAssistantStore, useOpenThreads } from '@/stores/assistantStore'

/** Tab strip of open threads. Hidden until there is more than one to switch
 *  between (the panel header already names the active thread). */
export function ThreadTabs() {
  const threads = useOpenThreads()
  const activeKey = useAssistantStore((s) => s.activeKey)
  const focusThread = useAssistantStore((s) => s.focusThread)
  const closeThread = useAssistantStore((s) => s.closeThread)

  if (threads.length <= 1) return null

  return (
    <div className="flex items-stretch gap-1 overflow-x-auto">
      {threads.map((t) => {
        const isActive = t.key === activeKey
        return (
          <div
            key={t.key}
            onClick={() => focusThread(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 max-w-40 cursor-pointer shrink-0',
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-tertiary-foreground hover:text-foreground'
            )}
          >
            <span className="truncate text-xs font-medium">{t.ref.title}</span>
            <button
              type="button"
              aria-label="Close thread"
              onClick={(e) => {
                e.stopPropagation()
                closeThread(t.key)
              }}
              className="shrink-0 text-tertiary-foreground hover:text-foreground cursor-pointer"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
