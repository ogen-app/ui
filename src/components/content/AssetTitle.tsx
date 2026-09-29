import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

/** How long after the last keystroke the title is written back. */
const SAVE_DEBOUNCE_MS = 500

/**
 * The title of an asset whose body this screen does not edit — extracted text,
 * a recording — as the one field on it that is the user's.
 *
 * A rename on those types is a title-only PUT (CON-312): the server keeps the
 * stored content when none is sent and never re-chunks for a rename, so this
 * is safe on an asset whose `content` would be refused. Debounced here and
 * flushed on unmount, so leaving mid-word still saves the word.
 *
 * Styled as the editor's and the image screen's titles are, so an asset's
 * name sits in the same place whichever screen it opened on.
 */
export function AssetTitle({
  initialTitle,
  onChange,
  onDirty,
}: {
  initialTitle: string
  onChange: (title: string) => void
  onDirty: () => void
}) {
  const { t } = useTranslation()
  // Seeded once: re-seeding on a refetch would take the field away from
  // whoever is mid-word in it.
  const [title, setTitle] = useState(initialTitle)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<string | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    const pending = pendingRef.current
    pendingRef.current = null
    // The API has no way to say "no title", so an emptied one saves as a
    // space — the fallback the editor and the image screen use too.
    if (pending !== null)
      onChangeRef.current(pending.trim() === '' ? ' ' : pending)
  }, [])

  useEffect(() => flush, [flush])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value.replace(/\n/g, '')
    setTitle(next)
    onDirty()
    pendingRef.current = next
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
  }

  return (
    <textarea
      ref={ref}
      value={title.trim() === '' ? '' : title}
      onChange={handleChange}
      placeholder={t('content.titlePlaceholder')}
      aria-label={t('content.titleLabel')}
      rows={1}
      className="w-full resize-none overflow-hidden border-0 bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-tertiary-foreground"
    />
  )
}
