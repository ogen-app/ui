import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CircleDashedIcon,
  ClockIcon,
  ExclamationMarkIcon,
  LockIcon,
} from '@phosphor-icons/react'
import type { Post } from '@/types/posts'
import { POST_STATUS_LABELS } from '@/types/posts'
import { cn, formatTitle } from '@/lib'
import { getPlatformInfo, getPostTypeLabel } from '@/lib/platformDictionary'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { hasVisibleProblem } from '@/lib/postValidation'

type PostCardProps = {
  post: Post
}

// Status is conveyed by a 2px accent on the card's left edge. Draft is
// intentionally transparent (the border still reserves its 2px so every
// card stays aligned).
const STATUS_BORDER_COLOR: Record<string, string> = {
  draft: 'border-l-transparent',
  ready_for_publish: 'border-l-chart-4',
  scheduled: 'border-l-positive',
  scheduled_for_manual_publishing: 'border-l-chart-5',
  failed: 'border-l-destructive',
  published: 'border-l-positive',
  not_published: 'border-l-negative',
}

/**
 * The title's type scale, between 10 and 14px, from the two things that
 * decide whether two lines are enough: how wide the card is (`cqw`, off the
 * card's own container) and how much there is to fit. Width alone doesn't do
 * it — at one fixed ratio a 30-character title wastes the space a 60-character
 * one needs — so a longer title starts lower in the range and reaches the
 * floor sooner. Static class strings, not a computed style, so Tailwind can
 * see them.
 *
 * The floor is a floor: past roughly 60 characters on a 150px column nothing
 * inside the range fits two lines, and `line-clamp-2` takes over.
 */
function titleSize(title: string): string {
  if (title.length <= 30) return 'text-[clamp(10px,9cqw,14px)]'
  if (title.length <= 48) return 'text-[clamp(10px,8cqw,13px)]'
  return 'text-[clamp(10px,6cqw,12px)]'
}

function PostCardComponent({ post }: PostCardProps) {
  const title = formatTitle(post.title)
  const platformInfo = getPlatformInfo(post.platform_id)
  // Fall back to a neutral, "undefined"-feeling dashed circle (in the muted
  // tertiary color, not a warning hue) when no platform is assigned.
  const PlatformIcon = platformInfo?.icon ?? CircleDashedIcon
  const label = platformInfo
    ? getPostTypeLabel(post.platform_id, post.platform_post_type)
    : 'No platform'
  const statusLabel = POST_STATUS_LABELS[post.status] ?? post.status
  const borderColor = STATUS_BORDER_COLOR[post.status] ?? 'border-l-transparent'
  // The calendar lays posts out by scheduled_at; show that time (or the
  // publish time once published). Unscheduled posts have neither — omit it.
  const timeSource = post.scheduled_at ?? post.published_at
  const time = timeSource
    ? new Date(timeSource).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null

  // Only what the list payload already carries — `media_urls`. The editor's
  // uploads land in `post_attachments`, whose thumbnails are hydrated per
  // post, and a week view will not make one request per card for them. See
  // the note in docs/technical-decisions.md#calendar-card-media.
  const image = post.media_urls[0]
  const problem = hasVisibleProblem(post)

  // Dragging rewrites scheduled_at, which is locked while `scheduled`
  // (the Zernio submission owns the publish time) and once `published`.
  // Anchors are natively draggable, so also block dragstart itself.
  const draggable = canEditScheduledAt(post.status)

  return (
    <Link
      to="/campaigns/$campaignId/posts/$postId"
      params={{ campaignId: post.campaign_id, postId: post.id }}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) {
          e.preventDefault()
          return
        }
        e.dataTransfer.setData('text/plain', post.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={cn(
        // 4px of padding: the columns go down to 150px, so every pixel not
        // spent on inset buys title characters. The shadow does the work the
        // padding used to — it separates the card from the lane behind it
        // without a border eating another 2px on each side.
        'bg-primary p-1 w-full border-l-2',
        borderColor,
        // `@container` so the title can size itself off the card's own width
        // — the columns are flex-1 from a 150px floor, so the same card is
        // narrow on a seven-day week and roomy on a two-day one.
        '@container flex flex-col gap-1 cursor-pointer transition-shadow',
        // Elevation carries draggability, and it is the *only* thing that
        // moves on hover — the fill stays put, so a column of cards doesn't
        // flash as the pointer crosses it. A card you can move sits slightly
        // proud of the lane and lifts under the pointer; a card whose date is
        // locked (`scheduled` / `published`) lies flat on it at 1px and stays
        // there. So "can I drag this?" is answered before the drag, by the
        // same cue that answers it during one.
        draggable ? 'shadow-sm hover:shadow-md' : 'shadow-xs',
      )}
    >
      {/* Leading image — only when the post actually carries one. 3:4, and
          contained rather than cropped: this is the picture that is going
          out, so the card shows its real shape instead of a centre crop. */}
      {image && (
        <div className="aspect-[3/4] w-full shrink-0 overflow-hidden bg-secondary">
          <img src={image} alt="" className="size-full object-contain" />
        </div>
      )}

      {/* Row 1 — a 12px flag, then the status. The two flags share one slot
          and never both show: a broken post is the more urgent fact, and a
          locked date is small print next to it. */}
      <div className="flex items-center gap-1 text-[10px]/[14px] text-tertiary-foreground">
        {problem ? (
          <ExclamationMarkIcon
            weight="bold"
            className="size-3 shrink-0 text-destructive"
            aria-label="This post has a problem"
          />
        ) : (
          !draggable && (
            <LockIcon
              weight="bold"
              className="size-3 shrink-0"
              aria-label="This post's date is locked"
            />
          )
        )}
        <span className="truncate">{statusLabel}</span>
      </div>

      {/* Row 2 — title. The type scales with the card so two lines of it fit
          without reaching for the ellipsis: 14px where there is room, down to
          10px on a narrow column, never past either end. `line-clamp-2` stays
          as the backstop for a title no size would fit. */}
      <div className={cn(titleSize(title), 'leading-[1.2] font-medium line-clamp-2')}>
        {title}
      </div>

      {/* Row 3 — time */}
      {time && (
        <div className="flex items-center gap-1.5 text-[10px]/[14px] text-tertiary-foreground">
          <ClockIcon className="size-3.5 shrink-0" />
          <span className="truncate">{time}</span>
        </div>
      )}

      {/* Row 4 — platform */}
      <div className="flex items-center gap-1.5 text-[10px]/[14px] text-tertiary-foreground min-w-0">
        <PlatformIcon
          weight="fill"
          color={platformInfo?.color}
          className="size-3.5 shrink-0"
        />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  )
}

export const PostCard = memo(PostCardComponent)
