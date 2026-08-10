import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPostNote,
  deletePostNote,
  listPostNotes,
  updatePostNote,
  type PostNote,
  type PostNoteType,
} from '@/services/api/postNotes'
import { postNotesKey } from '@/lib/queryKeys'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'

export { postNotesKey }

type NotePatch = { type?: PostNoteType; title?: string; body?: string }

type UsePostNotesResult = {
  /** Draft theses first, then oldest-first — the server's order, kept. */
  notes: PostNote[]
  loading: boolean
  error: Error | null

  add: (note: { title: string; body: string }) => Promise<PostNote>
  adding: boolean

  edit: (noteId: string, patch: NotePatch) => Promise<void>
  editing: boolean

  remove: (note: PostNote) => Promise<void>
  removing: boolean
}

/**
 * A post's notes and their CRUD (CON-188).
 *
 * No autosave flush here, unlike `usePostVersions`: a note is its own record,
 * so nothing it writes reads or overwrites the post body. The two never race.
 */
export function usePostNotes(postId: string): UsePostNotesResult {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: postNotesKey(postId),
    queryFn: () => listPostNotes(postId),
    enabled: !!postId,
  })

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: postNotesKey(postId) }),
    [qc, postId],
  )

  const addMutation = useMutation({
    meta: { errorTitle: 'Unable to add the note' },
    // Hand-written notes are always free-form. The API takes all three types
    // and the assistant uses the other two, but offering "draft thesis" in a
    // create menu would invite a second copy of a brief the content plan owns.
    mutationFn: (note: { title: string; body: string }) =>
      createPostNote(postId, { ...note, type: 'note' }),
    onSuccess: invalidate,
  })

  const editMutation = useMutation({
    meta: { errorTitle: 'Unable to save the note' },
    mutationFn: ({ noteId, patch }: { noteId: string; patch: NotePatch }) =>
      updatePostNote(postId, noteId, patch),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    meta: { errorTitle: 'Unable to delete the note' },
    mutationFn: (note: PostNote) => deletePostNote(postId, note.id),
    onSuccess: invalidate,
  })

  const { mutateAsync: addNote } = addMutation
  const add = useCallback(
    async (note: { title: string; body: string }) => {
      const created = await addNote(note)
      toast.success('Note added')
      return created
    },
    [addNote],
  )

  const { mutateAsync: editNote } = editMutation
  const edit = useCallback(
    async (noteId: string, patch: NotePatch) => {
      await editNote({ noteId, patch })
    },
    [editNote],
  )

  const { mutateAsync: removeNote } = removeMutation
  const remove = useCallback(
    async (note: PostNote) => {
      await removeNote(note)
      // The pin map is persisted and nothing else ever removes an entry — a
      // deleted note's pin would sit in localStorage forever.
      useSettingsStore.getState().clearNotePin(note.id)
      toast.success('Note deleted')
    },
    [removeNote],
  )

  return {
    notes: query.data ?? [],
    loading: query.isPending,
    error: query.error,
    add,
    adding: addMutation.isPending,
    edit,
    editing: editMutation.isPending,
    remove,
    removing: removeMutation.isPending,
  }
}
