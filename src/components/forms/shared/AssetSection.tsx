import { type Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Collapse } from '@/components/ui/collapse'
import { Skeleton } from '@/components/ui/skeleton'
import type { Asset } from '@/types/content'
import { formatTitle } from '@/lib'

type AssetSectionProps = {
  title: string
  assets: Asset[]
  emptyLabel: string
  actionIcon: PhosphorIcon
  actionAriaLabel: (a: Asset) => string
  onAction: (a: Asset) => void
  defaultOpen?: boolean
  /**
   * The bank hasn't been read yet, so `assets` is empty for want of an
   * answer rather than because there is none. The count and the empty label
   * are both claims, and neither is available yet.
   */
  loading?: boolean
}

/**
 * A collapsible list of content-bank assets with a per-row action button.
 * Shared by the campaign- and post-level content usage panels.
 */
export function AssetSection({
  title,
  assets,
  emptyLabel,
  actionIcon,
  actionAriaLabel,
  onAction,
  defaultOpen = false,
  loading = false,
}: AssetSectionProps) {
  return (
    <Collapse title={title} meta={loading ? undefined : assets.length} defaultOpen={defaultOpen}>
      {loading ? (
        <div className="flex flex-col gap-2 py-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex items-center min-h-[52px] py-2">
          <span className="text-[14px] leading-4 text-tertiary-foreground">{emptyLabel}</span>
        </div>
      ) : (
        assets.map((a) => (
          <AssetRow
            key={a.id}
            asset={a}
            actionIcon={actionIcon}
            actionAriaLabel={actionAriaLabel(a)}
            onAction={() => onAction(a)}
          />
        ))
      )}
    </Collapse>
  )
}

type AssetRowProps = {
  asset: Asset
  actionIcon: PhosphorIcon
  actionAriaLabel: string
  onAction: () => void
}

function AssetRow({ asset, actionIcon: ActionIcon, actionAriaLabel, onAction }: AssetRowProps) {
  const title = formatTitle(asset.title)
  const type = asset.tags?.[0]?.name ?? 'Asset'
  return (
    <div className="flex items-center gap-3 min-h-[52px] py-2">
      <div className="min-w-0 flex-1 flex flex-col">
        <span className="text-[13px] text-foreground truncate">{title}</span>
        <span className="text-xs text-tertiary-foreground truncate">{type}</span>
      </div>
      <button
        type="button"
        onClick={onAction}
        aria-label={actionAriaLabel}
        className="flex items-center justify-center size-6 shrink-0 text-secondary-foreground hover:text-foreground cursor-pointer"
      >
        <ActionIcon className="size-4" />
      </button>
    </div>
  )
}
