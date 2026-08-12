import type { ReactNode } from 'react'
import { cn } from '@/lib'
import type { Confidence } from './types'

/**
 * The furniture the analytics sections sit in.
 *
 * `SectionCard` carries one thing the campaign Overview's card does not: a
 * **scope note** saying whether the section obeys the date lens at the top of
 * the page. That distinction is the whole reason these surfaces aren't called
 * Performance — "your posts land on Tuesday evenings" is not a fact about the
 * last 28 days, and a section that silently sits under a window control claims
 * it is.
 */
export type SectionScope = 'lens' | 'all-time' | 'ahead'

const SCOPE_NOTE: Record<SectionScope, string | null> = {
  lens: null,
  'all-time': 'All time — not affected by the period above',
  ahead: 'Looking ahead — not affected by the period above',
}

export function SectionCard({
  title,
  scope = 'lens',
  status,
  children,
  className,
}: {
  title: string
  scope?: SectionScope
  status?: ReactNode
  children: ReactNode
  className?: string
}) {
  const note = SCOPE_NOTE[scope]
  return (
    <section
      className={cn(
        'flex w-full max-w-content mx-auto flex-col gap-3 rounded-lg bg-primary p-5',
        className,
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-lg font-medium leading-6">{title}</h2>
          {note && <p className="text-xs text-tertiary-foreground">{note}</p>}
        </div>
        {status}
      </header>
      {children}
    </section>
  )
}

/**
 * The shape of every card on these surfaces, in the order the question
 * arrives:
 *
 * 1. **Key figures** — one or more, selectable when there is more than one.
 * 2. **The detail behind the selected figure** — its trend, or its breakdown.
 * 3. **What we make of it**, and anything to do about it.
 * 4. **Notes** — provenance, coverage, caveats — last, where the people who
 *    don't need them can skip them and the people who do can still screenshot
 *    them.
 *
 * Selection is what lets one card carry five figures without becoming five
 * cards: the figures stay comparable at a glance, and the expensive space
 * underneath belongs to whichever one is being asked about.
 */
export function FigureGrid({
  children,
  min = '8rem',
}: {
  children: ReactNode
  /** Narrowest a tile may get before the row wraps. */
  min?: string
}) {
  return (
    <div
      className="grid gap-2"
      // Auto-fit rather than a breakpoint ladder: the number of figures differs
      // by scope, and a fixed column count leaves a hole beside the odd one out.
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))` }}
    >
      {children}
    </div>
  )
}

/**
 * One key figure. A button when the card has something to show for it, a plain
 * tile when it doesn't — nothing on this page should look pressable and then
 * do nothing.
 */
export function FigureTile({
  selected = false,
  onSelect,
  className,
  children,
}: {
  selected?: boolean
  onSelect?: () => void
  className?: string
  children: ReactNode
}) {
  const shared = cn(
    'flex min-w-0 flex-col gap-1.5 rounded-md bg-secondary px-4 py-3 text-left',
    onSelect && 'cursor-pointer transition-colors hover:bg-tertiary',
    selected && 'outline outline-1 outline-foreground',
    className,
  )

  if (!onSelect) return <div className={shared}>{children}</div>

  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={shared}>
      {children}
    </button>
  )
}

/**
 * The things left to do about what the card just said.
 *
 * Kept distinct from an insight on purpose: an insight is a finding, a to-do is
 * an unfinished setup step the reader owns. Mixing them makes the findings look
 * like chores and the chores look optional.
 */
export function Todos({
  items,
}: {
  items: { id: string; text: string; action: string }[]
}) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0"
        >
          <span className="text-sm">{item.text}</span>
          <button
            type="button"
            className="shrink-0 text-xs font-medium underline underline-offset-2"
          >
            {item.action}
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Where a claim comes from. Always rendered next to a claim strong enough to
 * act on — someone will screenshot this into a client deck, and the sample
 * size needs to travel with it.
 *
 * Tertiary, not quaternary: this is supporting text, but it is text people are
 * expected to read before they act. Quaternary is for the parts nobody has to
 * read at all — axis ends, legends, the units under a bar.
 */
export function Basis({
  children,
  confidence,
  className,
}: {
  children: ReactNode
  confidence?: Confidence
  className?: string
}) {
  return (
    <p className={cn('text-xs text-tertiary-foreground', className)}>
      {confidence && (
        <span
          className={cn(
            'mr-1.5 inline-block align-middle size-1.5 rounded-full',
            confidence === 'high'
              ? 'bg-positive'
              : confidence === 'medium'
                ? 'bg-warning'
                : 'bg-quinary-foreground',
          )}
          aria-hidden
        />
      )}
      {children}
    </p>
  )
}

/**
 * What a section says when the data can't carry it yet.
 *
 * Deliberately not an empty chart, and never zeroes: a best-time grid drawn
 * from nine posts looks identical to one drawn from nine hundred, and someone
 * will act on it.
 */
export function NotYet({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-secondary px-4 py-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-secondary-foreground">{children}</p>
    </div>
  )
}
