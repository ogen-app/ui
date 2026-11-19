import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Button } from '@/components/ui/button'
import { formatTitle } from '@/lib'
import { postStatusLabel } from '@/lib/postStatusLabel'
import type { PostWarning } from '@/lib/postWarnings'
import type { Post } from '@/types/posts'
import { WarningGlyph } from './PostWarningsMark'

/**
 * The posts list's drawer: one post's warnings, most serious first, each as
 * what is wrong and what to do about it, and the way into the post to do it.
 *
 * `post` undefined is a post that left the list while the drawer was open
 * (deleted, or filtered away); `warnings` empty is one that was fixed. Both
 * say so rather than closing under the reader.
 */
export function PostWarningsPanel({
  post,
  warnings,
  onClose,
}: {
  post: Post | undefined
  warnings: readonly PostWarning[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const order = { blocking: 0, warning: 1, notice: 2 } as const
  const sorted = [...warnings].sort((a, b) => order[a.level] - order[b.level])
  return (
    <RailPanel
      title={t('postsTable.warnings.panelTitle')}
      onClose={onClose}
      className="h-full"
      footer={
        post ? (
          <Button variant="default" className="w-full" asChild>
            <Link
              to="/campaigns/$campaignId/posts/$postId"
              params={{ campaignId: post.campaign_id, postId: post.id }}
            >
              <span>{t('postsTable.warnings.openPost')}</span>
              <ArrowRightIcon />
            </Link>
          </Button>
        ) : undefined
      }
    >
      {post && (
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-medium text-foreground">
            {formatTitle(post.title)}
          </p>
          <p className="text-[13px] text-tertiary-foreground">
            {[
              post.campaign?.name,
              postStatusLabel(t, post.status),
              post.platform?.name,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="text-sm text-tertiary-foreground">
          {t('postsTable.warnings.none')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((w) => (
            <li
              key={w.kind}
              className="flex gap-3 rounded-sm bg-secondary px-3 py-2.5"
            >
              <WarningGlyph level={w.level} className="mt-0.5 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {t(`postsTable.warnings.kind.${w.kind}.title`)}
                </span>
                <span className="text-[13px] text-secondary-foreground">
                  {t(`postsTable.warnings.kind.${w.kind}.detail`)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </RailPanel>
  )
}
