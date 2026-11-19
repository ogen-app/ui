import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretDownIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'

/**
 * A list of cards — the Ideas and Assets lists since design/ideas-cards — on
 * three rules:
 *
 * 1. **Two text sizes.** 14/20 for anything read (titles, summaries, tabs,
 *    buttons), 12/16 for anything glanced at (the line under a row, pills,
 *    group heads, column values). Two weights, two greys.
 * 2. **A 4px rhythm.** A card is 16 · title 20 · 4 · summary · 8 · details
 *    16 · 16. Every mark in the leading columns is 20px — one title line —
 *    and sits on it.
 * 3. **One line over the list.** The tabs (the only counts) are in the page
 *    header; the list's head is a single line — the box over the boxes, then
 *    Filter and the filters as pills, Views, Group and Sort at its end, or the
 *    selection and its actions in their place. It is the one thing that pins.
 *
 * Each card is its own surface: a hairline border, 4px from the next, no
 * dividers. The head and the group heads use the cards' grid and carry the
 * same 1px border, transparent, so their boxes sit over the cards' boxes by
 * construction rather than by matching padding.
 */

/** The columns: box, mark, the words, (a column of the list's own), the end. */
export const CARD_GRID =
  'grid grid-cols-[16px_20px_minmax(0,1fr)_auto] gap-x-4 border px-4'

/** With a fourth column (the campaign) on a wide list — `@container` widths. */
export const CARD_GRID_WIDE =
  '@4xl:grid-cols-[16px_20px_minmax(0,1fr)_minmax(0,13rem)_auto]'

/** A card's surface at rest, hovered, and ticked. */
export const CARD = 'rounded-md border-quaternary bg-primary hover:bg-secondary'
export const CARD_SELECTED = 'rounded-md border-accent/40 bg-accent/5'

/** The cards' list: 4px between cards. */
export const CARD_LIST = 'flex flex-col gap-1'

/**
 * Whether a press on a card should open it: not when it landed on something
 * of its own — a link, a button, a box, a field, a menu — and not when it
 * ended a text selection.
 */
export function opensCard(event: MouseEvent): boolean {
  const target = event.target as HTMLElement
  if (
    target.closest(
      'a,button,input,textarea,select,label,[role=checkbox],[role=menuitem],[data-card-body]',
    )
  )
    return false
  return !window.getSelection()?.toString()
}

/** How many of a set are ticked, as a box's state. */
export function boxState(
  ticked: number,
  count: number,
): boolean | 'indeterminate' {
  return ticked === 0 ? false : ticked >= count ? true : 'indeterminate'
}

/**
 * The list's tabs, after the title in the page header — the only counts on
 * the page. The current one is a white card with a hairline; the rest are
 * words until hovered.
 */
export function HeaderTabs({
  tabs,
  current,
  onPick,
}: {
  tabs: readonly { id: string; label: string; count: string }[]
  current: string
  onPick?: (id: string) => void
}) {
  return (
    <div className="ml-4 flex min-w-0 items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onPick?.(tab.id)}
          aria-current={tab.id === current}
          className={cn(
            'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-button border px-3 text-sm/5 outline-none focus-visible:ring-2 focus-visible:ring-accent',
            tab.id === current
              ? 'border-border bg-primary font-medium text-foreground'
              : 'border-transparent text-secondary-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {tab.label}
          <span
            aria-live="polite"
            className="font-normal text-secondary-foreground tabular-nums"
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * The list's head, the first item of its list: the box over the boxes, then
 * the selection — or, with nothing ticked, the filter and how the list is
 * arranged, as one line. It pins under the page header (`pinnedBands`, its
 * cap behind the header while pinned), so a selection's actions stay in reach
 * however far the list is scrolled, and it is the only thing that does. Its
 * end runs to the cards' outer edge (no right padding), flush with the page
 * header's action above it.
 */
export function CardHead({
  box,
  wide,
  children,
}: {
  box: ReactNode
  wide: boolean
  children: ReactNode
}) {
  return (
    <li
      data-band
      className={cn(
        CARD_GRID,
        wide && CARD_GRID_WIDE,
        // Ruled off from the cards in the page header's line colour. Its
        // controls are as tall as a pill and sit on its first row: pills that
        // run long wrap onto rows under them, and nothing else moves.
        'sticky top-[57px] items-start border-x-transparent border-t-transparent border-b-border bg-background py-1.5 pr-0',
        "before:absolute before:inset-x-0 before:bottom-full before:hidden before:h-20 before:bg-background before:content-[''] data-pinned:before:block",
      )}
      style={{ zIndex: ZIndex.stickyTableHeader }}
    >
      <span className="flex h-7 items-center">{box}</span>
      <div className="col-span-full col-start-2 flex min-w-0 items-start gap-3">
        {children}
      </div>
    </li>
  )
}

/**
 * A group's head, on the cards' grid: its own box over theirs, which ticks
 * the group (half-ticked, it fills the group — clearing everything is the
 * head box's job), then the group's name, which folds it, and its count, in
 * the tabs' size. A surface of its own, a step lighter than the page and a
 * step quieter than a card. It scrolls with its cards: only the list's head
 * pins, so the top of the page is never a stack of bars.
 */
export function CardBand({
  label,
  leading,
  count,
  aside,
  ticked,
  selectable,
  selecting,
  folded,
  onFold,
  onTick,
  wide,
}: {
  label: string
  /** A mark before the name — a document's kind. */
  leading?: ReactNode
  count: string
  /** Glanced-at words after the count — what the document is. */
  aside?: ReactNode
  /** How many of the group's loaded cards are ticked, and of how many. */
  ticked: { on: number; of: number }
  selectable: boolean
  selecting: boolean
  folded: boolean
  onFold: () => void
  onTick: () => void
  wide: boolean
}) {
  const { t } = useTranslation()
  const state = boxState(ticked.on, ticked.of)
  return (
    <li
      className={cn(
        CARD_GRID,
        wide && CARD_GRID_WIDE,
        // The margin parts one group from the last.
        'group/band mt-3 h-9 items-center rounded-md border-quaternary bg-secondary',
      )}
    >
      <span className="flex h-4 items-center">
        {selectable && (
          <Checkbox
            checked={state}
            onCheckedChange={onTick}
            disabled={ticked.of === 0}
            aria-label={t('content.list.selectGroup', { group: label })}
            className={cn(
              'transition-opacity',
              state === false &&
                !selecting &&
                'opacity-40 group-hover/band:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
            )}
          />
        )}
      </span>
      <h2 className="col-span-full col-start-2 min-w-0">
        <button
          type="button"
          onClick={onFold}
          aria-expanded={!folded}
          aria-label={t(folded ? 'content.list.unfold' : 'content.list.fold', {
            group: label,
          })}
          className="flex h-5 max-w-full cursor-pointer items-center gap-2 text-left text-sm/5 outline-none focus-visible:underline"
        >
          {leading}
          <span className="truncate font-medium text-foreground">{label}</span>
          <span className="shrink-0 text-secondary-foreground tabular-nums">
            {count}
          </span>
          {aside && (
            <span className="truncate text-secondary-foreground">{aside}</span>
          )}
          <CaretDownIcon
            aria-hidden
            className={cn(
              'size-3 shrink-0 text-secondary-foreground transition-transform',
              folded && '-rotate-90',
            )}
          />
        </button>
      </h2>
    </li>
  )
}
