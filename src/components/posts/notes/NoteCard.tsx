import { useState } from 'react'
import {
  CheckIcon,
  PencilSimpleIcon,
  PushPinIcon,
  PushPinSlashIcon,
  SparkleIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib'
import { noteTypeLabel } from '@/lib/postNotes'
import type { PostNote } from '@/services/api/postNotes'

type Props = {
  note: PostNote
  pinned: boolean
  onTogglePin: () => void
  onSave: (patch: { title: string; body: string }) => Promise<void>
  onDelete: () => Promise<void>
  className?: string
}

/**
 * One note, readable by default and editable in place.
 *
 * Everything is editable regardless of origin: an assistant-written image
 * prompt is a draft you are meant to fix, not a record of what the machine
 * said. The origin mark is there to say where the text came from, not to
 * protect it.
 */
export function NoteCard({
  note,
  pinned,
  onTogglePin,
  onSave,
  onDelete,
  className,
}: Props) {
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
    setEditing(true)
  }

  const submit = async () => {
    const trimmed = body.trim()
    // An empty body is a 400 from the API, and "delete by clearing the text"
    // is not a gesture anyone means — the trash icon is right there.
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onSave({ title: title.trim(), body: trimmed })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    // Surface-neutral on purpose: pinned notes are each their own card above
    // the body, while the ones below the media are rows inside a single card.
    // The container owns the background and padding; this owns the note.
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs uppercase tracking-wide text-tertiary-foreground">
            {noteTypeLabel(note.type)}
          </span>
          {/* Only for the machine origins. Marking a hand-written note
              "manual" would label the ordinary case. */}
          {note.origin !== 'manual' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center text-tertiary-foreground">
                  <SparkleIcon className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {note.origin === 'assistant'
                  ? 'Written by the post assistant'
                  : 'Captured when this post was generated'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="smIcon"
                onClick={onTogglePin}
                aria-label={pinned ? 'Unpin note' : 'Pin above the post'}
              >
                {pinned ? <PushPinSlashIcon /> : <PushPinIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {pinned ? 'Move below the post' : 'Pin above the post'}
            </TooltipContent>
          </Tooltip>

          {!editing && (
            <Button
              type="button"
              variant="ghost"
              size="smIcon"
              onClick={open}
              aria-label="Edit note"
            >
              <PencilSimpleIcon />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            onClick={() => setConfirming(true)}
            aria-label="Delete note"
          >
            <TrashIcon className="text-destructive" />
          </Button>
        </div>
      </div>

      {/* An inline confirm, same as the versions panel next door: the trash
          icon sits a few pixels from pin and edit, the delete is permanent,
          and a `draft_thesis` can be the only copy of the brief. */}
      {confirming && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-secondary-foreground">
            Delete this note? There is no way to get it back.
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
              DELETE
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {editing ? (
        <div className="flex flex-col gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Note title"
          />
          <Textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What should this post remember?"
            aria-label="Note"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!body.trim()}
              loading={busy}
              onClick={() => void submit()}
            >
              <CheckIcon />
              <span>Save</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              <XIcon />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {note.title.trim() && (
            <h3 className="text-base font-display font-medium tracking-tight">
              {note.title}
            </h3>
          )}
          {/* `whitespace-pre-wrap`: the content plan writes the thesis as a
              bullet list and the assistant writes prompts in paragraphs — both
              collapse into one run-on line without it. */}
          <p className="whitespace-pre-wrap text-sm text-secondary-foreground">
            {note.body}
          </p>
        </>
      )}
    </div>
  )
}
