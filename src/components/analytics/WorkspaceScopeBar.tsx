import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { resolvePlatformInfo } from '@/lib/platformDictionary'
import { Picker } from './ComparisonBar'
import type { PlatformOption } from './types'

/**
 * What the dashboard is counting, and over what window.
 *
 * The controls live here rather than in the page header. The corner is for
 * things that govern the page (CON-178), and neither of these does: the period
 * does not reach the lessons card, and the platform reaches only the board. A
 * control in the corner claims a reach it has not got, and the fix is not a
 * smaller claim in the corner but a bar the cards can answer back to — which is
 * what the scope notes under their headings now do.
 *
 * **One platform at a time, deliberately.** `GET /analytics/performers` takes a
 * single `platform`, and neither `/overview` nor `/learnings` takes one at all.
 * A multi-select would have to send "two of my four" as *all four* and let the
 * page look filtered while it wasn't — the failure the campaign surface's
 * filter is written to avoid, inverted. Until the API can narrow by more than
 * one, this control offers exactly what the server can answer: everything, or
 * one platform.
 *
 * The marks are the app's own platform logos, greyed when they are not the one
 * being counted, because the filter's state has to be legible from across a
 * desk — a screenshot of one platform's numbers read as the workspace's is the
 * thing this bar exists to prevent.
 */
export function WorkspaceScopeBar({
  platforms,
  platform,
  onPlatformChange,
  window,
  windows,
  onWindowChange,
  className,
}: {
  platforms: PlatformOption[]
  /**
   * The platform being counted, or `undefined` for every one of them. Our
   * platform id, not the wire slug — the caller maps it on the way to the
   * request, because the two differ (`x` here is `twitter` there).
   */
  platform?: string
  onPlatformChange: (platform: string | undefined) => void
  window: string
  windows: readonly { readonly window: string; readonly label: string }[]
  onWindowChange: (window: string) => void
  className?: string
}) {
  const connected = platforms.filter((p) => p.accounts > 0)

  // Nothing to filter. One connected platform means every state of this control
  // shows the same numbers, and a control that can only be used pointlessly
  // should not be on the page. The period stays either way, so the bar keeps
  // its place and its height however much of the workspace is connected.
  const filterable = connected.length > 1
  const current = windows.find((w) => w.window === window) ?? windows[0]

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
              on={platform === undefined || platform === option.id}
              onSelect={() =>
                // Pressing the one already chosen is the way back to everything.
                // Without it the only route out of a filter is to guess that
                // some other control clears it.
                onPlatformChange(platform === option.id ? undefined : option.id)
              }
            />
          ))}

          {platform !== undefined && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1"
              onClick={() => onPlatformChange(undefined)}
            >
              ALL PLATFORMS
            </Button>
          )}
        </div>
      )}

      {/* Far right, on its own, because it is the one control here that changes
          the window rather than the sources. */}
      <div className="ml-auto">
        <Picker
          label="Period"
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
  const info = resolvePlatformInfo(platform.id)
  const Icon = info?.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={on}
      title={`${platform.label} — ${platform.accounts} ${platform.accounts === 1 ? 'account' : 'accounts'}`}
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
        {platform.label}, {platform.accounts}{' '}
        {platform.accounts === 1 ? 'account' : 'accounts'}
      </span>
    </button>
  )
}
