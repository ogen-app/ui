import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CaretLeftIcon,
  CloudCheckIcon,
  CloudIcon,
  DevicesIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatAnchor } from '@/components/campaigns/calendar/date'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { cn } from '@/lib'

type Props = {
  campaignId: string
  /** Autosave in flight — shows the pulsing cloud instead of the checkmark. */
  saving: boolean
  settingsOpen: boolean
  onToggleSettings: () => void
  previewOpen: boolean
  onTogglePreview: () => void
  onDownloadMarkdown: () => void
  /** Opens the status-aware delete confirmation. */
  onDeletePost: () => void
  /** Status transition buttons (primary action + overflow). */
  actions?: ReactNode
}

/**
 * Post details top bar: back to the campaign calendar on the left; status
 * actions and the icon cluster (sync state, preview, settings, more) on the
 * right. The post title intentionally lives only in the editor below.
 * Composes PageHeader, so the sticky fade-out chrome matches every other page.
 */
export function PostDetailsHeader({
  campaignId,
  saving,
  settingsOpen,
  onToggleSettings,
  previewOpen,
  onTogglePreview,
  onDownloadMarkdown,
  onDeletePost,
  actions,
}: Props) {
  return (
    <PageHeader
      back={
        <Button
          variant="headerIcon"
          size="excluded"
          asChild
          aria-label="Back to campaign calendar"
        >
          <Link
            to="/campaigns/$campaignId/calendar/$anchor/$view"
            params={{ campaignId, anchor: formatAnchor(new Date()), view: 'week' }}
          >
            <CaretLeftIcon className="size-5" />
          </Link>
        </Button>
      }
      actions={
        <>
          {actions}
          <SyncStatus saving={saving} />
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
                <DevicesIcon weight={previewOpen ? 'fill' : 'regular'} className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Preview</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="smIcon"
            className={cn(settingsOpen && 'text-accent hover:text-accent')}
            onClick={onToggleSettings}
            aria-label="Post settings"
            aria-expanded={settingsOpen}
          >
            <GearSixIcon weight={settingsOpen ? 'fill' : 'regular'} className="size-5" />
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

function SyncStatus({ saving }: { saving: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="flex size-8 items-center justify-center text-secondary-foreground"
          role="status"
          aria-label={saving ? 'Saving…' : 'All changes saved'}
        >
          {saving ? (
            <CloudIcon className="size-5 animate-pulse-opacity" />
          ) : (
            <CloudCheckIcon className="size-5" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {saving ? 'Saving…' : 'All changes saved'}
      </TooltipContent>
    </Tooltip>
  )
}
