import type { ReactNode } from 'react'
import { cn } from '@/lib'

/*
 * Frames for the calendar-card harness, kept inside `routes/design/` so the
 * whole thing travels with
 * `git checkout design/calendar-cards -- src/routes/design src/routes/__root.tsx`.
 *
 * These are not candidate components — nothing here is proposed for
 * `components/`. They are the *context* a card needs to be judged in: a week
 * column lane at its real floor width, a month cell at its real height. A card
 * shown on a white page is a card nobody is looking at; both of these cards
 * are designed against the thing behind them, and the lane's fill and the
 * cell's clipping are half of what they do.
 */

/** The week column's floor width — `min-w-[150px]` in `WeeklyCalendar`. */
export const LANE_WIDTH = 150

/**
 * A month cell at the size the real grid gives it: a six-row August on a
 * 1000px-tall window measures 134px per row and ~132px per column. Every
 * capacity claim in this harness is arithmetic on these two numbers, so they
 * are stated once here rather than guessed per specimen.
 */
export const CELL_WIDTH = 132
export const CELL_HEIGHT = 134

/** The cell's own chrome, subtracted from its height before the lane is left. */
const CELL_PADDING = 0 // the lane has no inset; the gap between cards does the work
const CELL_DATE_ROW = 22 // h-[22px] — 20 of row plus the 2px top inset

/**
 * The lane a cell of this height leaves for cards — the number the real grid
 * measures with a `ResizeObserver`, derived here instead so a specimen's
 * caption can't drift from what the specimen actually does. Feed it to
 * `pickMonthRung` to get the same answer the month view would get.
 */
export function cellLaneHeight(height: number): number {
  return Math.max(0, height - CELL_PADDING - CELL_DATE_ROW)
}

/** The lane a week column of this height leaves — no inset, and the ADD POST slot. */
export function weekLaneHeight(height: number, addButton = true): number {
  return Math.max(0, height - CELL_PADDING - (addButton ? 44 : 0))
}

/**
 * A whole week grid — headers and lanes — at a given number of visible days.
 *
 * The point of drawing the whole thing rather than one column: hiding weekends
 * does not just remove two columns, it makes the other five wider, and the card
 * sizes its title off its own width. Five days and seven days are two different
 * cards, and the only way to see that is side by side.
 */
export function WeekGrid({
  columns,
  width,
  height,
  caption,
}: {
  columns: { key: string; label: string; dateLabel: string; lane: ReactNode }[]
  width: number
  height: number
  caption?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5" style={{ width }}>
      <div className="flex gap-0.5" style={{ height }}>
        {columns.map((col) => (
          <div key={col.key} className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex shrink-0 flex-col items-center gap-0.5 bg-secondary px-2 pt-2.5 pb-2">
              <span className="text-base leading-6 font-medium">{col.label}</span>
              <span className="text-xs leading-4 tabular-nums text-tertiary-foreground">
                {col.dateLabel}
              </span>
            </div>
            {/* `px-1` as the real lane carries it — the 4px this theme's
                `--shadow-md` reaches sideways, which a scrolling lane would
                otherwise clip at its padding box. Without it the harness would
                show a sheared shadow the app doesn't have. */}
            <div className="flex min-h-0 flex-1 flex-col items-stretch gap-0.5 overflow-y-auto bg-secondary px-1">
              {col.lane}
            </div>
          </div>
        ))}
      </div>
      {caption && <Caption>{caption}</Caption>}
    </div>
  )
}

/** Section heading for the harness page itself. */
export function Section({
  title,
  intro,
  children,
}: {
  title: string
  intro?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-16 flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-medium tracking-tight">{title}</h2>
        {intro && <p className="max-w-3xl text-sm text-tertiary-foreground">{intro}</p>}
      </header>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  )
}

/** One labelled group of specimens, with the point written above it. */
export function Specimen({
  label,
  note,
  children,
}: {
  label: string
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <header className="flex flex-col gap-0.5">
        <h3 className="text-[10px] font-semibold tracking-[0.08em] text-accent uppercase">
          {label}
        </h3>
        {note && <p className="max-w-3xl text-[12px] text-tertiary-foreground">{note}</p>}
      </header>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </div>
  )
}

/** A caption under one specimen — what this instance is, in two or three words. */
export function Caption({ children }: { children: ReactNode }) {
  return (
    <span className="max-w-[180px] text-[11px]/4 text-quaternary-foreground">{children}</span>
  )
}

/**
 * A week column's posts lane: the same fill, padding and gap
 * `WeeklyCalendar` gives it, at the width the column floors at. Cards are
 * `w-full` and size their type off their own width, so this is the difference
 * between reading a specimen and reading a decoration.
 */
export function Lane({
  width = LANE_WIDTH,
  height,
  caption,
  children,
}: {
  width?: number
  /** Constrain and scroll, as the real column does. Omit to size to content. */
  height?: number
  caption?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5" style={{ width }}>
      <div
        className={cn(
          // `px-1` matches the real lane: 4px kept back for the hover shadow,
          // which is exactly what this theme's `--shadow-md` reaches sideways
          // and exactly what a scrolling lane would otherwise clip off.
          'flex flex-col items-stretch gap-0.5 bg-secondary px-1',
          height !== undefined && 'overflow-y-auto',
        )}
        style={height !== undefined ? { height } : undefined}
      >
        {children}
      </div>
      {caption && <Caption>{caption}</Caption>}
    </div>
  )
}

/**
 * A month cell, chrome and all: the date row, then the clipping lane. The
 * clipping is the point — a cell that grows to fit its posts would break the
 * one rule the month view has, which is that the whole month is on the screen.
 */
export function Cell({
  day = 12,
  width = CELL_WIDTH,
  height = CELL_HEIGHT,
  outside = false,
  caption,
  children,
}: {
  day?: number
  width?: number
  height?: number
  outside?: boolean
  caption?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5" style={{ width }}>
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-col overflow-hidden bg-secondary',
          outside && 'bg-secondary/50',
        )}
        style={{ height }}
      >
        <div className="flex h-[22px] shrink-0 items-center justify-between gap-1 pt-0.5 pr-0.5">
          <span
            className={cn(
              'text-xs leading-4 tabular-nums',
              outside ? 'text-quaternary-foreground' : 'text-tertiary-foreground',
            )}
          >
            {day}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">{children}</div>
      </div>
      {caption && <Caption>{caption}</Caption>}
    </div>
  )
}
