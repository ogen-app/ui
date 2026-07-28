import {
  BookmarkSimpleIcon,
  ChatCircleIcon,
  EyeIcon,
  GaugeIcon,
  InfinityIcon,
  TargetIcon,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib'
import type { CampaignType } from '@/types/campaigns'

/**
 * The campaign-type chooser, shared by the create dialog and campaign
 * settings so a campaign's type is picked the same way whenever it is picked.
 */

const TYPE_ICON: Record<string, PhosphorIcon> = {
  evergreen: InfinityIcon,
  awareness: EyeIcon,
  engagement: ChatCircleIcon,
  conversion: TargetIcon,
  retention: BookmarkSimpleIcon,
}

export function campaignTypeIcon(name: string): PhosphorIcon {
  return TYPE_ICON[name.toLowerCase()] ?? GaugeIcon
}

/** The type a campaign gets unless the user picks otherwise. */
export const DEFAULT_CAMPAIGN_TYPE = 'evergreen'

/**
 * Evergreen first, then the API's own order. It is the default, and a default
 * that isn't the first thing you see isn't really presented as one — the API
 * sorts alphabetically, which buries it fourth.
 */
export function orderCampaignTypes(types: CampaignType[]): CampaignType[] {
  return [...types].sort((a, b) => {
    const ae = a.name.toLowerCase() === DEFAULT_CAMPAIGN_TYPE ? 0 : 1
    const be = b.name.toLowerCase() === DEFAULT_CAMPAIGN_TYPE ? 0 : 1
    return ae - be
  })
}

/** The id to preselect: evergreen when the API offers it, else the first type. */
export function defaultCampaignTypeId(types: CampaignType[]): string | null {
  const ordered = orderCampaignTypes(types)
  return ordered[0]?.id ?? null
}

export function CampaignTypePicker({
  types,
  value,
  onChange,
  disabled = false,
  className,
}: {
  types: CampaignType[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div
      className={cn('grid grid-cols-2 sm:grid-cols-5 gap-2', className)}
      role="radiogroup"
      aria-label="Campaign type"
    >
      {orderCampaignTypes(types).map((type) => {
        const selected = value === type.id
        const Icon = campaignTypeIcon(type.name)
        return (
          <button
            key={type.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type.id)}
            disabled={disabled}
            title={type.description || undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-md border px-3 py-4 cursor-pointer transition-colors',
              'disabled:pointer-events-none disabled:opacity-50',
              selected
                ? 'border-foreground text-foreground'
                : 'border-quaternary text-secondary-foreground hover:border-foreground hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center rounded-md size-8 transition-colors',
                selected ? 'bg-foreground text-background' : 'bg-transparent',
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-center">
              {type.label || type.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
