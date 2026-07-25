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
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatAnchor } from '@/components/campaigns/calendar/date'

type Props = {
  campaignId: string
  /** Autosave in flight — shows the pulsing cloud instead of the checkmark. */
  saving: boolean
  settingsOpen: boolean
  onToggleSettings: () => void
  onDownloadMarkdown: () => void
  /** Status transition buttons (primary action + overflow). */
  actions?: ReactNode
}

/**
 * Post details top bar: back to the campaign calendar on the left; status
 * actions and the icon cluster (sync state, preview, settings, more) on the
 * right. The post title intentionally lives only in the editor below.
 */
export function PostDetailsHeader({
  campaignId,
  saving,
  settingsOpen,
  onToggleSettings,
  onDownloadMarkdown,
  actions,
}: Props) {
  return (
    <div className="sticky top-0 z-10 px-3 lg:px-6 pt-6 pb-6 flex items-center justify-between gap-3 bg-gradient-to-b from-background from-42% to-transparent">
      <Button variant="ghost" size="smIcon" asChild aria-label="Back to campaign calendar">
        <Link
          to="/campaigns/$campaignId/calendar/$anchor/$view"
          params={{ campaignId, anchor: formatAnchor(new Date()), view: 'week' }}
        >
          <CaretLeftIcon className="size-5" />
        </Link>
      </Button>

      <div className="flex items-center gap-2">
        {actions}
        <SyncStatus saving={saving} />
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="ghost" size="smIcon" disabled aria-label="Preview">
                <DevicesIcon className="size-5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">Preview — coming soon</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="smIcon"
          active={settingsOpen}
          onClick={onToggleSettings}
          aria-label="Post settings"
          aria-expanded={settingsOpen}
        >
          <GearSixIcon className="size-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="smIcon" aria-label="More options">
              <DotsThreeVerticalIcon className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onDownloadMarkdown}>
              <DownloadSimpleIcon />
              <span>Download as Markdown</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
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
