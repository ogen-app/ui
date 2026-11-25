import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { Picker } from './ComparisonBar'
import type { PlatformOption } from './types'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { formatDate, formatList } from '@/lib/intl'
import { useAnalyticsHighlightStore } from '@/stores/analyticsHighlightStore'
import { ToggleTile, toggleTileVariants } from '@/components/ui/toggle-tile'

/** The picker's value for a range the address names. */
const CUSTOM = 'custom'

/**
 * What the dashboard is counting, and over what window — the page header's
 * actions, compact enough to share its 40px row with the title.
 *
 * No campaign picker: the campaign is the switcher's, in the bar above, and a
 * campaign's Analytics is its own address (`/campaigns/:id/analytics`).
 *
 * They are views, which is what the top-right corner is for (CON-178). The
 * period does not reach the lessons card, and that card says so under its
 * heading; that note is what makes it safe to put the period up here. The
 * platforms reach all three cards since CON-289, and sit with the period
 * because the pair is only ever read together — what is in the numbers, and
 * how far back.
 *
 * **Several platforms at once, and nothing chosen means all of them.** The
 * empty selection is sent as no `platform` at all, which the server reads as
 * every platform — including one connected tomorrow. So a selection that grows
 * to cover every connected platform collapses back to empty rather than being
 * sent as the full list, and "all" is one state, not two that look alike.
 *
 * From everything, a click narrows *to* that platform rather than switching it
 * off: the question this bar is for is "how do LinkedIn and Instagram compare",
 * which is two clicks this way and three-of-five switched off the other way.
 * After that each mark toggles, and switching off the last one is the way back
 * to everything.
 *
 * The marks are the app's own platform logos, greyed when they are not being
 * counted, because the filter's state has to be legible from across a desk — a
 * screenshot of one platform's numbers read as the workspace's is the thing
 * this bar exists to prevent.
 */
