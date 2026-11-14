import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { counted } from '@/lib/intl'
import { cn, formatTitle } from '@/lib'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { NotGroundedMark } from '@/components/grounding/NotGroundedMark'
import { OutsideCampaignMark } from '@/components/campaigns/OutsideCampaignMark'
import { outsideCampaign } from '@/lib/campaignTarget'
import type { CampaignPlatform } from '@/types/campaigns'
import type { Post } from '@/types/posts'

/**
 * One post in the Not scheduled panel, as the CON-470 board draws it
 * (CON-485): the title, then "Instagram · Carousel · from 1 idea" — compact,
 * because the panel is a list to drag from rather than a calendar of cards.
 * A draft just written in this tab leads, tinted, under a JUST WRITTEN
 * eyebrow. Dragged onto a day it is scheduled, as a calendar card is.
 */
export function UnscheduledRow({
  post,
  justWritten,
  showCampaign,
  targets,
}: {
  post: Post
  justWritten: boolean
  /** On the workspace panel, whose post it is. */
  showCampaign: boolean
  targets?: readonly CampaignPlatform[]
}) {
  const { t } = useTranslation()
  const platform = usePlatformCatalog().resolve(post.platform_id)
  const type = post.platform_post_type
    ? (platform?.postTypes?.find((pt) => pt.slug === post.platform_post_type)
        ?.label ?? post.platform_post_type)
    : t('posts.postType.auto')
  const ideas = post.idea_count ?? 0
  const meta = [
    platform?.name ?? t('posts.noPlatform'),
    type,
    ideas > 0 && t('calendar.fromIdeas', counted(ideas)),
    showCampaign && post.campaign?.name,
  ].filter((part): part is string => !!part)
  const draggable = canEditScheduledAt(post.status)
  const outside = outsideCampaign(post, targets)
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
        'flex flex-col gap-0.5 border-b border-border px-3 py-2.5 transition-colors hover:bg-secondary',
        justWritten && 'bg-accent/5',
      )}
    >
      {justWritten && (
        <span className="text-[10.5px] font-semibold tracking-[0.08em] text-accent-ink">
          {t('calendar.justWritten')}
        </span>
      )}
      <span className="text-sm font-medium text-foreground">
        {formatTitle(post.title)}
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-tertiary-foreground">
        <span>{meta.join(' · ')}</span>
        <NotGroundedMark mode={post.grounding_mode} />
        <OutsideCampaignMark outside={outside} />
      </span>
    </Link>
  )
}
