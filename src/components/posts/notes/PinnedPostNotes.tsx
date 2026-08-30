import { NoteCard } from '@/components/posts/notes/NoteCard'
import type { PostNote } from '@/services/api/postNotes'

type Props = {
  notes: PostNote[]
  onTogglePin: (note: PostNote) => void
  onSave: (
    note: PostNote,
    patch: { title: string; body: string },
  ) => Promise<void>
  onDelete: (note: PostNote) => Promise<void>
}

/**
 * Notes pinned above the post body (CON-188).
 *
 * Same card as below the media — a pin moves a note, it doesn't change what a
 * note is. It sits under the checks bar rather than at the very top of the
 * column so the chrome that describes the post as a whole stays together,
 * while the note lands next to the copy it is about.
 *
 * Renders nothing when nothing is pinned, so the gap closes rather than
 * leaving an empty band above the editor.
 */
export function PinnedPostNotes({
  notes,
  onTogglePin,
  onSave,
  onDelete,
}: Props) {
  if (notes.length === 0) return null

  return (
    <>
      {notes.map((note) => (
        <div key={note.id} className="w-content bg-primary px-10 py-6">
          <NoteCard
            note={note}
            pinned
            onTogglePin={() => onTogglePin(note)}
            onSave={(patch) => onSave(note, patch)}
            onDelete={() => onDelete(note)}
          />
        </div>
      ))}
    </>
  )
}
