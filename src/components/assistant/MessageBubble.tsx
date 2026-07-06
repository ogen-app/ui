import { CheckCircleIcon } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import { ToolActivity } from '@/components/assistant/ToolActivity'
import type { ChatMessage } from '@/types/assistant'

/** A single chat turn: a user instruction or a (possibly streaming) model reply. */
export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="self-end max-w-[85%] bg-secondary px-3 py-2">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>
    )
  }

  const thinking =
    message.pending && message.explanation.length === 0 && message.tools.length === 0

  return (
    <div className="self-start w-full flex flex-col gap-2">
      {message.tools.length > 0 && <ToolActivity tools={message.tools} />}

      {thinking ? (
        <div className="flex items-center gap-2 text-sm text-tertiary-foreground">
          <Spinner className="w-4" />
          <span>Thinking…</span>
        </div>
      ) : (
        message.explanation.length > 0 && (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {message.explanation}
            {message.pending && (
              <span className="ml-0.5 inline-block w-1.5 h-4 align-text-bottom bg-foreground animate-pulse" />
            )}
          </p>
        )
      )}

      {!message.pending && message.action === 'edited' && (
        <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
          <CheckCircleIcon className="size-3.5" weight="fill" />
          <span>Post updated</span>
        </div>
      )}

      {message.error && <p className="text-xs text-destructive">{message.error}</p>}
    </div>
  )
}
