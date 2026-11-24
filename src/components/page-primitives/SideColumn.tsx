import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { RailPanelEmbeddedProvider } from '@/components/page-primitives/RailPanel'
import { cn } from '@/lib'
import { SmallHeading } from './SmallHeading'

/**
 * One tab of a side column: its icon, its one-word name, and how many things
 * on it should be looked at while it is closed (the warning dot).
 */
export type SideTab<Id extends string> = {
  id: Id
  label: string
  icon: Icon
  /** The accessible name when it carries warnings, e.g. "Checks, 2 warnings". */
  warnLabel?: string
  warn?: number
}

/**
 * The strip of tabs over one tab's body, beside an editor's main column — the
 * post editor's first, then the asset page's.
 *
 * Everything about the thing that is not the thing itself lives here, so the
 * right rail is left to the assistant. Only the tab on show is mounted: the
 * caller passes its body as `children`.
 *
 * The tabs keep one size whatever their number — the post editor's seven
 * across the column — so a screen with three has three of the same buttons
 * at the start of the strip, not three wide ones.
 */
export function SideColumn<Id extends string>({
  tabs,
  current,
  onSelect,
  label,
  idPrefix,
  children,
}: {
  tabs: readonly SideTab<Id>[]
  current: Id
  onSelect: (id: Id) => void
  /** The tab list's accessible name. */
  label: string
  /** Prefixes the tab and panel ids, so two columns never share one. */
  idPrefix: string
  children: ReactNode
}) {
  return (
    <aside className="flex w-[24rem] shrink-0 flex-col border-l border-border bg-primary xl:w-[27rem]">
      <div
        role="tablist"
        aria-label={label}
        className="grid h-12 shrink-0 items-center gap-0.5 border-b border-border px-2"
        style={{
          gridTemplateColumns: `repeat(${Math.max(tabs.length, 7)}, minmax(0, 1fr))`,
        }}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            idPrefix={idPrefix}
            selected={tab.id === current}
            onSelect={() => onSelect(tab.id)}
          />
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${idPrefix}-tab-${current}`}
        aria-labelledby={`${idPrefix}-tab-button-${current}`}
        className="relative min-h-0 flex-1"
      >
        <RailPanelEmbeddedProvider value>{children}</RailPanelEmbeddedProvider>
      </div>
    </aside>
  )
}

/**
 * An icon over its name, small. Icon-only hid half the column: nobody goes
 * looking for a tab behind a glyph they have to hover to read. The names are
 * one short word each, so seven fit across the column at 11px and the strip
 * stays the 48px of the bar beside it.
 */
function TabButton<Id extends string>({
  tab,
  idPrefix,
  selected,
  onSelect,
}: {
  tab: SideTab<Id>
  idPrefix: string
  selected: boolean
  onSelect: () => void
}) {
  const Glyph = tab.icon
  const warn = tab.warn ?? 0
  const name = warn && tab.warnLabel ? tab.warnLabel : tab.label

  return (
    <button
      type="button"
      role="tab"
      id={`${idPrefix}-tab-button-${tab.id}`}
      aria-selected={selected}
      aria-controls={`${idPrefix}-tab-${tab.id}`}
      aria-label={name}
      title={name}
      onClick={onSelect}
      className={cn(
        'relative flex h-10 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-button outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'bg-secondary text-foreground'
          : 'text-tertiary-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      <span className="relative flex">
        <Glyph weight={selected ? 'fill' : 'regular'} className="size-4" />
        {warn > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-1 size-2 rounded-full bg-warning ring-2 ring-primary"
          />
        )}
      </span>
      <span className="max-w-full truncate px-0.5 text-[11px]/3.5">
        {tab.label}
      </span>
    </button>
  )
}

/**
 * One part of a side column's tab: a small label over its body, a rule
 * between parts and none above the first — the tab strip is already there.
 */
export function SideSection({
  title,
  first,
  aside,
  children,
}: {
  title: string
  first?: boolean
  /** At the label's end: a count, a control. */
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3',
        first ? 'pt-4' : 'mt-5 border-t border-border pt-5',
      )}
    >
      <div className="flex min-h-4 items-center justify-between gap-3">
        <SmallHeading as="h3">{title}</SmallHeading>
        {aside}
      </div>
      {children}
    </section>
  )
}
