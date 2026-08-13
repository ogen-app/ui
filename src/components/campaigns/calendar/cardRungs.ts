/**
 * How much of itself a calendar card shows when the space runs out.
 *
 * Both views draw a fixed box and put an unknown number of posts in it, so
 * "what does a card look like" has no single answer — it depends on how many
 * siblings it is sharing a day with. Rather than let the card overflow, or
 * shrink it uniformly until the type is unreadable, each view walks a short
 * ladder of *sub-types*: named, discrete steps that each drop one thing.
 *
 * The ladders are ordered roomiest-first, and the pickers below return the
 * first rung whose whole column fits. That "whole column" matters: the rung is
 * chosen for a day, not for a card, so the posts on a Tuesday all look alike
 * and only Tuesday gets tighter when Tuesday gets busy.
 */

import { DEFAULT_CARD_FIELDS, cardIsBare, type CardFields } from './cardFields'

/* ------------------------------------------------------------------ week */

export type WeekRung = {
  id: 'comfortable' | 'regular' | 'tight' | 'minimal'
  /** How many lines the title may take before it clamps. */
  titleLines: 1 | 2 | 3
  /** Whether the time row is drawn at all. */
  time: boolean
}

/**
 * Roomiest to tightest: the title spends its three lines down to one, and then
 * the time goes.
 *
 * The picture is not on the ladder, and that is now a deliberate cost rather
 * than a free lunch: since it grew a 100px band of its own it is far and away
 * the most expensive thing on the card, and a rung that dropped it would buy
 * back more than the whole rest of the ladder put together. It stays off
 * because *whether a calendar shows pictures* is a preference and not a
 * measurement — see `cardFields`. The user has a switch for it; the ladder
 * doesn't get to flip that switch for them on a busy Tuesday.
 *
 * Below `minimal` there is no further rung: the lane scrolls, exactly as it
 * does today. The ladder buys back a screenful before that happens, it doesn't
 * pretend to make a day of thirty posts fit.
 */
export const WEEK_RUNGS: WeekRung[] = [
  { id: 'comfortable', titleLines: 3, time: true },
  { id: 'regular', titleLines: 2, time: true },
  { id: 'tight', titleLines: 1, time: true },
  { id: 'minimal', titleLines: 1, time: false },
]

/** What a card knows about itself that changes its height. */
export type CardFacts = {
  hasTime: boolean
  /**
   * The post is carrying a warning or a locked date. Its indicator row is then
   * drawn at every rung, because those are the two things a card exists to
   * surface — a ladder that hides them has optimised away its own point.
   */
  hasFlag?: boolean
  /** The post has a picture to be backed by — `media_urls[0]`. */
  hasImage?: boolean
}

/*
 * The height model, in the units the card is actually built from. These
 * mirror `PostCard`'s classes; change one there and one here.
 */
const CARD_PADDING = 16 // p-2, top and bottom
const CARD_ROW_GAP = 6 // gap-1.5
const TEXT_ROW = 16 // text-[12px]/[16px] — status, time, platform, account
const TITLE_LINE = 17 // 14px at leading-[1.2], rounded up so the ceiling holds

/**
 * The band above the rows on a backed card — `pt-[108px]` against the card's
 * own 8px, so a hundred pixels of it are picture before any text starts. The
 * image covers the whole card and the fade only begins 24px up from here
 * (`FADE_START`), so what the band is exactly is "the part the rows are kept
 * off" rather than "the part that is clear" — the two stopped being the same
 * number when the fade got its run-up. This is the one of them that costs
 * height.
 */
const MEDIA_BAND = 100

/** Vertical gap between cards in a week column — `gap-0.5`. */
export const WEEK_CARD_GAP = 2

/**
 * What one card would measure at this rung, given what the user allows it to
 * show. Slightly pessimistic by design — `TITLE_LINE` assumes the largest type
 * the ramp can pick, so a rung that the arithmetic says fits always really
 * fits.
 *
 * Independent of the card's width; the only variable rows are text, and the
 * picture's band is a constant.
 */
export function weekCardHeight(
  rung: WeekRung,
  facts: CardFacts,
  fields: CardFields = DEFAULT_CARD_FIELDS,
): number {
  const rows: number[] = []
  const showTime = fields.time && facts.hasTime && rung.time
  // Both branches of `PostCard`'s `showStatus`, and they have to stay both:
  // the floor adds a row the switches alone would not predict, and a column
  // measured without it comes up short by exactly the cards that have least on
  // them.
  const showStatus = fields.status || cardIsBare(fields, facts.hasTime)
  // The indicator row — the status mark, and beside it either the status in
  // words or the time. It survives a tight rung only when it is carrying an
  // exception; otherwise it goes with the time it holds.
  if (showStatus || showTime || facts.hasFlag) rows.push(TEXT_ROW)
  // Writing the status out displaces the time onto a line of its own, which is
  // the one case where two of these rows are drawn instead of one.
  if (showStatus && showTime) rows.push(TEXT_ROW)
  if (fields.title) rows.push(rung.titleLines * TITLE_LINE)
  if (fields.platform) rows.push(TEXT_ROW)
  if (fields.account) rows.push(TEXT_ROW)
  const band = fields.image && facts.hasImage ? MEDIA_BAND : 0
  const stack =
    rows.length === 0
      ? // Everything the user left on happens to be missing from this post.
        // The card is then its status accent and nothing else, and it still has
        // to be big enough to see and to click.
        TEXT_ROW
      : rows.reduce((a, b) => a + b, 0) + (rows.length - 1) * CARD_ROW_GAP
  return CARD_PADDING + band + stack
}

