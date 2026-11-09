import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Link, type LinkProps } from '@tanstack/react-router'
import { cn } from '@/lib'

type AppSidebarButtonMenuProps = {
  /** Fully rendered icon element (Phosphor icon or a custom node). */
  icon: ReactNode
  text: string
  isActive: boolean
  /**
   * When provided the button renders as a Link, otherwise as a plain action.
   *
   * Typed as the router's own union rather than `string`, which is how the
   * rail once pointed at `/content-bank/all` months after that route was
   * deleted: the link matched `/content-bank/$assetId` instead and the
   * sidebar's Content Bank opened on "Document not found". A `string` here is
   * the one place in the app where a dead route compiles.
   */
  to?: LinkProps['to']
  params?: LinkProps['params']
  onClick?: () => void
  className?: string
  /**
   * Figures for the row's right edge, in order, hidden when the list is empty
   * — the caller drops its own zeroes, because which of them is worth a slot
   * is the caller's judgement. Two is the practical ceiling: they share one
   * chip, split by a hairline, and past that the row is a table.
   *
   * All figures are drawn alike. A row's count says how much of something
   * there is; how much it matters is the row's business, and two weights of
   * grey down the same rail read as a ranking of the modules rather than of
   * the work.
   *
   * Collapsed, all of it becomes a single dot on the icon: there is no room
   * for a number beside a 16px glyph, and the collapsed rail carries no text
   * at all by design.
   */
  counts?: { value: number }[]
  /** What the figures mean, read out — they say nothing on their own. */
  countLabel?: string
  /** A key that does the same, shown at the row's right edge. Not with `counts`. */
  shortcut?: string
}

export function AppSidebarButtonMenu({
  icon,
  text,
  isActive,
  to,
  params,
  onClick,
  className,
  counts = [],
  countLabel,
  shortcut,
}: AppSidebarButtonMenuProps) {
  const shown = counts.filter((count) => count.value > 0)
  const hasCounts = shown.length > 0

  const content = (
    <>
      <span className="relative flex shrink-0 items-center">
        {icon}
        {hasCounts && (
          // Collapsed, the chip has nowhere to go — 16px of rail beside a
          // glyph is not a figure — so the count becomes the fact that there
          // is one. Orange and round, the shape a notification is, because
          // that is all it has left to say it with: grey at this size is
          // indistinguishable from part of the icon.
          //
          // The ring is the sidebar's own surface, not a colour: the dot sits
          // on the glyph's corner, and without a gap punched around it the two
          // read as one mark. 1px is enough to separate them and little enough
          // that the dot doesn't grow into a badge.
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 hidden size-2 rounded-full bg-notification ring-1 ring-sidebar-primary group-data-[collapsible=icon]:block"
          />
        )}
      </span>
      <div className="transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
        {/* The container is a fixed width (the `menu` variant's) so labels
            never reflow while the sidebar collapses; the label is capped at
            what is left beside the figures, so a long name ellipses on-screen
            instead of under the chip. Sentence case, not caps: the rows are
            scanned, and capitals set solid read as a block. */}
        <span
          className={cn(
            'block truncate text-left',
            !hasCounts && 'w-full',
            hasCounts && shown.length === 1 && 'w-[138px]',
            hasCounts && shown.length > 1 && 'w-[112px]',
          )}
        >
          {text}
        </span>
        {hasCounts && (
          // Absolutely placed against the row's right edge rather than laid out
          // after the label: the label's width is a fixed clip, not a measure
          // of the space left, so a flex sibling ends up past the row's edge.
          //
          // Mono, because it is a figure — and capped, because past a point the
          // number stops being information and the row only has to say "more
          // than you are going to read one by one".
          <span
            // Filled, not outlined: the chip is the row's own hover surface
            // brought forward — the same grey the row takes when you point at
            // it — so it belongs to the row rather than sitting on the sidebar
            // as a mark of its own. It is a count you read on your way past,
            // not an alarm.
            //
            // The selected row already wears that grey, and a pointed-at row
            // takes it, so in both the chip steps one stop darker: a fill can
            // only read against a surface it differs from, and the alternative
            // is a chip that dissolves into exactly the row you are looking at.
            className={cn(
              'absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-md px-1.5 font-mono text-xs leading-5 text-tertiary-foreground',
              isActive
                ? 'bg-quaternary'
                : 'bg-sidebar-secondary group-hover/row:bg-quaternary',
            )}
            aria-label={countLabel}
          >
            {shown.map((count, index) => (
              <span key={index} className="flex items-center gap-1.5">
                {index > 0 && (
                  // A hairline, not a character: "1 | 9" set in type reads as
                  // one string of three figures, and the divider has to be the
                  // quietest thing in the chip for the numbers either side of
                  // it to stay separate.
                  <span className="h-3 w-px bg-senary-foreground" aria-hidden />
                )}
                <span>{count.value > 99 ? '99+' : count.value}</span>
              </span>
            ))}
          </span>
        )}
        {shortcut && !hasCounts && (
          <kbd
            aria-hidden
            className="absolute right-2 top-1/2 inline-flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-sm bg-secondary px-1 font-sans text-xs text-tertiary-foreground"
          >
            {shortcut}
          </kbd>
        )}
      </div>
    </>
  )

  if (to) {
    return (
      <Button
        variant="menu"
        size={'excluded'}
        asChild
        active={isActive}
        className={cn(
          // Named, so the count chip can answer to this row's hover without
          // touching the sidebar's own `group` (the collapse state).
          'group/row relative',
          className,
          isActive && 'text-sidebar-primary-foreground',
        )}
      >
        <Link to={to} params={params} onClick={onClick}>
          {content}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      variant="menu"
      size={'excluded'}
      active={isActive}
      className={cn(
        'group/row relative',
        className,
        isActive && 'text-sidebar-primary-foreground',
      )}
      onClick={onClick}
    >
      {content}
    </Button>
  )
}
