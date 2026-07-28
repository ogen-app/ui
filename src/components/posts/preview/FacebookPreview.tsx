import {
  ArrowBendUpLeftIcon,
  ChatCircleIcon,
  DotsThreeIcon,
  GlobeIcon,
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
import { FACEBOOK as C } from './previewTheme.ts'
import type { PreviewProps } from './types.ts'

/**
 * A Facebook feed post.
 *
 * Facebook is the most forgiving of the three — a very high character cap and
 * a late fold — so the preview mostly earns its keep on media layout, which is
 * where Facebook does the most rearranging of what you gave it.
 */
export function FacebookPreview({ text, mediaUrls, author, timeLabel }: PreviewProps) {
  const name = author.name ?? 'Your page'

  return (
    <PreviewSurface style={{ borderRadius: 8 }}>
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <PreviewAvatar src={author.avatarUrl} name={name} size={40} background={C.link} />
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-semibold"
            style={{ color: C.text, fontSize: 15, lineHeight: 1.3333 }}
          >
            {name}
          </div>
          <div
            className="flex items-center gap-1"
            style={{ color: C.muted, fontSize: 13, lineHeight: 1.2308 }}
          >
            {timeLabel}
            <span aria-hidden>·</span>
            <GlobeIcon className="size-3" weight="fill" aria-hidden />
          </div>
        </div>
        <DotsThreeIcon className="size-6 shrink-0" style={{ color: C.muted }} aria-hidden />
      </div>

      <div className="px-3 pb-3">
        <FoldedText
          text={text}
          fold={PLATFORM_TEXT_LIMITS.facebook.fold}
          moreLabel="See more"
          color={C.text}
          moreColor={C.muted}
          style={{ fontSize: 15, lineHeight: 1.3333 }}
        />
      </div>

      <PreviewMedia urls={mediaUrls} background={C.cardFill} />

      <ActionRow color={C.action}>
        <Action icon={<ThumbsUpIcon className="size-5" aria-hidden />} label="Like" />
        <Action icon={<ChatCircleIcon className="size-5" aria-hidden />} label="Comment" />
        <Action icon={<ArrowBendUpLeftIcon className="size-5" aria-hidden />} label="Share" />
      </ActionRow>
    </PreviewSurface>
  )
}
