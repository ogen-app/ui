import { useEffect, useRef, useState } from 'react'
import {
  CaretRightIcon,
  LightbulbIcon,
  PaperPlaneRightIcon,
  StopIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'

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
  /** Toggles the starter chips above the composer. Absent → no starters. */
  onToggleSuggestions?: () => void
  suggestionsOpen?: boolean
}

/**
 * The message box at the foot of a thread. Enter sends, Shift+Enter breaks the
 * line — the textarea grows with the draft up to a few lines and then scrolls,
 * so a long instruction never squeezes the thread out.
 *
 * A turn takes around a minute, so the draft stays editable while one runs;
 * only sending is held back, and the button offers to stop instead.
 *
 * Two states. At rest the suggestions button sits to the left of the field;
 * once the user is writing it folds into a chevron and the field's fill slides
 * left to take the whole row. The fill is one absolutely positioned layer
 * *under* the buttons rather than a background on the field itself — that is
 * what lets it slide past them instead of pushing them.
 */
export function AssistantComposer({
  onSend,
  running = false,
  onCancel,
  disabled = false,
  placeholder = 'Write a message...',
  prefill,
  onToggleSuggestions,
  suggestionsOpen = false,
}: AssistantComposerProps) {
  const [draft, setDraft] = useState('')
  const [active, setActive] = useState(false)
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
    <div className="relative flex items-end gap-2 bg-primary px-4 py-3">
      {/* The field's fill. First in the DOM and the only absolute box here, so
          every (position: relative) button above paints over it. At rest it
          stops short of the send button; opening it runs the fill the whole
          width and the buttons keep their own white backgrounds, reading as
          holes punched in it. */}
      <div
        aria-hidden
        className={cn(
          'absolute bg-tertiary transition-[top,right,bottom,left] duration-200 ease-out',
          // At rest the fill is exactly the row — the same band as the
          // buttons. Open, it bleeds 4px past it on every side.
          active ? 'inset-y-1 left-2 right-2' : 'inset-y-3 left-13 right-13',
        )}
      />

      {/* Suggestions ⇄ chevron. Both live in one fixed box and cross-fade, so
          the field slides rather than jumps. */}
      <div className="relative size-8 shrink-0 self-end">
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center gap-1 transition-opacity duration-150',
            active ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
        >
          <Button
            variant="ghost"
            size="smIcon"
            onClick={onToggleSuggestions}
            disabled={disabled || !onToggleSuggestions}
            active={suggestionsOpen}
            aria-label="Suggestions"
            aria-expanded={suggestionsOpen}
            // Selected reads as an outline, not a fill: the button sits in the
            // field's own beige, so a beige fill would only merge with it.
            className={cn(
              'disabled:text-senary-foreground',
              'data-[active=true]:bg-primary data-[active=true]:inset-ring-[2px] data-[active=true]:inset-ring-border',
            )}
          >
            <LightbulbIcon />
          </Button>
        </div>
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-opacity duration-150',
            active ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <Button
            variant="ghost"
            size="smIcon"
            onClick={() => setActive(false)}
            aria-label="Show actions"
            className="bg-primary text-tertiary-foreground"
          >
            <CaretRightIcon />
          </Button>
        </div>
      </div>

      <div
        className="relative max-h-32 min-w-0 flex-1 overflow-y-auto"
        onClick={() => !disabled && setActive(true)}
      >
        <Textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setActive(true)}
          // A draft left in the box keeps the field open — collapsing under
          // written text would read as losing it.
          onBlur={() => setActive(draft.trim() !== '')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message the assistant"
          // 20px line + 6px padding either side = 32, the height of the
          // buttons flanking it. At 1.5 line-height the row came out a pixel
          // taller than them and nothing lined up.
          className="min-h-0 border-b-0 bg-transparent px-2 py-1.5 text-sm/5 font-normal placeholder:italic"
        />
      </div>

      {running ? (
        <Button
          variant="ghost"
          size="smIcon"
          onClick={onCancel}
          aria-label="Stop the assistant"
          className="self-end bg-primary text-accent hover:text-foreground"
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
          className="self-end bg-primary disabled:text-senary-foreground"
        >
          <PaperPlaneRightIcon />
        </Button>
      )}
    </div>
  )
}
