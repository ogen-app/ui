import { useEffect, useRef, useCallback } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { Block } from '@blocknote/core'
import '@blocknote/mantine/style.css'
import '@/blocknote-theme.css'
import { uploadImage } from '@/services/api/images'

type AssetEditorProps = {
  initialContent: string
  onContentChange: (content: string) => void
  onDirty?: () => void
}

const DEFAULT_CONTENT: Block[] = [
  {
    type: 'paragraph',
    props: {},
    content: [],
  } as unknown as Block,
]

/**
 * A note's body, under the asset page's Source tab. The title is edited in
 * the page's left column (CON-366), so the body is all this draws.
 */
export function AssetEditor({
  initialContent,
  onContentChange,
  onDirty,
}: AssetEditorProps) {
  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // What the running debounce would send when it fires, so the unmount
  // cleanup can flush it instead of throwing the last edit away. The callback
  // ref exists because that cleanup runs once, with the first render's props
  // in scope.
  const pendingContentRef = useRef<string | null>(null)
  const onContentChangeRef = useRef(onContentChange)
  useEffect(() => {
    onContentChangeRef.current = onContentChange
  }, [onContentChange])
  const readyRef = useRef(false)
  // The markdown the editor last held on our behalf: what we loaded into it,
  // or what we last sent up. Anything equal to this is not an edit.
  const lastMarkdownRef = useRef('')

  const editor = useCreateBlockNote({
    initialContent: DEFAULT_CONTENT,
    uploadFile: uploadImage,
  })

  useEffect(() => {
    const blocks = editor.tryParseMarkdownToBlocks(initialContent ?? '')
    const next = blocks.length > 0 ? blocks : DEFAULT_CONTENT
    editor.replaceBlocks(editor.document, next)
    lastMarkdownRef.current = editor.blocksToMarkdownLossy()
    readyRef.current = true
    // Load-once on purpose. `initialContent` is the asset as it arrived;
    // re-running this when it changes would replace the blocks under
    // someone who is mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const handleContentChange = useCallback(() => {
    if (!readyRef.current) return
    // Loading a document is not editing it. The editor fires a change once the
    // view has attached to what we just put in it, and saving that back is at
    // best a pointless write — and on a note created seconds ago it is an
    // empty body, which the API refuses with "content is required".
    const markdown = editor.blocksToMarkdownLossy()
    if (markdown === lastMarkdownRef.current) return
    lastMarkdownRef.current = markdown
    onDirty?.()
    // A document emptied on purpose still has to be saved, and the API has
    // no way to say "no body" — the single space a blank title falls back to.
    const value = markdown === '' ? ' ' : markdown
    pendingContentRef.current = value
    if (contentTimerRef.current) clearTimeout(contentTimerRef.current)
    contentTimerRef.current = setTimeout(() => {
      contentTimerRef.current = null
      pendingContentRef.current = null
      onContentChange(value)
    }, 500)
  }, [editor, onContentChange, onDirty])

  useEffect(() => {
    // Flush, not cancel: leaving inside the debounce window still saves the
    // last edit — the same flush-on-unmount rule as the post editor. The save
    // this triggers is a promise already in motion by the time the tree is
    // gone; unmounting cancels no promises.
    return () => {
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current)
      if (pendingContentRef.current !== null) {
        onContentChangeRef.current(pendingContentRef.current)
        pendingContentRef.current = null
      }
    }
  }, [])

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleContentChange}
      theme="light"
    />
  )
}
