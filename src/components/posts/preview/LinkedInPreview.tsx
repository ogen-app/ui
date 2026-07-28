import {
  ChatCircleIcon,
  DotsThreeIcon,
  GlobeIcon,
  PaperPlaneTiltIcon,
  RepeatIcon,
  ThumbsUpIcon,
} from '@phosphor-icons/react'
import { PLATFORM_TEXT_LIMITS } from '@/lib/socialText.ts'
import {
  Action,
  ActionRow,
  FoldedText,
  PreviewAvatar,
  PreviewMedia,
  PreviewSurface,
} from './previewParts.tsx'
import { LINKEDIN as C } from './previewTheme.ts'
import type { PreviewProps } from './types.ts'

/**
 * A LinkedIn feed post.
 *
 * The fold is the thing to get right here: LinkedIn cuts at roughly three
 * lines and hides the rest behind "…see more", so the first ~210 characters
 * are all most of the feed will ever read.
 */
export function LinkedInPreview({ text, mediaUrls, author, timeLabel }: PreviewProps) {
  const name = author.name ?? 'Your page'

  return (
    <PreviewSurface style={{ borderRadius: 8 }}>
      <div className="flex items-start gap-2 px-3 pt-3 pb-1">
        <PreviewAvatar src={author.avatarUrl} name={name} size={48} background={C.link} />
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-semibold"
            style={{ color: C.text, fontSize: 14, lineHeight: 1.4286 }}
          >
            {name}
          </div>
          {author.subtitle && (
            <div className="truncate" style={{ color: C.muted, fontSize: 12, lineHeight: 1.3333 }}>
              {author.subtitle}
            </div>
          )}
          <div
            className="flex items-center gap-1"
            style={{ color: C.muted, fontSize: 12, lineHeight: 1.3333 }}
          >
            {timeLabel}
            <span aria-hidden>·</span>
            <GlobeIcon className="size-3" weight="fill" aria-hidden />
          </div>
        </div>
        <DotsThreeIcon className="size-6 shrink-0" style={{ color: C.muted }} aria-hidden />
      </div>

      <div className="px-3 pb-2 pt-1">
        <FoldedText
          text={text}
          fold={PLATFORM_TEXT_LIMITS.linkedin.fold}
          moreLabel="see more"
          color={C.text}
          moreColor={C.muted}
        />
      </div>

      <PreviewMedia urls={mediaUrls} aspect={1.91} background="#f3f2ef" />

      <ActionRow color={C.action}>
        <Action icon={<ThumbsUpIcon className="size-5" aria-hidden />} label="Like" />
        <Action icon={<ChatCircleIcon className="size-5" aria-hidden />} label="Comment" />
        <Action icon={<RepeatIcon className="size-5" aria-hidden />} label="Repost" />
        <Action icon={<PaperPlaneTiltIcon className="size-5" aria-hidden />} label="Send" />
      </ActionRow>
    </PreviewSurface>
  )
}
