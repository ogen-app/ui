import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilSimpleIcon, SparkleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib'
import { noteHeading } from '@/lib/postNotes'
import type { PostNote } from '@/services/api/postNotes'

type Props = {
  note: PostNote
  onSave: (patch: { title: string; body: string }) => Promise<void>
  onDelete: () => Promise<void>
  className?: string
}

/**
 * One note, readable by default and editable in place.
 *
 * The note's own title is its heading — a list of notes is told apart by what
 * each one says, not by all of them being called "Note". `noteHeading` decides
 * what stands in when there is no title.
 *
 * Everything is editable regardless of origin: an assistant-written image
 * prompt is a draft you are meant to fix, not a record of what the machine
 * said. The origin mark is there to say where the text came from, not to
 * protect it.
 */
export function NoteCard({ note, onSave, onDelete, className }: Props) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(false)

  const remove = async () => {
    if (removing) return
    setRemoving(true)
    try {
      await onDelete()
    } finally {
      setRemoving(false)
    }
  }

  const open = () => {
    setTitle(note.title)
    setBody(note.body)
    setConfirming(false)
    setEditing(true)
  }

  const close = () => {
    setConfirming(false)
    setEditing(false)
  }

  const submit = async () => {
    const trimmed = body.trim()
    // An empty body is a 400 from the API, and "delete by clearing the text"
    // is not a gesture anyone means — DELETE is right there.
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onSave({ title: title.trim(), body: trimmed })
      close()
    } finally {
      setBusy(false)
    }
  }

  const heading = noteHeading(note)

  // Only for the machine origins. Marking a hand-written note "manual" would
  // label the ordinary case.
  const originMark = note.origin !== 'manual' && (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center text-tertiary-foreground">
          <SparkleIcon className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {note.origin === 'assistant'
          ? t('posts.notes.origin.assistant')
          : t('posts.notes.origin.generated')}
      </TooltipContent>
    </Tooltip>
  )

  if (editing) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('posts.notes.titlePlaceholder')}
          aria-label={t('posts.notes.titleLabel')}
        />
        <Textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('posts.notes.bodyPlaceholder')}
          aria-label={t('posts.notes.bodyLabel')}
        />

        {/* Deleting lives in here rather than beside the pencil: the trash was
            one row away from the note it would destroy, on a card that is
            otherwise all reading. Opening the editor is the deliberate act
            that puts it within reach — and the inline confirm, same as the
            versions panel next door, is what makes it safe, because the delete
            is permanent and a `draft_thesis` can be the only copy of the
            brief. It replaces the actions rather than joining them, so there
            is never a second Cancel on screen meaning something else. */}
        {confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-secondary-foreground">
              {t('posts.notes.deleteConfirm')}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={removing}
                loading={removing}
                onClick={() => void remove()}
              >
                {t('posts.notes.delete')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                {t('posts.notes.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* The ghost variant has no disabled ink of its own — it only
                stops taking clicks — and the strong `text-primary-foreground`
                that marks this as the commit is exactly what makes a dead
                button look live. `senary` is the ink the default variant fades
                to. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary-foreground disabled:text-senary-foreground"
              disabled={!body.trim()}
              loading={busy}
              onClick={() => void submit()}
            >
              {t('posts.notes.save')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              {t('posts.notes.cancel')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              onClick={() => setConfirming(true)}
            >
              {t('posts.notes.delete')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  const editButton = (
    <Button
      type="button"
      variant="ghost"
      size="smIcon"
      className="shrink-0"
      onClick={open}
      aria-label={t('posts.notes.edit')}
    >
      <PencilSimpleIcon />
    </Button>
  )

  // `whitespace-pre-wrap`: the content plan writes the thesis as a bullet list
  // and the assistant writes prompts in paragraphs — both collapse into one
  // run-on line without it.
  const bodyText = (
    <p className="whitespace-pre-wrap text-sm text-secondary-foreground">
      {note.body}
    </p>
  )

  // An untitled note has no header row to put the pencil in, and giving it one
  // anyway leaves an empty line with a lone icon floating over it. The body
  // takes that row instead, so the note starts where its words do.
  if (!heading) {
    return (
      <div className={cn('flex items-start justify-between gap-4', className)}>
        <div className="min-w-0 flex-1">{bodyText}</div>
        <div className="flex shrink-0 items-center gap-2">
          {originMark}
          {editButton}
        </div>
      </div>
    )
  }

  return (
    // Surface-neutral on purpose: the notes are rows inside a single card, so
    // the container owns the background and padding; this owns the note.
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className={cn(
              'truncate text-base font-display font-medium tracking-tight',
              // A type standing in for a missing title is a description of the
              // note, not its name — it should not read as one.
              heading.kind === 'type' && 'text-tertiary-foreground',
            )}
          >
            {heading.kind === 'title' ? heading.text : t(heading.key)}
          </h3>
          {originMark}
        </div>
        {editButton}
      </div>

      {bodyText}
    </div>
  )
}
