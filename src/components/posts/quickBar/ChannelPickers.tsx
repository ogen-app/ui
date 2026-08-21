import { CaretDownIcon } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { PlatformInfo, PlatformPostType } from '@/lib/platformDictionary'
import { getPostTypeLabel } from '@/lib/platformDictionary'
import { cn } from '@/lib'
import { InfoRow, QuickBarTrigger, WarningHint } from './parts'

/**
 * Where this post goes, and as what.
 *
 * The two pickers sit in one file because they are one decision taken in two
 * steps: a post type is a property of a platform, so the second only exists
 * once the first is answered, and both are offered from the same narrowed
 * list — what the *campaign* enables, not what the platform can do. Neither
 * decides what it offers; the bar passes the lists in, having read the
 * campaign and the connected publishers once for both.
 */
export function PlatformPicker({
  platform,
  platforms,
  disabled,
  onSelect,
}: {
  /** The one currently on the post, or undefined while none is chosen. */
  platform: PlatformInfo | undefined
  /** What this campaign allows — already filtered by the caller. */
  platforms: PlatformInfo[]
  disabled?: boolean
  onSelect: (platformId: string) => void
}) {
  return (
    <DropdownMenu>
      <QuickBarTrigger label="Change platform" disabled={disabled}>
        {platform ? (
          <>
            <platform.icon size={16} weight="fill" color={platform.color} />
            <span>{platform.name}</span>
          </>
        ) : (
          <>
            <WarningHint text="Pick the platform this post publishes to — it decides the available post types and the publishing account." />
            <span>Select platform</span>
          </>
        )}
        <CaretDownIcon className="size-3 text-tertiary-foreground" />
      </QuickBarTrigger>
      <DropdownMenuContent align="start">
        {platforms.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => onSelect(p.id)}>
            <p.icon size={16} weight="fill" color={p.color} />
            <span className={cn(p.id === platform?.id && 'font-medium')}>{p.name}</span>
          </DropdownMenuItem>
        ))}
        {platforms.length === 0 && <InfoRow>No platforms on this campaign</InfoRow>}
        {platform && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSelect('')}>
              <span>Deselect platform</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PostTypePicker({
  platform,
  selected,
  types,
  connectedSlugs,
  disabled,
  onSelect,
}: {
  /** Always set — the bar hides this picker entirely until a platform is. */
  platform: PlatformInfo
  /** The slug on the post, or '' while none is chosen. */
  selected: string
  /** What this campaign enables for the platform. */
  types: PlatformPostType[]
  /** The subset a *connected* publisher supports; the rest are flagged. */
  connectedSlugs: ReadonlySet<string>
  disabled?: boolean
  onSelect: (slug: string) => void
}) {
  return (
    <DropdownMenu>
      <QuickBarTrigger label="Change post type" disabled={disabled}>
        {selected ? (
          <span>{getPostTypeLabel(platform.id, selected)}</span>
        ) : (
          <>
            <WarningHint
              text={`Pick the ${platform.name} post type — it sets the format this post publishes as.`}
            />
            <span>Select post type</span>
          </>
        )}
        <CaretDownIcon className="size-3 text-tertiary-foreground" />
      </QuickBarTrigger>
      <DropdownMenuContent align="start">
        {types.map((t) => (
          <DropdownMenuItem key={t.slug} onSelect={() => onSelect(t.slug)}>
            <span className={cn(t.slug === selected && 'font-medium')}>{t.label}</span>
            {/* Still offered: a campaign may plan for a type before the
                account that publishes it is connected. The note is what keeps
                that from looking like a working choice. */}
            {!connectedSlugs.has(t.slug) && (
              <span className="ml-auto pl-4 text-xs text-tertiary-foreground">
                Not connected
              </span>
            )}
          </DropdownMenuItem>
        ))}
        {types.length === 0 && <InfoRow>No post types on this campaign</InfoRow>}
        {selected && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSelect('')}>
              <span>Deselect post type</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
