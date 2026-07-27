import { useAssistantStore } from '@/stores/assistantStore'

/**
 * How many conversations are open, set beside the panel title at the title's
 * own weight — it reads as part of the heading rather than as a control. The
 * whole title row is what clicks (see `RailPanel.onTitleClick`); this only
 * draws. The orange count is the unread one: a turn that finished in another
 * thread has to be visible without leaving the one you're in.
 */
export function ThreadCount() {
  const threads = useAssistantStore((s) => s.threads)
  const list = Object.values(threads)
  const unread = list.filter((t) => t.unread).length

  if (list.length === 0) return null

  // `items-center` centres the badge on the count's x-height; the flex box
  // still takes its own baseline from the text, so the whole thing sits on the
  // title's baseline in the row above.
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className="text-lg font-medium font-display tracking-tight text-secondary-foreground">
        working in {list.length} {list.length === 1 ? 'chat' : 'chats'}
      </span>
      {unread > 0 && (
        <span
          aria-hidden
          className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-primary"
        >
          {unread}
        </span>
      )}
    </span>
  )
}
