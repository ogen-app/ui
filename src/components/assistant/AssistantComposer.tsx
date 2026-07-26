import { useEffect, useRef, useState } from 'react'
import { PaperPlaneRightIcon, StopIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type AssistantComposerProps = {
  onSend: (text: string) => void
  /** A turn is in flight: the send button becomes a stop button. */
  running?: boolean
  onCancel?: () => void
  disabled?: boolean
  placeholder?: string
  /**
   * Drops text into the box for the user to edit and send themselves. The
   * token is what makes it fire — picking the same starter twice still
   * refills, and re-rendering with an unchanged token doesn't clobber typing.
   */
  prefill?: { text: string; token: number }
}

/**
 * The message box at the foot of a thread. Enter sends, Shift+Enter breaks the
 * line — the textarea grows with the draft up to a few lines and then scrolls,
 * so a long instruction never squeezes the thread out.
 *
 * A turn takes around a minute, so the draft stays editable while one runs;
 * only sending is held back, and the button offers to stop instead.
 */
export function AssistantComposer({
  onSend,
  running = false,
  onCancel,
  disabled = false,
  placeholder = 'Write a message...',
  prefill,
}: AssistantComposerProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const token = prefill?.token
  const text = prefill?.text
  useEffect(() => {
    if (token === undefined || text === undefined) return
    setDraft(text)
    const el = inputRef.current
    if (!el) return
    el.focus()
    // Caret at the end, so the user can keep typing where the starter left off.
    requestAnimationFrame(() => el.setSelectionRange(text.length, text.length))
  }, [token, text])

  const canSend = draft.trim() !== '' && !disabled && !running

  const submit = () => {
    if (!canSend) return
    onSend(draft)
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex items-end gap-2 border border-border bg-primary px-4 py-3">
      <div className="max-h-32 flex-1 overflow-y-auto">
        <Textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message the assistant"
          className="min-h-0 border-b-0 bg-transparent px-0 py-0 text-[15px]/[1.5] font-normal placeholder:italic"
        />
      </div>
      {running ? (
        <Button
          variant="ghost"
          size="smIcon"
          onClick={onCancel}
          aria-label="Stop the assistant"
          className="text-accent hover:text-foreground"
        >
          <StopIcon weight="fill" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="smIcon"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className="disabled:text-senary-foreground"
        >
          <PaperPlaneRightIcon />
        </Button>
      )}
    </div>
  )
}
