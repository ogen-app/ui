import type { ReactNode } from 'react'
import { cn } from '@/lib'
import { campaignTypeInfo } from '@/lib/campaignTypeDictionary'
import type { CampaignType } from '@/types/campaigns'

/**
 * The campaign-type chooser, shared by the create dialog and campaign
 * settings so a campaign's type is picked the same way whenever it is picked.
 *
 * Every word on these cards comes from `campaignTypeDictionary` — the API
 * supplies which types exist, not what they are called.
 */

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

/**
 * One row of the chooser, and — with `asButton` off — the same card standing
 * in for a type that has already been decided.
 */
function TypeCardBody({ type }: { type: CampaignType }) {
  const { label, description, icon: Icon } = campaignTypeInfo(type.name)
  return (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-md transition-colors',
          'bg-secondary group-data-[selected=true]:bg-foreground group-data-[selected=true]:text-background',
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="text-base font-medium">{label}</span>
        {description && (
          <span className="text-sm text-secondary-foreground">{description}</span>
        )}
      </span>
    </>
  )
}

/**
 * The chooser: one card per type, stacked.
 *
 * Vertical rather than the row of five tiles it replaced, because each card
 * now carries the type's own explanation — five columns had nowhere to put a
 * sentence, which is how the description ended up in a `title` tooltip that
 * only a mouse could find (and only by hovering something with no sign it was
 * hoverable).
 */
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
      className={cn('grid grid-cols-1 gap-3', className)}
      role="radiogroup"
      aria-label="Campaign type"
    >
      {orderCampaignTypes(types).map((type) => {
        const selected = value === type.id
        return (
          <button
            key={type.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type.id)}
            disabled={disabled}
            data-selected={selected}
            className={cn(
              'group flex items-center gap-3 rounded-md border px-4 py-4 cursor-pointer transition-colors',
              'disabled:pointer-events-none disabled:opacity-50',
              selected
                ? 'border-foreground text-foreground'
                : 'border-quaternary text-primary-foreground hover:border-foreground',
            )}
          >
            <TypeCardBody type={type} />
          </button>
        )
      })}
    </div>
  )
}

/**
 * A campaign's type once it has one: the same card the chooser draws, minus
 * the choosing.
 *
 * It is a statement rather than a control because the type is not an ordinary
 * setting — it picks the phase plan every post is generated against, so
 * switching it half-way through a campaign is a decision the product intends
 * to restrict. `action` is where that lives: a Change button today, whatever
 * the restriction turns out to be later.
 */
export function CampaignTypeCard({
  type,
  action,
  className,
}: {
  type: CampaignType | null | undefined
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-md border border-quaternary px-4 py-4 min-w-0',
        className,
      )}
    >
      {type ? (
        <TypeCardBody type={type} />
      ) : (
        <span className="flex min-w-0 flex-col gap-0.5 text-left">
          <span className="text-base font-medium">No type set</span>
          <span className="text-sm text-secondary-foreground">
            Pick one so the campaign's content has a plan to follow.
          </span>
        </span>
      )}
      {action && <div className="ml-auto shrink-0 pl-3">{action}</div>}
    </div>
  )
}
