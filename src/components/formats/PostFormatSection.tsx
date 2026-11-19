import { ShapesIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Mark, SettingRow } from '@/components/posts/quickBar/parts'
import { isSubmitted } from '@/lib/postStatusMachine'
import type { Post } from '@/types/posts'
import { FormatPicker } from './FormatPicker'

/**
 * What shape this post takes — the post editor's half of CON-264.
 *
 * One control, and it is the cheapest thing in the feature: a post's format
 * needs no library, no setup and no series, which is why it is on its own flag.
 * A workspace that never opens the Series page still gets *our explainers land,
 * our listicles do not* out of it.
 *
 * ## Saved like the rest of the post
 *
 * `content_format` is a field on the post (CON-329), so it paints through
 * `changeDoc` and rides the editor's autosave — no state of its own, and
 * switching posts needs no reset because the value is read off the post.
 *
 * ## Locked once the post has gone out
 *
 * The server refuses a change on a `scheduled` or `published` post (409, the
 * CON-251 content lock): the shape a post took is a fact about what went out,
 * not an input to the next generation. So the picker is disabled there, the
 * same as the post type beside it — unscheduling is how it is changed.
 *
 * One row of the post's Settings list, so it renders inside that list's
 * `<dl>`.
 */
export function PostFormatSection({
  post,
  changeDoc,
}: {
  post: Post
  changeDoc: (fn: (p: Post) => void) => void
}) {
  const { t } = useTranslation()
  const label = t('posts.editor.settings.format')

  return (
    <SettingRow label={label}>
      <Mark>
        <ShapesIcon />
      </Mark>
      <FormatPicker
        id="post-content-format"
        variant="inline"
        size="sm"
        ariaLabel={label}
        value={post.content_format}
        disabled={isSubmitted(post.status)}
        onChange={(next) => {
          changeDoc((d) => {
            d.content_format = next
          })
        }}
      />
    </SettingRow>
  )
}