/** What a whole column of these cards would measure at this rung. */
export function weekColumnHeight(
  rung: WeekRung,
  cards: CardFacts[],
  fields: CardFields = DEFAULT_CARD_FIELDS,
): number {
  if (cards.length === 0) return 0
  return (
    cards.reduce((sum, facts) => sum + weekCardHeight(rung, facts, fields), 0) +
    (cards.length - 1) * WEEK_CARD_GAP
  )
}

/**
 * The roomiest rung whose whole column fits the space, or the tightest rung
 * if none does — at which point the lane scrolls and the ladder has done all
 * it can.
 *
 * `available` is the lane's content height minus anything else living in it
 * (the ADD POST button holds its space even while invisible).
 */
export function pickWeekRung(
  cards: CardFacts[],
  available: number,
  fields: CardFields = DEFAULT_CARD_FIELDS,
): WeekRung {
  if (cards.length === 0) return WEEK_RUNGS[0]
  for (const rung of WEEK_RUNGS) {
    if (weekColumnHeight(rung, cards, fields) <= available) return rung
  }
  return WEEK_RUNGS[WEEK_RUNGS.length - 1]
}

/* ----------------------------------------------------------------- month */

export type MonthRung = {
  id: 'generous' | 'roomy' | 'regular' | 'compact'
  /** Row height in px, and the `h-*` class the card draws it with. */
  height: number
  heightClass: string
  /** Type for the card as a whole — on one line, that is the whole card. */
  textClass: string
  /** Type for the title, where it is set larger than the time above it. */
  titleClass?: string
  /**
   * How many lines the card lays itself out on. Two puts the time on a line of
   * its own above the title; one is the single-line card the month has always
   * drawn.
   */
  lines: 1 | 2
  /** How many lines the title itself may take before it clamps. */
  titleLines: 1 | 2
}

/** The gap between a two-line card's own lines — `gap-0.5`. */
export const MONTH_LINE_GAP = 2

/**
 * The month's ladder: two rungs above the single-line card and one below it,
 * then a density.
 *
 * `regular` is the card the month was designed around, and the ladder grows in
 * both directions from it. Down, a shorter line — the only thing a one-line
 * card has left to give. Up, a *second line*, which is not a bigger version of
 * the same card but a different one: the time moves off the title's line and
 * stops competing with it for width. That is what the two-line card buys, and
 * it is worth buying, because the month's two questions are *when* and *what*
 * and the single-line card can only ever answer both by making them share.
 *
 * Up again from there, the title stops being a line and becomes a *paragraph*:
 * two lines at 13px, which is the first size in this view a title is comfortably
 * read at rather than recognised at. Only a day with one or two posts can afford
 * it, so it is the quiet-day card and nothing else — but a quiet day is most of
 * a month, and a cell with 50px of unused space under a truncated title was
 * banking room it had no use for.
 *
 * Reachability, in the ~112px a real cell leaves: one or two posts get
 * `generous` (2 × 52 + 2 = 106), three get `roomy` (3 × 34 + 4 = 106), four or
 * five get `regular`, six get `compact`, and seven is a density. Every step is
 * a real one and every one of those numbers is arithmetic on the heights below
 * — change a height and re-do it.
 *
 * Two-line heights are exact sums of their parts and have no padding to absorb
 * a mistake: 16 + 2 + 16 for `roomy`, 16 + 2 + 2 × 17 for `generous`. A change
 * to the type scale has to move the rung's height with it.
 *
 * The 2px between a card's own lines is the same 2px that separates one card
 * from the next, which sounds like it should be ambiguous and isn't: a card is
 * a filled block on the lane's own fill, so what reads as the boundary is the
 * break in the fill, not the distance. (Flush lines were the earlier answer,
 * from reading the spacing alone. The fill is the stronger cue and it was
 * already there.)
 *
 * Note what is *not* here: dropping the time. That buys horizontal space, not
 * vertical, so it can't be a rung on this ladder — the single-line card decides
 * it for itself from its own width (see `MonthPostCard`'s container query), and
 * the two-line cards never have to, which is the point of them. A narrow column
 * loses the time; a short cell loses a line and then some leading.
 */
export const MONTH_RUNGS: MonthRung[] = [
  {
    id: 'generous',
    height: 52,
    heightClass: 'h-13',
    textClass: 'text-[11px]/4',
    titleClass: 'text-[13px]/[17px]',
    lines: 2,
    titleLines: 2,
  },
  {
    id: 'roomy',
    height: 34,
    heightClass: 'h-[34px]',
    textClass: 'text-[11px]/4',
    lines: 2,
    titleLines: 1,
  },
  {
    id: 'regular',
    height: 20,
    heightClass: 'h-5',
    textClass: 'text-[11px]/4',
    lines: 1,
    titleLines: 1,
  },
  {
    id: 'compact',
    height: 16,
    heightClass: 'h-4',
    textClass: 'text-[10px]/[12px]',
    lines: 1,
    titleLines: 1,
  },
]

/** Vertical gap between cards in a month cell — `gap-0.5`. */
export const MONTH_CARD_GAP = 2

/**
 * The roomiest rung that fits every post in the cell, or `null` when even the
 * tightest doesn't — which is the signal to draw `MonthDensity` instead.
 *
 * This replaced a single measured capacity. A capacity answered "how many
 * 20px cards fit"; this asks the better question, "is there a card size that
 * fits them all", and so tries the other sizes before giving up on titles
 * altogether. A cell that used to collapse at five posts now shows five — and
 * one that holds a post or two spends the room it has left on lines and on
 * type, rather than banking it.
 */
export function pickMonthRung(count: number, available: number): MonthRung | null {
  if (count === 0) return MONTH_RUNGS[0]
  for (const rung of MONTH_RUNGS) {
    if (count * rung.height + (count - 1) * MONTH_CARD_GAP <= available) return rung
  }
  return null
}