export function WorkspaceScopeBar({
  platforms,
  selected,
  onSelectedChange,
  window,
  windows,
  onWindowChange,
  range,
  className,
}: {
  platforms: PlatformOption[]
  /**
   * The platforms being counted, as Zernio slugs — empty for every one of
   * them. Never every slug spelled out: see above.
   */
  selected: readonly string[]
  onSelectedChange: (selected: string[]) => void
  window: string
  windows: readonly { readonly window: string; readonly label: string }[]
  onWindowChange: (window: string) => void
  /**
   * Days the address names instead of a span — set by the assistant
   * (CON-463) or a link. Shown as the period until a span is picked.
   */
  range?: { from: string; to: string }
  className?: string
}) {
  const { t, i18n } = useTranslation()
  // What the assistant just changed (CON-479), tinted until the user's next
  // touch: the rail says it changed the window, and this says where.
  const changed = useAnalyticsHighlightStore((s) => s.changed)
  const clearHighlight = useAnalyticsHighlightStore((s) => s.clear)
  const connected = platforms.filter((p) => p.accounts > 0)

  // Nothing to filter with one connected platform: every state of the control
  // shows the same numbers. Its mark still shows, as a mark rather than a
  // button, because which networks are in the numbers is worth seeing even
  // when there is no choice about it.
  const filterable = connected.length > 1
  const current = windows.find((w) => w.window === window) ?? windows[0]
  const periods = windows.map((w) => ({ value: w.window, label: w.label }))
  const day = (iso: string) =>
    formatDate(
      iso,
      { day: 'numeric', month: 'short', timeZone: 'UTC' },
      i18n.language,
    ) ?? iso
  const custom = range
    ? t('analytics.scopeBar.range', {
        from: day(range.from),
        to: day(range.to),
      })
    : undefined
  if (custom) periods.unshift({ value: CUSTOM, label: custom })

  // Only what can be pressed counts as chosen. A platform that lost its last
  // account while chosen has no mark left to switch it off with.
  const chosen = selected.filter((id) => connected.some((p) => p.id === id))
  const narrowed = chosen.length > 0

  const toggle = (id: string) => {
    const next = !narrowed
      ? [id]
      : chosen.includes(id)
        ? chosen.filter((c) => c !== id)
        : [...chosen, id]
    clearHighlight()
    onSelectedChange(next.length === connected.length ? [] : next)
  }
  const changedNames = (['platforms', 'period'] as const)
    .filter((c) => changed.has(c))
    .map((c) => t(`analytics.scopeBar.control.${c}`))

  return (
    <section className={cn('flex min-w-0 items-center gap-3', className)}>
      {/* Read out once when the assistant moves the bar, silent otherwise. */}
      <p className="sr-only" aria-live="polite">
        {changedNames.length > 0
          ? t('analytics.scopeBar.assistantChanged', {
              controls: formatList(changedNames),
            })
          : ''}
      </p>
      {connected.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md transition-colors',
            changed.has('platforms') &&
              'bg-accent/5 outline outline-1 outline-accent outline-offset-2',
          )}
        >
          {connected.map((option) => (
            <PlatformMark
              key={option.id}
              platform={option}
              on={!narrowed || chosen.includes(option.id)}
              onSelect={filterable ? () => toggle(option.id) : undefined}
            />
          ))}

          {/* The way back in one click, whatever was chosen. Switching marks off
              one at a time to undo a filter is the small cost that makes people
              leave one on. */}
          {narrowed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearHighlight()
                onSelectedChange([])
              }}
            >
              {t('analytics.scopeBar.allPlatforms')}
            </Button>
          )}
        </div>
      )}

      {/* Last, because it is the one control here that changes the window
          rather than the sources. */}
      <div className="flex items-center gap-2">
        <Picker
          label={t('analytics.scopeBar.period')}
          value={custom ?? current.label}
          options={periods}
          highlighted={changed.has('period')}
          onChange={(value) => {
            clearHighlight()
            if (value !== CUSTOM) onWindowChange(value)
          }}
        />
      </div>
    </section>
  )
}

function PlatformMark({
  platform,
  on,
  onSelect,
}: {
  platform: PlatformOption
  /** Whether this platform is in the numbers — true for all of them by default. */
  on: boolean
  /** Absent when it is the only one connected: a mark, not a toggle. */
  onSelect?: () => void
}) {
  const { t } = useTranslation()
  const info = usePlatformCatalog().resolve(platform.id)
  const Icon = info?.icon
  const accounts = t('analytics.scopeBar.accounts', {
    count: platform.accounts,
  })

  const title = t('analytics.scopeBar.platformAccounts', {
    platform: platform.label,
    accounts,
  })
  // As tall as the period picker beside it (`Picker`), so the two read as
  // one row of controls. The count rides inside, as a button's label would.
  const body = (
    <>
      {Icon ? (
        <Icon
          className="size-4"
          weight="fill"
          // Brand hue only while it is being counted. A greyed logo is the
          // fastest way to say "not in these numbers" — it needs no legend.
          style={{ color: on ? info?.color : undefined }}
          aria-hidden
        />
      ) : (
        <span>{platform.label.slice(0, 2)}</span>
      )}
      {/* The count is read at the same moment as the platform it qualifies. */}
      <span aria-hidden>{platform.accounts}</span>
      <span className="sr-only">
        {t('analytics.scopeBar.platformAccountsLabel', {
          platform: platform.label,
          accounts,
        })}
      </span>
    </>
  )

  return onSelect ? (
    <ToggleTile size="sm" on={on} onToggle={onSelect} title={title}>
      {body}
    </ToggleTile>
  ) : (
    // The only network connected: in the numbers, with nothing to press.
    <span
      title={title}
      className={cn(
        toggleTileVariants({ size: 'sm', on: true }),
        'cursor-default hover:bg-tertiary',
      )}
    >
      {body}
    </span>
  )
}
