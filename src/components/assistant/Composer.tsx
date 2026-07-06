import { useState } from 'react'
import { ArrowUpIcon, StopIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type ComposerProps = {
  streaming: boolean
  onSubmit: (text: string) => void
  onCancel: () => void
}

/** Instruction input. Enter submits, Shift+Enter inserts a newline. While a turn
 *  streams, the send button becomes a stop button wired to `onCancel`. */
export function Composer({ streaming, onSubmit, onCancel }: ComposerProps) {
  const [text, setText] = useState('')

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return
    onSubmit(trimmed)
    setText('')
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        variant="default"
        className="min-h-16"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask the assistant to refine this post…"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <div className="flex justify-end">
        {streaming ? (
          <Button variant="outline" size="sm" type="button" onClick={onCancel}>
            <StopIcon weight="fill" />
            Stop
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            type="button"
            onClick={submit}
            disabled={text.trim().length === 0}
          >
            <ArrowUpIcon />
            Send
          </Button>
        )}
      </div>
    </div>
  )
}
