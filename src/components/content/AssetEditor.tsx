import { useEffect, useRef, useCallback, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { Block } from '@blocknote/core'
import '@blocknote/mantine/style.css'
import '@/blocknote-theme.css'
import { uploadImage } from '@/services/api/images'

type AssetEditorProps = {
  initialTitle: string
  initialContent: string
  onTitleChange: (title: string) => void
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

export function AssetEditor({
  initialTitle,
  initialContent,
  onTitleChange,
  onContentChange,
  onDirty,
}: AssetEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLTextAreaElement | null>(null)
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

  const autosizeTitle = useCallback(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    autosizeTitle()
  }, [title, autosizeTitle])

  const handleTitleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value.replace(/\n/g, '')
      setTitle(next)
      onDirty?.()
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
      titleTimerRef.current = setTimeout(() => {
        onTitleChange(next.trim() === '' ? ' ' : next)
      }, 500)
    },
    [onTitleChange, onDirty],
  )

  const displayTitle = title.trim() === '' ? '' : title

  const focusFirstBlock = useCallback(() => {
    const first = editor.document[0]
    if (first) {
      editor.setTextCursorPosition(first, 'start')
    }
    editor.focus()
  }, [editor])

  const handleTitleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const first = editor.document[0]
        const firstIsEmptyParagraph =
          first?.type === 'paragraph' &&
          Array.isArray(first.content) &&
          first.content.length === 0
        if (!firstIsEmptyParagraph && first) {
          editor.insertBlocks([{ type: 'paragraph' }], first, 'before')
        }
        requestAnimationFrame(() => focusFirstBlock())
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusFirstBlock()
      }
    },
    [editor, focusFirstBlock],
  )

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
    if (contentTimerRef.current) clearTimeout(contentTimerRef.current)
    contentTimerRef.current = setTimeout(() => {
      // A document emptied on purpose still has to be saved, and the API has
      // no way to say "no body" — same single space the title falls back to.
      onContentChange(markdown === '' ? ' ' : markdown)
    }, 500)
  }, [editor, onContentChange, onDirty])

  useEffect(() => {
    return () => {
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col">
      <textarea
        ref={titleRef}
        value={displayTitle}
        onChange={handleTitleChange}
        onKeyDown={handleTitleKeyDown}
        placeholder="Title"
        rows={1}
        className="resize-none overflow-hidden bg-transparent border-0 outline-none w-full text-4xl font-bold tracking-tight placeholder:text-tertiary-foreground mb-4"
      />
      <BlockNoteView
        editor={editor}
        onChange={handleContentChange}
        theme="light"
      />
    </div>
  )
}
