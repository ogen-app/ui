/**
 * How much of itself a calendar card shows when the space runs out.
 *
 * Both views draw a fixed box and put an unknown number of posts in it, so
 * "what does a card look like" has no single answer — it depends on how many
 * siblings it is sharing a day with. Rather than let the card overflow, or
 * shrink it uniformly until the type is unreadable, the card walks a short
 * ladder of *sub-types*: named, discrete steps that each drop one thing.
 *
 * One ladder, not one per view. There used to be a second card for the month —
 * its own component, its own four rungs, its own idea of what a post looks
 * like — and the two drifted, because nothing made them agree. The month draws
 * the same card as the week now; what differs is the room it has and what the
 * user has left switched on for it (`cardFields`), which is exactly what this
 * ladder is a function of.
 *
 * It is ordered roomiest-first, and the pickers below return the first rung
 * whose whole stack fits. That "whole stack" matters: the rung is chosen for a
 * day, not for a card, so the posts on a Tuesday all look alike and only
 * Tuesday gets tighter when Tuesday gets busy.
 */

import { DEFAULT_WEEK_FIELDS, cardIsBare, type CardFields } from './cardFields'

/* ------------------------------------------------------------------ card */

export type CardRung = {
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
 * than a free lunch: since it grew a band of its own it is far and away the
 * most expensive thing on the card, and a rung that dropped it would buy back
 * more than the whole rest of the ladder put together. It stays off because
 * *whether a calendar shows pictures* is a preference and not a measurement —
 * see `cardFields`. The user has a switch for it; the ladder doesn't get to
 * flip that switch for them on a busy Tuesday.
 *
 * The month is the one place a picture is dropped by measurement, and it is
 * kept off the ladder even there — see `fitMonthCell`, which asks the ladder
 * twice rather than adding a step to it. The distinction is not pedantry: a
 * rung applies to both views, and the week has no reason for one.
 *
 * Below `minimal` there is no further rung: the lane scrolls, exactly as it
 * does today. The ladder buys back a screenful before that happens, it doesn't
 * pretend to make a day of thirty posts fit.
 */
export const CARD_RUNGS: CardRung[] = [
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
 * The band above the rows on a backed card: the part the rows are kept off,
 * rather than the part that is clear. The image covers the whole card and the
 * fade begins a run-up above where the rows start (`PostCard`'s `FADE_RUNUP`),
 * so those two stopped being the same number — this is the one of them that
 * costs height.
 *
 * Two sizes, because a card is drawn in two rooms. `full` is the week's, where
 * a column is most of a screen and a hundred pixels of photograph is what makes
 * a post findable without reading it. `compact` is the month's, and it is
 * sized off the one measurement that matters there: a real month cell leaves
 * about 112px for cards, and a card with a time and a title on one line is 55
 * of them — so 56 is the largest band under which a quiet day still shows the
 * picture *and* what the post is. Bigger and the month would only ever be able
 * to draw a photograph with nothing said about it; smaller and it is a stamp.
 */
export const CARD_BANDS = { full: 100, compact: 56 } as const

export type CardBand = keyof typeof CARD_BANDS

/** Vertical gap between cards in a week column — `gap-0.5`. */
export const CARD_GAP = 2

/**
 * What one card would measure at this rung, given what the user allows it to
 * show. Slightly pessimistic by design — `TITLE_LINE` assumes the largest type
 * the ramp can pick, so a rung that the arithmetic says fits always really
 * fits.
 *
 * Independent of the card's width; the only variable rows are text, and the
 * picture's band is a constant.
 */
export function cardHeight(
  rung: CardRung,
  facts: CardFacts,
  fields: CardFields = DEFAULT_WEEK_FIELDS,
  band: CardBand = 'full',
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
  const media = fields.image && facts.hasImage ? CARD_BANDS[band] : 0
  const stack =
    rows.length === 0
      ? // Everything the user left on happens to be missing from this post.
        // The card is then its status accent and nothing else, and it still has
        // to be big enough to see and to click.
        TEXT_ROW
      : rows.reduce((a, b) => a + b, 0) + (rows.length - 1) * CARD_ROW_GAP
  return CARD_PADDING + media + stack
}

/** What a whole column of these cards would measure at this rung. */
export function stackHeight(
  rung: CardRung,
  cards: CardFacts[],
  fields: CardFields = DEFAULT_WEEK_FIELDS,
  band: CardBand = 'full',
): number {
  if (cards.length === 0) return 0
  return (
    cards.reduce((sum, facts) => sum + cardHeight(rung, facts, fields, band), 0) +
    (cards.length - 1) * CARD_GAP
  )
}

/**
 * The roomiest rung whose whole stack fits the space, or `null` when even the
 * tightest doesn't.
 *
 * `available` is the lane's content height minus anything else living in it
 * (in the week, the ADD POST button holds its space even while invisible).
 *
 * The two views take the `null` differently, which is the only place they still
 * differ: a week column scrolls, because a column is tall enough that scrolling
 * it is a normal thing to do. A month cell can't — the whole grid is one
 * screen by construction — so it draws `MonthDensity` instead and the day's
 * titles move one click away. Hence two entry points over one ladder.
 */
export function fitRung(
  cards: CardFacts[],
  available: number,
  fields: CardFields = DEFAULT_WEEK_FIELDS,
  band: CardBand = 'full',
): CardRung | null {
  if (cards.length === 0) return CARD_RUNGS[0]
  for (const rung of CARD_RUNGS) {
    if (stackHeight(rung, cards, fields, band) <= available) return rung
  }
  return null
}

/**
 * What a month cell draws: a rung, and whether the day's pictures are part of
 * it.
 *
 * This is the one place the picture is decided by measurement rather than by
 * preference, and it is not a rung — the ladder still has no step that drops
 * one, for the reason given above. The month needs the question asked anyway
 * because of what its "nothing fits" is: a week column that runs out scrolls,
 * so the user keeps their pictures *and* their posts. A month cell can't
 * scroll, so running out means `MonthDensity` — a count, with every title one
 * click away. Between a photograph and knowing what is on the day, the day
 * wins; the picture is what goes.
 *
 * So: the day as the user asked for it, and only if no rung holds that, the
 * same day without its pictures. A quiet day keeps them, a busy one spends
 * them to stay readable, and the density is what is left when neither works.
 * `image: false` in the answer means the caller should draw with the picture
 * field off — it passes its own `CardFields` for that rather than one made
 * here, since the object's identity is a `memo` prop on every card.
 */
export function fitMonthCell(
  cards: CardFacts[],
  available: number,
  fields: CardFields,
): { rung: CardRung; image: boolean } | null {
  const asked = fitRung(cards, available, fields, 'compact')
  if (asked) return { rung: asked, image: fields.image }
  if (!fields.image) return null
  const stripped = fitRung(cards, available, { ...fields, image: false }, 'compact')
  return stripped ? { rung: stripped, image: false } : null
}

/**
 * `fitRung` for a lane that can scroll: the tightest rung stands in for "none
 * of them fit", and the ladder has done all it can.
 */
export function pickRung(
  cards: CardFacts[],
  available: number,
  fields: CardFields = DEFAULT_WEEK_FIELDS,
): CardRung {
  return fitRung(cards, available, fields) ?? CARD_RUNGS[CARD_RUNGS.length - 1]
}

