import { useCallback, useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import '@blocknote/mantine/style.css'
import '@/blocknote-theme.css'
import { uploadImage } from '@/services/api/images'
import { cn } from '@/lib'

// Image block is intentionally disabled here — posts are per-platform and
// the image affordance will be re-enabled conditionally per post type.
const { image: _image, ...postBlockSpecs } = defaultBlockSpecs
const postSchema = BlockNoteSchema.create({ blockSpecs: postBlockSpecs })

type PostContentEditorProps = {
  content: string
  onContentChange: (content: string) => void
  /**
   * Freezes the editor while the assistant rewrites this post server-side.
   * Editing during a run would be lost — the assistant's write wins.
   */
  readOnly?: boolean
}

const DEFAULT_CONTENT = [{ type: 'paragraph' as const }]

export function PostContentEditor({
  content,
  onContentChange,
  readOnly = false,
}: PostContentEditorProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyRef = useRef(false)
  // The Markdown this editor last put on screen. Guards the sync effect below
  // from reacting to the round-trip of the user's own typing.
  const appliedRef = useRef<string | null>(null)
  const editor = useCreateBlockNote({
    schema: postSchema,
    initialContent: DEFAULT_CONTENT,
    uploadFile: uploadImage,
  })

  // Load on mount, and re-load whenever `content` changes from the outside —
  // the assistant edits the post on the server, so new content arrives through
  // the query cache rather than through this editor.
  useEffect(() => {
    if (appliedRef.current === content) return
    const next = editor.tryParseMarkdownToBlocks(content ?? '')
    appliedRef.current = content
    editor.replaceBlocks(editor.document, next.length > 0 ? next : DEFAULT_CONTENT)
    readyRef.current = true
  }, [editor, content])

  const handleChange = useCallback(() => {
    if (!readyRef.current || readOnly) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const markdown = editor.blocksToMarkdownLossy()
      appliedRef.current = markdown
      onContentChange(markdown)
    }, 500)
  }, [editor, onContentChange, readOnly])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className={cn(readOnly && 'opacity-60 transition-opacity')} aria-busy={readOnly}>
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={handleChange}
        theme="light"
      />
    </div>
  )
}
