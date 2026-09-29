import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { readPostFormat, writePostFormat } from '@/services/api/contentLocal'
import type { ContentFormatId } from '@/lib/contentFormats'
import { FormatPicker } from './FormatPicker'

/**
 * What shape this post takes — the post editor's half of CON-264.
 *
 * One control, and it is the cheapest thing in the feature: a post's format
 * needs no library, no setup and no series, which is why it is on its own flag.
 * A workspace that never opens the Series page still gets *our explainers land,
 * our listicles do not* out of it.
 *
 * ## Why it is not locked on a published post
 *
 * Everything else in the editor stops being editable once a post is scheduled
 * or published (CON-251), because the content is what went out. A format is not
 * content — it is a label describing what went out, and the whole value of the
 * label is the history it accumulates. Locking it would mean a workspace could
 * only ever group the posts it filed *before* publishing, which on the day the
 * feature ships is none of them.
 *
 * That reasoning survives the column landing, but the decision should be taken
 * again there, deliberately: see the note in `services/api/contentLocal.ts`.
 *
 * ## State, and why it is local
 *
 * The sidecar is `localStorage` and answers synchronously, so this holds its own
 * value rather than going through the Query cache — there is nothing to be
 * stale against and no other screen writing it. The `postId` in the dependency
 * list is the part that matters: the editor keeps this component mounted while
 * you switch posts, and without it the second post would show the first one's
 * format and overwrite it on the next change.
 */
export function PostFormatSection({
  postId,
  disabled,
}: {
  postId: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<ContentFormatId | null>(() =>
    readPostFormat(postId),
  )

  useEffect(() => {
    setFormat(readPostFormat(postId))
  }, [postId])

  return (
    <div className="flex flex-col gap-2 pt-2 pb-4">
      <FormatPicker
        id="post-content-format"
        variant="default"
        value={format}
        disabled={disabled}
        onChange={(next) => {
          setFormat(next)
          writePostFormat(postId, next)
        }}
      />
      <p className="text-xs text-tertiary-foreground">
        {t('formats.postHint')}
      </p>
    </div>
  )
}
