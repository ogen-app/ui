import { useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  ArrowElbowDownLeftIcon,
  PaperPlaneRightIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { cn } from '@/lib'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { useAuthStore } from '@/stores/authStore'

/**
 * The prompts the field opens with, one picked per visit (CON-388). Each says
 * what an idea is here — a post somebody could make — rather than asking for
 * a finished one, and the variety keeps a field people pass every day from
 * turning into wallpaper. A table of keys, read through `t()` where drawn.
 */
const PROMPTS = [
  'ideas.capture.prompt.post',
  'ideas.capture.prompt.postingAbout',
  'ideas.capture.prompt.worthAPost',
  'ideas.capture.prompt.story',
  'ideas.capture.prompt.stopScrolling',
  'ideas.capture.prompt.wantToRead',
  'ideas.capture.prompt.thisWeek',
  'ideas.capture.prompt.audienceHear',
  'ideas.capture.prompt.format',
  'ideas.capture.prompt.deserves',
  'ideas.capture.prompt.behindScenes',
  'ideas.capture.prompt.keepsAsking',
] as const

/**
 * Capture — the page's first act, one press away and kept with Return.
 *
 * It lives in the page header: ADD IDEA there lays it over the whole header
 * row (`PageHeader`'s `overlay`), 4px past it on every side, and it stays
 * open while ideas keep coming. It is kept with Return or its send button —
 * the assistant's, teal once there is something to keep. Escape on an empty field, a press elsewhere with nothing
 * typed, or its × close it again. On the first run, with no ideas yet, it is
 * simply open, with no way to close it (`onClose` absent).
 *
 * **This is the half of the module that has to be free.** A backlog only tells
 * you anything if the bad ideas are in it too, and people only write those
 * down when writing one costs nothing. So: no dialog, no required fields, no
 * campaign to pick. A sentence and a return key.
 *
 * The field opens with the writer's initials, in the same identity circle a
 * written idea's row carries, so what is typed here is visibly the row it
 * becomes. Return keeps it; Shift + Return breaks a line for a longer thought,
 * and the field grows with it — the first line is the idea, the rest its note.
 * The hint before the send button says so, brighter once there is something
 * to keep.
 *
 * The field keeps focus after a submit rather than clearing and standing down:
 * ideas arrive in bursts, and the second one is usually already half-written
 * when the first lands.
 */
export function IdeaCapture({
  onCapture,
  onClose,
}: {
  /** The first line, the rest as its note, and who wrote it. */
  onCapture: (
    title: string,
    note: string,
    writer: Writer,
  ) => Promise<boolean> | void
  /** Folds the field back into the header's button; absent, it stays. */
  onClose?: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [prompt] = useState(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
  )
  const field = useRef<HTMLTextAreaElement>(null)
  const writer = useWriter()

  /** Grows with what is typed: a line at a time, never a scrollbar. */
  const fit = () => {
    const el = field.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const submit = async () => {
    const kept = value
    const [first, ...rest] = value.trim().split('\n')
    const title = first.trim()
    if (!title) return
    // Cleared at once — the next idea is usually already on its way — and
    // put back if the save fails, unless the field has moved on since.
    setValue('')
    requestAnimationFrame(fit)
    field.current?.focus()
    await keep(title, rest.join('\n').trim(), kept)
  }

  /**
   * Hands an idea over, and keeps hold of it if the save fails: back in the
   * field when the field is still empty, otherwise on a line under it —
   * several failures in a run each keep their own, and nothing typed since is
   * ever overwritten.
   */
  const keep = async (title: string, note: string, text: string) => {
    const saved = await onCapture(title, note, writer)
    if (saved !== false) return
    // The field as it is now — the DOM's value, not this render's copy.
    if (field.current && field.current.value === '') {
      setValue(text)
      requestAnimationFrame(fit)
    } else {
      setUnsaved((all) => [
        ...all,
        { id: crypto.randomUUID(), title, note, text },
      ])
    }
  }
  const [unsaved, setUnsaved] = useState<
    { id: string; title: string; note: string; text: string }[]
  >([])
  const retry = (draft: (typeof unsaved)[number]) => {
    setUnsaved((all) => all.filter((d) => d.id !== draft.id))
    void keep(draft.title, draft.note, draft.text)
  }

  const typed = value.trim().length > 0
  const multiline = value.includes('\n')

  // Nothing typed and nothing waiting to be retried: closing loses nothing.
  const idle = !typed && unsaved.length === 0

  return (
    <div
      // A press anywhere on the box but a button keeps the field's focus,
      // rather than reading as a press elsewhere.
      onMouseDown={(event) => {
        const target = event.target as HTMLElement
        if (target !== field.current && !target.closest('button')) {
          event.preventDefault()
          field.current?.focus()
        }
      }}
      className="flex min-h-12 cursor-text flex-col rounded-lg border border-border bg-primary shadow-sm transition-colors focus-within:border-foreground"
    >
      <div className="flex min-w-0 items-start gap-3 py-[7px] pr-[7px] pl-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-primary"
          style={{ background: identityColorVar(writer.id ?? writer.name) }}
        >
          {identityAbbr(writer.name)}
        </span>
        <textarea
          ref={field}
          rows={1}
          value={value}
          autoFocus
          placeholder={t(prompt)}
          aria-label={t('ideas.capture.label')}
          onChange={(event) => {
            setValue(event.target.value)
            fit()
          }}
          onBlur={(event) => {
            // Pressed elsewhere with nothing typed: fold back to the button.
            if (onClose && idle && !event.relatedTarget) onClose()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && onClose && idle) {
              event.preventDefault()
              onClose()
              return
            }
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              // Safari ends a composition before the Return that confirms a
              // candidate, so that Return reports keyCode 229 instead.
              !event.nativeEvent.isComposing &&
              event.keyCode !== 229
            ) {
              event.preventDefault()
              void submit()
            }
          }}
          className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-1 text-base/6 text-foreground outline-none placeholder:text-tertiary-foreground"
        />
        {/* How to keep it, quietly before the send button — brighter once
            there is something to keep; with a line already broken, how to
            break one. */}
        <span
          className={cn(
            'hidden h-8 shrink-0 items-center gap-1 text-xs/4 whitespace-nowrap sm:flex [&_svg]:size-3',
            typed ? 'text-secondary-foreground' : 'text-tertiary-foreground',
            multiline && 'self-end',
          )}
        >
          <Trans
            i18nKey={
              multiline ? 'ideas.capture.hintMultiline' : 'ideas.capture.hint'
            }
            components={{ key: <ArrowElbowDownLeftIcon aria-hidden /> }}
          />
        </span>
        <span className={cn('flex shrink-0 gap-1', multiline && 'self-end')}>
          <Button
            // The assistant's send button: Ogen's teal once there is
            // something to keep, a quiet square until then.
            variant={typed ? 'accent' : 'ghost'}
            size="smIcon"
            onClick={() => void submit()}
            disabled={!typed}
            aria-label={t('ideas.capture.keep')}
            className={cn(!typed && 'disabled:text-senary-foreground')}
          >
            <PaperPlaneRightIcon />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="smIcon"
              onClick={onClose}
              aria-label={t('ideas.capture.close')}
              className="text-secondary-foreground hover:text-foreground"
            >
              <XIcon />
            </Button>
          )}
        </span>
      </div>
      {unsaved.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-quaternary px-3 py-2">
          {unsaved.map((draft) => (
            <p
              key={draft.id}
              role="status"
              className="flex items-center gap-2 text-xs/4 text-destructive"
            >
              <span className="min-w-0 truncate">
                {t('ideas.capture.unsaved', { title: draft.title })}
              </span>
              <button
                type="button"
                onClick={() => retry(draft)}
                className="shrink-0 cursor-pointer font-medium text-foreground underline underline-offset-3"
              >
                {t('ideas.capture.retry')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setUnsaved((all) => all.filter((d) => d.id !== draft.id))
                }
                className="shrink-0 cursor-pointer text-secondary-foreground underline underline-offset-3"
              >
                {t('ideas.capture.dismiss')}
              </button>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Who is writing, in this workspace: the membership whose id a written idea's
 * row is coloured by, so the circle here and the one on the row agree. Before
 * the members arrive, the session's own name.
 */
export type Writer = {
  /**
   * The membership in this workspace — what the server stamps as
   * `created_by` and a written idea's row is coloured by — or null while the
   * members have not arrived. Never the session's user id: that names the
   * default workspace's membership, and would colour the row wrongly until
   * the server's answer replaced it.
   */
  id: string | null
  name: string
}

function useWriter(): Writer {
  const members = useWorkspaceMembers()
  const user = useAuthStore((s) => s.user)
  const self = members.data?.find((m) => m.is_self)
  const name =
    self?.name || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
  return { id: self?.id ?? null, name }
}
