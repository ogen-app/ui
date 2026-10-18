import { useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ArrowElbowDownLeftIcon } from '@phosphor-icons/react'
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
 * Capture — the page's first act, always on screen, kept with Return.
 *
 * **This is the half of the module that has to be free.** A backlog only tells
 * you anything if the bad ideas are in it too, and people only write those
 * down when writing one costs nothing. So: no dialog, no required fields, no
 * campaign to pick, no button to aim at. A sentence and a return key.
 *
 * The field opens with the writer's initials, in the same identity circle a
 * written idea's row carries, so what is typed here is visibly the row it
 * becomes. Return keeps it; Shift + Return breaks a line for a longer thought,
 * and the field grows with it — the first line is the idea, the rest its note.
 * The hint at the right end says so, brighter once there is something to keep.
 *
 * The field keeps focus after a submit rather than clearing and standing down:
 * ideas arrive in bursts, and the second one is usually already half-written
 * when the first lands.
 */
export function IdeaCapture({
  onCapture,
}: {
  /** The first line, the rest as its note, and who wrote it. */
  onCapture: (
    title: string,
    note: string,
    writer: { id: string; name: string },
  ) => void
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

  const submit = () => {
    const [first, ...rest] = value.trim().split('\n')
    const title = first.trim()
    if (!title) return
    onCapture(title, rest.join('\n').trim(), writer)
    setValue('')
    requestAnimationFrame(fit)
    field.current?.focus()
  }

  const typed = value.trim().length > 0
  const multiline = value.includes('\n')

  return (
    <div className="flex min-h-16 items-start gap-4 border border-quaternary bg-primary px-5 py-4 transition-colors focus-within:border-foreground">
      <span
        aria-hidden
        className="mt-px flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary"
        style={{ background: identityColorVar(writer.id) }}
      >
        {identityAbbr(writer.name)}
      </span>
      <textarea
        ref={field}
        rows={1}
        value={value}
        placeholder={t(prompt)}
        aria-label={t('ideas.capture.label')}
        onChange={(event) => {
          setValue(event.target.value)
          fit()
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            submit()
          }
        }}
        className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-xl/8 tracking-[-0.01em] text-foreground outline-none placeholder:text-tertiary-foreground"
      />
      {/* How to keep it, quietly at the right end — brighter once there is
          something to keep; with a line already broken, how to break one. */}
      <span
        className={cn(
          'flex shrink-0 items-center gap-1 text-xs whitespace-nowrap [&_svg]:size-3.5',
          typed ? 'text-secondary-foreground' : 'text-tertiary-foreground',
          multiline ? 'self-end pb-1' : 'self-center',
        )}
      >
        <Trans
          i18nKey={
            multiline ? 'ideas.capture.hintMultiline' : 'ideas.capture.hint'
          }
          components={{ key: <ArrowElbowDownLeftIcon aria-hidden /> }}
        />
      </span>
    </div>
  )
}

/**
 * Who is writing, in this workspace: the membership whose id a written idea's
 * row is coloured by, so the circle here and the one on the row agree. Before
 * the members arrive, the session's own name.
 */
function useWriter(): { id: string; name: string } {
  const members = useWorkspaceMembers()
  const user = useAuthStore((s) => s.user)
  const self = members.data?.find((m) => m.is_self)
  const name =
    self?.name || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
  return { id: self?.id ?? user?.id ?? name, name }
}
