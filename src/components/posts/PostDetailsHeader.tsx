import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  CaretLeftIcon,
  ClockCounterClockwiseIcon,
  DevicesIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  GaugeIcon,
  GearSixIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { SaveStatus } from '@/components/page-primitives/SaveStatus'
import { usePostsPlace } from '@/hooks/usePostsPlace'
import { cn } from '@/lib'

type Props = {
  campaignId: string
  /** Autosave in flight — shows the pulsing cloud instead of the checkmark. */
  saving: boolean
  settingsOpen: boolean
  onToggleSettings: () => void
  previewOpen: boolean
  onTogglePreview: () => void
  qualityOpen: boolean
  onToggleQuality: () => void
  versionsOpen: boolean
  onToggleVersions: () => void
  onDownloadMarkdown: () => void
  /** Opens the status-aware delete confirmation. */
  onDeletePost: () => void
}

/**
 * The back arrow, pointed at wherever the user was last reading this campaign's
 * posts — the week or month they had navigated to, or the table.
 *
 * Its own component because that is two different routes, and a `<Link>` gets
 * its param types from a literal `to`: a union built up and spread in would
 * type as neither. Two branches is the cost of keeping a real anchor, which is
 * what makes the arrow middle-clickable and right-clickable like any other
 * link — the alternative, a button calling `history.back()`, is not a
 * navigation the browser can offer anything for, and has nowhere to go at all
 * when the post was opened from a pasted URL.
 */
function BackToPosts({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const place = usePostsPlace(campaignId)
  const label = t('posts.backToPosts')

  return (
    <Button variant="headerIcon" size="excluded" asChild aria-label={label}>
      {place.view === 'list' ? (
        <Link to="/campaigns/$campaignId/list" params={{ campaignId }}>
          <CaretLeftIcon className="size-5" />
        </Link>
      ) : (
        <Link
          to="/campaigns/$campaignId/calendar/$anchor/$view"
          params={{ campaignId, anchor: place.anchor, view: place.view }}
        >
          <CaretLeftIcon className="size-5" />
        </Link>
      )}
    </Button>
  )
}

/**
 * Post details top bar: back to the campaign's posts on the left, the save
 * state in the centre, and the view toggles (preview, quality, versions,
 * settings, overflow) on the right. The post title intentionally lives only in
 * the editor below. Composes PageHeader, so the sticky fade-out chrome matches
 * every other page.
 *
 * The right corner is **views only** — nothing here changes the document. The
 * status transitions that used to sit alongside them are on the bottom action
 * bar now (`PostStatusActionBar`), which is what lets this row mean one thing.
 */
export function PostDetailsHeader({
  campaignId,
  saving,
  settingsOpen,
  onToggleSettings,
  previewOpen,
  onTogglePreview,
  qualityOpen,
  onToggleQuality,
  versionsOpen,
  onToggleVersions,
  onDownloadMarkdown,
  onDeletePost,
}: Props) {
  return (
    <PageHeader
      back={<BackToPosts campaignId={campaignId} />}
      center={<SaveStatus saving={saving} />}
      actions={
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="smIcon"
                className={cn(previewOpen && 'text-accent hover:text-accent')}
                onClick={onTogglePreview}
                aria-label="Preview"
                aria-expanded={previewOpen}
              >
                {/* Explicit weight rather than inherited: Button puts icons in
                    a bold IconContext, which made this read heavier than the
                    cloud/gear/dots beside it. Fills when open, matching the
                    gear next to it. */}
                <DevicesIcon
                  weight={previewOpen ? 'fill' : 'regular'}
                  className="size-5"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Preview</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="smIcon"
                className={cn(qualityOpen && 'text-accent hover:text-accent')}
                onClick={onToggleQuality}
                aria-label="Quality"
                aria-expanded={qualityOpen}
              >
                <GaugeIcon
                  weight={qualityOpen ? 'fill' : 'regular'}
                  className="size-5"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Quality</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="smIcon"
                className={cn(versionsOpen && 'text-accent hover:text-accent')}
                onClick={onToggleVersions}
                aria-label="Versions"
                aria-expanded={versionsOpen}
              >
                <ClockCounterClockwiseIcon
                  weight={versionsOpen ? 'fill' : 'regular'}
                  className="size-5"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Versions</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="smIcon"
            className={cn(settingsOpen && 'text-accent hover:text-accent')}
            onClick={onToggleSettings}
            aria-label="Post settings"
            aria-expanded={settingsOpen}
          >
            <GearSixIcon
              weight={settingsOpen ? 'fill' : 'regular'}
              className="size-5"
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="smIcon" aria-label="More options">
                <DotsThreeVerticalIcon weight="regular" className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onDownloadMarkdown}>
                <DownloadSimpleIcon />
                <span>Download as Markdown</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDeletePost}>
                <TrashIcon />
                <span>Delete post</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  )
}
