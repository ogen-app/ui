import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { Picker } from './ComparisonBar'
import type { PlatformOption } from './types'
import { usePlatformCatalog } from '@/hooks/usePlatforms'

/**
 * What the dashboard is counting, and over what window.
 *
 * The controls live here rather than in the page header. The corner is for
 * things that govern the page (CON-178), and the period does not: it does not
 * reach the lessons card, which says so under its heading. The platforms do
 * reach all three cards since CON-289, but they sit with the period because the
 * pair is only ever read together — what is in the numbers, and how far back.
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
  className?: string
}) {
  const { t } = useTranslation()
  const connected = platforms.filter((p) => p.accounts > 0)

  // Nothing to filter. One connected platform means every state of this control
  // shows the same numbers, and a control that can only be used pointlessly
  // should not be on the page. The period stays either way, so the bar keeps
  // its place and its height however much of the workspace is connected.
  const filterable = connected.length > 1
  const current = windows.find((w) => w.window === window) ?? windows[0]

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
    onSelectedChange(next.length === connected.length ? [] : next)
  }

  return (
    <section
      className={cn(
        'flex w-full max-w-content mx-auto flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-primary px-5 py-4',
        className,
      )}
    >
      {filterable && (
        <div className="flex flex-wrap items-center gap-2">
          {connected.map((option) => (
            <PlatformMark
              key={option.id}
              platform={option}
              on={!narrowed || chosen.includes(option.id)}
              onSelect={() => toggle(option.id)}
            />
          ))}

          {/* The way back in one click, whatever was chosen. Switching marks off
              one at a time to undo a filter is the small cost that makes people
              leave one on. */}
          {narrowed && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1"
              onClick={() => onSelectedChange([])}
            >
              {t('analytics.scopeBar.allPlatforms')}
            </Button>
          )}
        </div>
      )}

      {/* Far right, on its own, because it is the one control here that changes
          the window rather than the sources. */}
      <div className="ml-auto">
        <Picker
          label={t('analytics.scopeBar.period')}
          value={current.label}
          options={windows.map((w) => ({ value: w.window, label: w.label }))}
          onChange={onWindowChange}
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
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const info = usePlatformCatalog().resolve(platform.id)
  const Icon = info?.icon
  const accounts = t('analytics.scopeBar.accounts', {
    count: platform.accounts,
  })

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={on}
      title={t('analytics.scopeBar.platformAccounts', {
        platform: platform.label,
        accounts,
      })}
      className={cn(
        'relative flex size-10 items-center justify-center rounded-md transition-colors',
        on
          ? 'bg-secondary outline outline-1 outline-foreground'
          : 'border border-border text-quaternary-foreground hover:bg-secondary',
      )}
    >
      {Icon ? (
        <Icon
          className="size-6"
          weight="fill"
          // Brand hue only while it is being counted. A greyed logo is the
          // fastest way to say "not in these numbers" — it needs no legend.
          style={{ color: on ? info?.color : undefined }}
          aria-hidden
        />
      ) : (
        <span className="text-xs font-medium">
          {platform.label.slice(0, 2)}
        </span>
      )}

      {/* The count rides the mark rather than sitting in a summary line: it is
          read at the same moment as the platform it qualifies. */}
      <span
        className={cn(
          'absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium tabular-nums ring-2 ring-primary',
          on
            ? 'bg-foreground text-primary'
            : 'bg-quaternary text-tertiary-foreground',
        )}
      >
        {platform.accounts}
      </span>
      <span className="sr-only">
        {t('analytics.scopeBar.platformAccountsLabel', {
          platform: platform.label,
          accounts,
        })}
      </span>
    </button>
  )
}
