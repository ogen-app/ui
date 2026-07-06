import { useEffect, useRef } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { MessageBubble } from '@/components/assistant/MessageBubble'
import type { AssistantThread } from '@/stores/assistantStore'

/** Renders one thread's transcript, auto-scrolling to follow streaming output. */
export function AssistantChat({ thread }: { thread: AssistantThread }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [thread.messages])

  if (thread.status === 'loading' && thread.messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner className="w-6" />
      </div>
    )
  }

  if (thread.messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-1 py-10">
        <p className="text-sm text-secondary-foreground">
          Ask the assistant to refine this post.
        </p>
        <p className="text-xs text-tertiary-foreground">
          Rephrase, expand, shorten, adjust tone, or pull in an asset.
        </p>
        {thread.error && (
          <p className="mt-2 text-xs text-destructive">{thread.error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {thread.messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
