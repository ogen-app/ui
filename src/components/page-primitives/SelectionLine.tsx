import type { ReactNode } from 'react'

/**
 * A list's head while something is ticked — the mail-client pattern, in the
 * line the filter stood in, so the list under it never moves: how many, then
 * one quiet word after it, then what can be done to them (`children`, ghost
 * `sm` buttons) at the line's end.
 *
 * The word after the count is the caller's choice of three, at most one at a
 * time: the way out (`clear`), the named step that widens a ticked page to
 * every match (`widen`), or how many are ticked out of sight (`note`).
 *
 * Every list that ticks draws this — Ideas, Assets, a campaign's posts, the
 * facts ledger — and none floats a bar over its foot: the head is where the
 * selection is counted, and it stays in reach however far the list scrolls.
 */
export function SelectionLine({
  status,
  clear,
  widen,
  note,
  children,
}: {
  status: string
  clear?: { label: string; onClick: () => void; disabled?: boolean }
  widen?: { label: string; onClick: () => void; disabled?: boolean }
  note?: string
  children: ReactNode
}) {
  return (
    // One pill's height, like the line it stands in for; the actions' 32px
    // buttons lean 2px past it either side rather than heighten the line.
    <div className="flex h-7 min-w-0 flex-1 items-center gap-3">
      <span
        role="status"
        aria-live="polite"
        className="shrink-0 text-sm/5 font-medium whitespace-nowrap tabular-nums"
      >
        {status}
      </span>
      {clear ? (
        <button
          type="button"
          onClick={clear.onClick}
          disabled={clear.disabled}
          className="cursor-pointer truncate text-sm/5 text-secondary-foreground outline-none hover:text-foreground hover:underline focus-visible:underline disabled:opacity-60"
        >
          {clear.label}
        </button>
      ) : widen ? (
        <button
          type="button"
          onClick={widen.onClick}
          disabled={widen.disabled}
          className="cursor-pointer truncate text-sm/5 font-medium text-accent outline-none hover:underline focus-visible:underline disabled:opacity-60"
        >
          {widen.label}
        </button>
      ) : (
        note && (
          <span className="truncate text-sm/5 text-secondary-foreground">
            {note}
          </span>
        )
      )}
      <div className="-my-0.5 ml-auto flex shrink-0 items-center gap-1">
        {children}
      </div>
    </div>
  )
}
