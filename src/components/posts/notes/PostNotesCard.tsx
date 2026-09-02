import { useState } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NoteCard } from '@/components/posts/notes/NoteCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib'
import type { PostNote } from '@/services/api/postNotes'

type Props = {
  /** The unpinned notes — pinned ones render above the post body instead. */
  notes: PostNote[]
  /** The list is still being read; an empty `notes` means nothing yet. */
  loading?: boolean
  /**
   * The read failed. Has to be said here: queries get no global error toast,
   * and a post whose notes silently failed to load looks identical to a post
   * that has none — including the pinned thesis, which just isn't there.
   */
  error?: boolean
  isPinned: (note: PostNote) => boolean
  onTogglePin: (note: PostNote) => void
  onAdd: (note: { title: string; body: string }) => Promise<unknown>
  onSave: (
    note: PostNote,
    patch: { title: string; body: string },
  ) => Promise<void>
  onDelete: (note: PostNote) => Promise<void>
  className?: string
}

/**
 * The post's notes, below the copy and the media (CON-188): draft theses the
 * content plan captured, prompts the assistant wrote, and anything typed by
 * hand. Ancillary material that belongs to the post without being in it.
 *
 * Unlike the media card this never disappears — a post with no notes still
 * offers to take one, and there is no other entry point for adding one.
 */
export function PostNotesCard({
  notes,
  loading = false,
  error = false,
  isPinned,
  onTogglePin,
  onAdd,
  onSave,
  onDelete,
  className,
}: Props) {
  const [composing, setComposing] = useState(false)

  return (
    <div className={cn('flex flex-col gap-4 bg-primary px-10 py-6', className)}>
      <div className="flex items-center justify-between gap-4 min-w-0">
        <h2 className="flex items-center gap-2 min-w-0 text-xl font-display font-medium tracking-tight">
          Notes
          {notes.length > 0 && (
            <span className="font-normal text-tertiary-foreground">
              {notes.length}
            </span>
          )}
        </h2>
        {!composing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setComposing(true)}
          >
            <PlusIcon />
            <span>ADD NOTE</span>
          </Button>
        )}
      </div>

      {composing && (
        <NoteComposer
          onCancel={() => setComposing(false)}
          onAdd={async (note) => {
            await onAdd(note)
            setComposing(false)
          }}
        />
      )}

      {loading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-destructive">
          The notes couldn't be loaded — anything pinned above the post is
          missing too, not gone. Reload the page to try again.
        </p>
      )}

      {/* A rule between rows rather than a gap: without it two notes with no
          title read as one long note in two paragraphs. */}
      {notes.map((note, index) => (
        <NoteCard
          key={note.id}
          note={note}
          pinned={isPinned(note)}
          onTogglePin={() => onTogglePin(note)}
          onSave={(patch) => onSave(note, patch)}
          onDelete={() => onDelete(note)}
          className={index > 0 ? 'border-t border-border pt-4' : undefined}
        />
      ))}
    </div>
  )
}

function NoteComposer({
  onAdd,
  onCancel,
}: {
  onAdd: (note: { title: string; body: string }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const trimmed = body.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onAdd({ title: title.trim(), body: trimmed })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        aria-label="Note title"
      />
      <Textarea
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
          <span>Add note</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <span>Cancel</span>
        </Button>
      </div>
    </div>
  )
}
