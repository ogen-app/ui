import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  FileMdIcon,
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
import { SaveStatus } from '@/components/page-primitives/SaveStatus'
import { TextSelect } from '@/components/ui/text-select'
import { cn } from '@/lib'
import type { LensControl } from './lensChoice'

type Props = {
  /** The campaign it was opened through, or null for the workspace's assets. */
  campaignId: string | null
  title: string
  saving: boolean
  /**
   * Which reading the cards under the bar show: the picker, or the line that
   * stands in for it when only the workspace has read the asset.
   */
  lens?: LensControl
  /** The original file, when there is one to hand back. */
  file?: { url: string; name: string } | null
  onRefreshSource?: () => void
  onDownloadMarkdown?: () => void
  onDelete: () => void
}

/**
 * The asset's own 48px bar over its content column — the post editor's
 * `PostBar`, for a document, level with the side column's tabs.
 *
 * On the left, ← back to the list it came from, the asset's title and whether
 * it is saving. On the right, the reading the cards below are showing — the
 * workspace's or a campaign's, a card dropdown since it changes what they
 * show — then a bordered ⋮ for the rest and, last, in the corner, the one move forward a document has: handing back its file. A
 * document saves as it is typed and has no status to move along, so there is
 * no black button here — a bar whose one button is a second way out would be
 * furniture.
 */
export function AssetBar({
  campaignId,
  title,
  saving,
  lens = null,
  file,
  onRefreshSource,
  onDownloadMarkdown,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  const text = title.trim()

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-primary pr-3 pl-4 lg:pr-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <BackToAssets campaignId={campaignId} />
        <span
          className={cn(
            'min-w-0 truncate text-sm font-medium',
            text ? 'text-primary-foreground' : 'text-tertiary-foreground',
          )}
          title={text || undefined}
        >
          {text || t('assetInsights.bar.untitled')}
        </span>
        <SaveStatus saving={saving} />
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {typeof lens === 'string' ? (
          <span className="truncate text-xs text-tertiary-foreground">
            {lens}
          </span>
        ) : (
          lens && (
            <TextSelect
              variant="button"
              size="sm"
              lead={lens.lead}
              ariaLabel={lens.label}
              value={lens.value}
              onValueChange={lens.onChange}
              elements={lens.options}
              className="min-w-0 max-w-80"
            />
          )
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="smIcon"
              className="size-8 border-border"
              aria-label={t('assetInsights.bar.more')}
            >
              <DotsThreeVerticalIcon weight="bold" className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRefreshSource && (
              <DropdownMenuItem onSelect={onRefreshSource}>
                <ArrowsClockwiseIcon />
                <span>{t('assetInsights.bar.readAgain')}</span>
              </DropdownMenuItem>
            )}
            {onDownloadMarkdown && (
              <DropdownMenuItem onSelect={onDownloadMarkdown}>
                <FileMdIcon />
                <span>{t('assetInsights.bar.downloadMarkdown')}</span>
              </DropdownMenuItem>
            )}
            {/* Delete is the one item always here, so the rule above it is
                only drawn when there is something to separate it from. */}
            {(onRefreshSource || onDownloadMarkdown) && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <TrashIcon />
              <span>{t('assetInsights.bar.delete')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {file && (
          <Button variant="outline" size="sm" className="h-8" asChild>
            <a href={file.url} download={file.name}>
              <DownloadSimpleIcon />
              <span>{t('assetInsights.meta.download')}</span>
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

/** ← to the assets list the page was opened from, the campaign's or all. */
function BackToAssets({ campaignId }: { campaignId: string | null }) {
  const { t } = useTranslation()
  const className =
    '-mr-2.5 flex h-9 w-[30px] shrink-0 items-center justify-center rounded-button text-tertiary-foreground outline-none transition-colors hover:bg-tertiary hover:text-primary-foreground focus-visible:inset-ring-2 focus-visible:inset-ring-ring'
  const label = t('assetInsights.bar.back')
  const icon = <ArrowLeftIcon className="size-3.5" />
  const link = campaignId ? (
    <Link
      to="/campaigns/$campaignId/assets"
      params={{ campaignId }}
      aria-label={label}
      className={className}
    >
      {icon}
    </Link>
  ) : (
    <Link to="/assets" aria-label={label} className={className}>
      {icon}
    </Link>
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
