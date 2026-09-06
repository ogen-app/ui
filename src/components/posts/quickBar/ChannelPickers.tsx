import { CaretDownIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
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
 *
 * Both take `readOnly` for a submitted post (CON-251), and both answer it by
 * rendering **plain text rather than a disabled trigger** — the same shape
 * `AccountSlot` has always used for the same situation. A greyed-out dropdown
 * with a caret still on it reads as a control that is broken; the channel a
 * published post went out on is not a control at all, it is a fact.
 */
export function PlatformPicker({
  platform,
  platforms,
  disabled,
  readOnly,
  onSelect,
}: {
  /** The one currently on the post, or undefined while none is chosen. */
  platform: PlatformInfo | undefined
  /** What this campaign allows — already filtered by the caller. */
  platforms: PlatformInfo[]
  disabled?: boolean
  /** The post is submitted: show what it went out as, offer nothing. */
  readOnly?: boolean
  onSelect: (platformId: string) => void
}) {
  const { t } = useTranslation()

  if (readOnly) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        {platform ? (
          <>
            <platform.icon size={16} weight="fill" color={platform.color} />
            <span className="truncate">{platform.name}</span>
          </>
        ) : (
          // No warning glyph: on a locked post there is nothing to fix, so the
          // absence is reported the way the calendar card reports it.
          <span className="truncate text-tertiary-foreground">
            {t('posts.noPlatform')}
          </span>
        )}
      </span>
    )
  }

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
            <span className={cn(p.id === platform?.id && 'font-medium')}>
              {p.name}
            </span>
          </DropdownMenuItem>
        ))}
        {platforms.length === 0 && (
          <InfoRow>No platforms on this campaign</InfoRow>
        )}
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

/**
 * What the trigger says while the post is deciding for itself.
 *
 * Two things at once, and both are load-bearing: *Auto* is the state the picker
 * is in, and the format beside it is what the post would publish as right now.
 * Showing only the first leaves the author unable to see what Auto decided
 * without opening the menu; showing only the second is indistinguishable from
 * a type somebody chose, which is exactly the difference the picker exists to
 * report.
 */
function AutoLabel({
  platform,
  resolved,
}: {
  platform: PlatformInfo
  /** The slug Auto landed on, or '' while it is pending or nothing fits. */
  resolved: string
}) {
  const { t } = useTranslation()
  return (
    <span className="truncate">
      {resolved
        ? t('posts.postType.autoResolved', {
            type: getPostTypeLabel(platform.id, resolved),
          })
        : t('posts.postType.auto')}
    </span>
  )
}

export function PostTypePicker({
  platform,
  selected,
  types,
  connectedSlugs,
  auto,
  clearable,
  resolved,
  disabled,
  readOnly,
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
  /**
   * Auto is available, so the empty slug means "the post decides" rather than
   * "nobody has chosen". With this false the picker is what it always was: an
   * unset type is a gap, and the trigger warns about it.
   *
   * Implies `clearable`: offering Auto is offering the empty slug.
   */
  auto?: boolean
  /**
   * The empty slug may be written at all. False once the post has left `draft`,
   * where the server requires a concrete type on every PUT — so neither Auto
   * nor the deselect row is offered there, and a post cannot be talked back
   * into having no format at a point where saving it would fail.
   */
  clearable?: boolean
  /** What Auto resolved to; only read when `auto` and nothing is `selected`. */
  resolved?: string
  disabled?: boolean
  /** The post is submitted: show what it went out as, offer nothing. */
  readOnly?: boolean
  onSelect: (slug: string) => void
}) {
  const { t } = useTranslation()
  // Auto never renders read-only, and doesn't have to: leaving `draft` writes
  // the resolution down, so every post the read-only branch ever sees has a
  // slug of its own.
  const automatic = !!auto && !selected

  if (readOnly) {
    return (
      <span className="truncate">
        {selected ? (
          getPostTypeLabel(platform.id, selected)
        ) : (
          <span className="text-tertiary-foreground">
            {t('posts.noPostType')}
          </span>
        )}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <QuickBarTrigger label="Change post type" disabled={disabled}>
        {automatic ? (
          <AutoLabel platform={platform} resolved={resolved ?? ''} />
        ) : selected ? (
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
        {auto && (
          <>
            <DropdownMenuItem onSelect={() => onSelect('')}>
              <span className={cn(automatic && 'font-medium')}>
                {t('posts.postType.auto')}
              </span>
              <span className="ml-auto pl-4 text-xs text-tertiary-foreground">
                {t('posts.postType.autoHint')}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {types.map((t) => (
          <DropdownMenuItem key={t.slug} onSelect={() => onSelect(t.slug)}>
            <span className={cn(t.slug === selected && 'font-medium')}>
              {t.label}
            </span>
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
        {types.length === 0 && (
          <InfoRow>No post types on this campaign</InfoRow>
        )}
        {/* With Auto offered above, the empty slug is already reachable as a
            choice — a second row meaning the same thing would read as two
            different ones. Gone entirely once the post has left `draft`: the
            save that followed could only fail. */}
        {selected && !auto && clearable && (
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
