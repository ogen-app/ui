import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { resolvePlatformInfo } from '@/lib/platformDictionary'
import { Picker } from './ComparisonBar'
import type { Period, PlatformOption } from './types'

/**
 * The bar that says what is being counted, and over what window.
 *
 * Two controls, one row, because they answer halves of the same question. The
 * platform marks decide *what is in the numbers at all*; the period decides
 * *how far back they reach*. Every figure below — the headline, the ranking,
 * the charts — is a total over the platforms left switched on, taken across the
 * window on the right. Splitting them onto two rows made the period read as
 * page furniture and the filter as the only real scope, and the pair is only
 * ever read together.
 *
 * Which is exactly why it can't be quiet. A filtered dashboard that looks
 * identical to an unfiltered one is how a screenshot of two platforms ends up
 * in a board pack as the quarter's reach — so the filter's state has to be
 * legible from across a desk, and it survives navigation rather than resetting
 * under someone mid-thought. The greyed marks carry that now; there is no
 * sentence restating them.
 *
 * Drawn as the platform marks used everywhere else in the app, each carrying
 * its connected-account count. No heading and no running total: a row of
 * platform logos does not need to be told it is a row of platforms, and a
 * "7 accounts" summary at the top is a number nobody filters by — the counts
 * that matter are the ones on the marks, because "Instagram" means something
 * different at one account than at four.
 *
 * The bar itself never withdraws. One connected platform takes the marks away —
 * every state of that filter shows either everything or nothing — but the
 * period stays, so the scope line keeps its place and its height instead of the
 * page changing shape depending on how much of the workspace is connected.
 */
export function PlatformFilter({
  platforms,
  selected,
  onChange,
  period,
  periods,
  onPeriodChange,
  className,
}: {
  platforms: PlatformOption[]
  /** Platform ids currently counted. */
  selected: string[]
  onChange: (selected: string[]) => void
  period: Period
  periods: Period[]
  onPeriodChange: (period: Period) => void
  className?: string
}) {
  const connected = platforms.filter((p) => p.accounts > 0)

  // Nothing to filter. One connected platform means every possible state of
  // this control shows the same numbers or none at all, and a control that can
  // only be used wrongly shouldn't be on the page.
  const filterable = connected.length > 1

  const on = connected.filter((p) => selected.includes(p.id))
  const all = on.length === connected.length

  const toggle = (id: string) =>
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    )

  return (
    <section
      className={cn(
        'flex w-full max-w-content mx-auto flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-primary px-5 py-4',
        className,
      )}
    >
      {filterable && (
        <div className="flex flex-wrap items-center gap-2">
          {platforms.map((platform) => (
            <PlatformMark
              key={platform.id}
              platform={platform}
              on={selected.includes(platform.id)}
              onToggle={() => toggle(platform.id)}
            />
          ))}

          {/*
            The way back, in one click — and it stands with the marks it acts
            on rather than across the bar from them. Switching four platforms on
            again one at a time to undo a single click is the kind of small cost
            that makes people leave a filter on, and a filter left on is a
            filtered screenshot read as the whole picture.

            It flips rather than sitting beside a twin: at "everything counted"
            the only useful move is to clear, and once anything is off the only
            useful move is to restore. Caps are the copy, not a class — same as
            the rest of the app's bare-verb controls.
          */}
          <Button
            variant="ghost"
            size="sm"
            className="ml-1"
            onClick={() => onChange(all ? [] : connected.map((p) => p.id))}
          >
            {all ? 'DESELECT ALL' : 'SELECT ALL'}
          </Button>
        </div>
      )}

      {/* Far right, on its own, because it is the one control here that changes
          the window rather than the sources. */}
      <div className="ml-auto">
        <Picker
          label="Period"
          value={period.label}
          options={periods.map((p) => ({ value: p.label, label: p.label }))}
          onChange={(v) => {
            const next = periods.find((p) => p.label === v)
            if (next) onPeriodChange(next)
          }}
        />
      </div>
    </section>
  )
}

function PlatformMark({
  platform,
  on,
  onToggle,
}: {
  platform: PlatformOption
  on: boolean
  onToggle: () => void
}) {
  const info = resolvePlatformInfo(platform.id)
  const Icon = info?.icon
  const connected = platform.accounts > 0

  const mark = Icon ? (
    <Icon
      className="size-6"
      weight="fill"
      // Brand hue only while it is being counted. A greyed logo is the fastest
      // way to say "not in these numbers" — it needs no legend and survives
      // being looked at from across a desk.
      style={{ color: on && connected ? info?.color : undefined }}
      aria-hidden
    />
  ) : (
    <span className="text-xs font-medium">{platform.label.slice(0, 2)}</span>
  )

  // A platform with nothing connected can't be counted, so it isn't a filter —
  // it's an empty seat. Rendering it as a switch that does nothing when pressed
  // would read as a broken control rather than as missing setup.
  if (!connected) {
    return (
      <span
        title={`${platform.label} — no account connected`}
        className="flex size-10 items-center justify-center rounded-md border border-dashed border-quinary text-quaternary-foreground"
      >
        {mark}
        <span className="sr-only">{platform.label}, no account connected</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={`${platform.label} — ${platform.accounts} ${platform.accounts === 1 ? 'account' : 'accounts'}`}
      className={cn(
        'relative flex size-10 items-center justify-center rounded-md transition-colors',
        on
          ? 'bg-secondary outline outline-1 outline-foreground'
          : 'border border-border text-quaternary-foreground hover:bg-secondary',
      )}
    >
      {mark}
      {/* The count rides the mark rather than sitting in a summary line: it is
          read at the same moment as the platform it qualifies. */}
      <span
        className={cn(
          'absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium tabular-nums ring-2 ring-primary',
          on ? 'bg-foreground text-primary' : 'bg-quaternary text-tertiary-foreground',
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
