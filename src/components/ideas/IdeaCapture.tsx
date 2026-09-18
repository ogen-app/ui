import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LightbulbIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Capture — one line, always on screen, cleared by Enter.
 *
 * **This is the half of the module that has to be free.** A backlog only tells
 * you anything if the bad ideas are in it too, and people only write those
 * down when writing one costs nothing. So: no dialog, no required fields, no
 * campaign to pick, no place to file it. A sentence and a return key.
 *
 * Everything else an idea could carry — a note, a campaign, a verdict — is
 * added later by somebody who has decided to think about it, which is a
 * different activity on a different day. Asking for any of it here would move
 * the cost of triage onto the person who just had the thought, and the thought
 * is the scarce thing.
 *
 * The field keeps focus after a submit rather than clearing and standing down:
 * ideas arrive in bursts, and the second one is usually already half-written
 * when the first lands.
 */
export function IdeaCapture({
  onCapture,
}: {
  onCapture: (title: string) => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const field = useRef<HTMLInputElement>(null)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onCapture(trimmed)
    setValue('')
    field.current?.focus()
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <LightbulbIcon
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-quaternary-foreground"
        />
        <Input
          value={value}
          className="pl-9"
          placeholder={t('ideas.capture.placeholder')}
          aria-label={t('ideas.capture.label')}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit()
          }}
        />
      </div>
      {/* Disabled on an empty field rather than hidden: the button is what says
          Enter will do something, and a control that appears as you type moves
          the row under the cursor. */}
      <Button disabled={!value.trim()} onClick={submit}>
        {t('ideas.capture.submit')}
      </Button>
    </div>
  )
}
