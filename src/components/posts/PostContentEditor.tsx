import { useCallback, useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import '@/blocknote-theme.css'
import { editorSchema } from '@/lib/blocknoteSchema'
import { EditorMenus } from '@/components/editor/EditorMenus'
import { uploadImage } from '@/services/api/images'

type PostContentEditorProps = {
  initialContent: string
  onContentChange: (content: string) => void
  editable?: boolean
}

const DEFAULT_CONTENT = [{ type: 'paragraph' as const }]

export function PostContentEditor({
  initialContent,
  onContentChange,
  editable = true,
}: PostContentEditorProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyRef = useRef(false)
  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: DEFAULT_CONTENT,
    uploadFile: uploadImage,
  })

  useEffect(() => {
    const blocks = editor.tryParseMarkdownToBlocks(initialContent ?? '')
    const next = blocks.length > 0 ? blocks : DEFAULT_CONTENT
    editor.replaceBlocks(editor.document, next)
    readyRef.current = true
  }, [editor])

  const handleChange = useCallback(() => {
    if (!readyRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onContentChange(editor.blocksToMarkdownLossy())
    }, 500)
  }, [editor, onContentChange])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      onChange={handleChange}
      theme="light"
      formattingToolbar={false}
      slashMenu={false}
      sideMenu={false}
    >
      <EditorMenus />
    </BlockNoteView>
  )
}
