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
  search?: LinkProps['search']
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
   * for a number beside a 20px glyph, and the collapsed rail carries no text
   * at all by design.
   */
  counts?: { value: number }[]
  /** What the figures mean, read out — they say nothing on their own. */
  countLabel?: string
}

export function AppSidebarButtonMenu({
  icon,
  text,
  isActive,
  to,
  params,
  search,
  onClick,
  className,
  counts = [],
  countLabel,
}: AppSidebarButtonMenuProps) {
  const shown = counts.filter((count) => count.value > 0)
  const hasCounts = shown.length > 0

  const content = (
    <>
      {/* A 24px slot whatever the glyph, so every label in the rail — the
          rows and the account below them — starts on one line. */}
      <span className="relative flex size-6 shrink-0 items-center justify-center">
        {icon}
        {hasCounts && (
          // Collapsed, the chip has nowhere to go — 20px of rail beside a
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
        {/* The container is wider than the button so labels never reflow while
            the sidebar collapses; the label itself is capped at the visible
            width so a long name ellipses on-screen instead of past the clip.

            A count shortens that cap so the label ellipses before it reaches
            the figures — the row is `overflow-hidden`, and anything that has to
            sit after a full-width label lands in the clipped part. Two figures
            take another 20px off it. */}
        <span
          className={cn(
            'block truncate text-left',
            !hasCounts && 'w-[186px]',
            hasCounts && shown.length === 1 && 'w-[150px]',
            hasCounts && shown.length > 1 && 'w-[130px]',
          )}
        >
          {text}
        </span>
        {hasCounts && (
          // Absolutely placed against the row's right edge rather than laid out
          // after the label: the label's width is a fixed clip, not a measure
          // of the space left, so a flex sibling ends up past the row's edge.
          //
          // Tabular, because it is a figure — and capped, because past a point
          // the number stops being information and the row only has to say
          // "more than you are going to read one by one".
          <span
            // Filled, one stop darker than the row's own hover and current
            // grey, so it reads against the row in every state. A count you
            // read on your way past, not an alarm.
            className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-sm bg-quaternary px-1.5 text-xs tabular-nums leading-5 text-secondary-foreground"
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
        )}
      >
        <Link to={to} params={params} search={search} onClick={onClick}>
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
      className={cn('group/row relative', className)}
      onClick={onClick}
    >
      {content}
    </Button>
  )
}
