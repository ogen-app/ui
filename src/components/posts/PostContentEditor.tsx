import { useCallback, useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import {
  BlockNoteSchema,
  createExtension,
  defaultBlockSpecs,
} from '@blocknote/core'
import '@blocknote/mantine/style.css'
import '@/blocknote-theme.css'
import { uploadImage } from '@/services/api/images'
import { cn } from '@/lib'
import type { SpanStatus } from '@/lib/qualityHighlights.ts'
import {
  chooseHighlight,
  HIGHLIGHT_CHOOSE_EVENT,
  HIGHLIGHT_STATUS_EVENT,
  qualityHighlightPlugin,
  setHighlights,
  type HighlightChooseDetail,
  type HighlightSpan,
  type HighlightStatusDetail,
} from './quality/highlightPlugin.ts'

// Image block is intentionally disabled here — posts are per-platform and
// the image affordance will be re-enabled conditionally per post type.
const { image: _image, ...postBlockSpecs } = defaultBlockSpecs
const postSchema = BlockNoteSchema.create({ blockSpecs: postBlockSpecs })

type PostContentEditorProps = {
  content: string
  onContentChange: (content: string) => void
  /**
   * Locked for good: a copy of this post exists outside Ogen, so these words
   * are the record of what went out rather than a draft (CON-251).
   *
   * Rendered at full strength, unlike `busy` below. Dimming it would make the
   * one authoritative copy of what was published the hardest thing on the page
   * to read — and there is nothing in flight to wait for, which is what dimming
   * means everywhere else in the app.
   */
  readOnly?: boolean
  /**
   * Frozen while the assistant rewrites this post server-side.
   * Editing during a run would be lost — the assistant's write wins.
   */
  busy?: boolean
  /**
   * The quality panel's suggestions to find and paint in the body (CON-441),
   * or `null` while the panel is closed. Re-read only when the object
   * changes, so it is a value per panel session rather than per render.
   */
  highlights?: HighlightSpan[] | null
  /** The suggestion chosen in the panel, by its index in the list. */
  chosenHighlight?: number | null
  /** The author clicked inside a marked span. */
  onChooseHighlight?: (index: number) => void
  /** What became of each asked-for span: found, the whole post, or edited. */
  onHighlightStatus?: (statuses: Record<number, SpanStatus>) => void
}

const DEFAULT_CONTENT = [{ type: 'paragraph' as const }]

export function PostContentEditor({
  content,
  onContentChange,
  readOnly = false,
  busy = false,
  highlights = null,
  chosenHighlight = null,
  onChooseHighlight,
  onHighlightStatus,
}: PostContentEditorProps) {
  const frozen = readOnly || busy
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyRef = useRef(false)
  // The Markdown this editor last put on screen. Guards the sync effect below
  // from reacting to the round-trip of the user's own typing.
  const appliedRef = useRef<string | null>(null)
  const editor = useCreateBlockNote({
    schema: postSchema,
    initialContent: DEFAULT_CONTENT,
    uploadFile: uploadImage,
    extensions: [
      createExtension({
        key: 'qualityHighlights',
        prosemirrorPlugins: [qualityHighlightPlugin()],
      }),
    ],
  })

  // The plugin reports on the editor's DOM; declared before the effects that
  // hand it spans, so the first report has someone listening.
  useEffect(() => {
    const dom = editor.prosemirrorView.dom
    const choose = (e: Event) =>
      onChooseHighlight?.((e as CustomEvent<HighlightChooseDetail>).detail)
    const status = (e: Event) =>
      onHighlightStatus?.((e as CustomEvent<HighlightStatusDetail>).detail)
    dom.addEventListener(HIGHLIGHT_CHOOSE_EVENT, choose)
    dom.addEventListener(HIGHLIGHT_STATUS_EVENT, status)
    return () => {
      dom.removeEventListener(HIGHLIGHT_CHOOSE_EVENT, choose)
      dom.removeEventListener(HIGHLIGHT_STATUS_EVENT, status)
    }
  }, [editor, onChooseHighlight, onHighlightStatus])

  // Load on mount, and re-load whenever `content` changes from the outside —
  // the assistant edits the post on the server, so new content arrives through
  // the query cache rather than through this editor.
  useEffect(() => {
    if (appliedRef.current === content) return
    const next = editor.tryParseMarkdownToBlocks(content ?? '')
    appliedRef.current = content
    editor.replaceBlocks(
      editor.document,
      next.length > 0 ? next : DEFAULT_CONTENT,
    )
    // A body replaced from outside — the assistant's rewrite — is a new text,
    // not an edit of the old one: look the spans up again rather than map
    // every mark through the replacement and call them all edited.
    if (highlights) setHighlights(editor.prosemirrorView, highlights)
    readyRef.current = true
  }, [editor, content, highlights])

  // After the load above, so a session's spans are looked for in the post that
  // is actually on screen.
  useEffect(() => {
    setHighlights(editor.prosemirrorView, highlights)
  }, [editor, highlights])

  useEffect(() => {
    const view = editor.prosemirrorView
    chooseHighlight(view, chosenHighlight)
    if (chosenHighlight === null) return
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    // `nearest`: a span already on screen — the one just clicked, say —
    // doesn't move.
    view.dom.querySelector('[data-quality-chosen]')?.scrollIntoView({
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [editor, chosenHighlight])

  const handleChange = useCallback(() => {
    if (!readyRef.current || frozen) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const markdown = editor.blocksToMarkdownLossy()
      appliedRef.current = markdown
      onContentChange(markdown)
    }, 500)
  }, [editor, onContentChange, frozen])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      // Only the assistant's run dims the page — see `readOnly`'s note.
      className={cn(busy && 'opacity-60 transition-opacity')}
      aria-busy={busy}
      aria-readonly={readOnly || undefined}
    >
      <BlockNoteView
        editor={editor}
        editable={!frozen}
        onChange={handleChange}
        theme="light"
      />
    </div>
  )
}
