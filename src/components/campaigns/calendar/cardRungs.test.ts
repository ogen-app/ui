import { describe, expect, it } from 'vitest'
import {
  MONTH_LINE_GAP,
  MONTH_RUNGS,
  WEEK_CARD_GAP,
  WEEK_RUNGS,
  pickMonthRung,
  pickWeekRung,
  weekCardHeight,
  weekColumnHeight,
  type CardFacts,
} from './cardRungs'
import {
  CARD_FIELDS,
  DEFAULT_CARD_FIELDS,
  canHideField,
  visibleFieldCount,
  type CardFields,
} from './cardFields'

const TEXT: CardFacts = { hasTime: true }
const NO_TIME: CardFacts = { hasTime: false }
const BACKED: CardFacts = { hasTime: true, hasImage: true }

const fields = (overrides: Partial<CardFields> = {}): CardFields => ({
  ...DEFAULT_CARD_FIELDS,
  ...overrides,
})

describe('weekCardHeight', () => {
  it('shrinks monotonically down the ladder', () => {
    const heights = WEEK_RUNGS.map((rung) => weekCardHeight(rung, TEXT))
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeLessThan(heights[i - 1])
    }
  })

  it('omits the indicator row for a post that has no time, whatever the rung says', () => {
    expect(weekCardHeight(WEEK_RUNGS[0], NO_TIME)).toBeLessThan(
      weekCardHeight(WEEK_RUNGS[0], TEXT),
    )
  })

  it('keeps the indicator row on a flagged post even where the rung drops the time', () => {
    const minimal = WEEK_RUNGS[WEEK_RUNGS.length - 1] // titleLines 1, time false
    const plain = { ...TEXT }
    const flagged = { ...TEXT, hasFlag: true }
    expect(weekCardHeight(minimal, flagged)).toBeGreaterThan(weekCardHeight(minimal, plain))
    // And it costs nothing where the row was being drawn anyway.
    expect(weekCardHeight(WEEK_RUNGS[0], flagged)).toBe(weekCardHeight(WEEK_RUNGS[0], plain))
  })

  it('charges the floor its status row, which the switches alone would not predict', () => {
    // A card the switches have stripped to one row says its status in words —
    // `cardIsBare`, which `PostCard` renders from and this has to agree with.
    // Measured naively it comes out at one row and draws as two, and a column
    // of them overruns by exactly the cards that have least on them.
    const onlyTitle = fields({ image: false, time: false, platform: false })
    expect(weekCardHeight(WEEK_RUNGS[0], NO_TIME, onlyTitle)).toBe(
      // the status row, the gap, and three lines of title
      16 + 16 + 6 + 3 * 17,
    )

    // "Only the time" is the case where the floor costs two rows rather than
    // one: the word takes the slot beside the mark and displaces the time, the
    // same way the status switch does.
    const onlyTime = fields({ image: false, title: false, platform: false })
    expect(weekCardHeight(WEEK_RUNGS[0], TEXT, onlyTime)).toBe(16 + 16 + 6 + 16)

    // Two rows is above the floor, and nothing is added.
    const twoRows = fields({ image: false, platform: false })
    expect(weekCardHeight(WEEK_RUNGS[0], TEXT, twoRows)).toBe(16 + 16 + 6 + 3 * 17)
  })

  it('does not let a tightening rung be what puts a card on the floor', () => {
    // The bare test reads the post's own time, not the rung's. Otherwise the
    // tightest rung would turn the status into a word on a card the user had
    // asked to show a time and a title — the column deciding what the card
    // says about itself, which is the user's business and the post's.
    const timeAndTitle = fields({ image: false, platform: false })
    const minimal = WEEK_RUNGS[WEEK_RUNGS.length - 1]
    // The padding and one line of title — no status row, though the rung has
    // just taken the time away and left a single row behind.
    expect(weekCardHeight(minimal, TEXT, timeAndTitle)).toBe(16 + 17)
  })

  it('draws the indicator row for a flagged post with no time at all', () => {
    expect(weekCardHeight(WEEK_RUNGS[0], { ...NO_TIME, hasFlag: true })).toBe(
      weekCardHeight(WEEK_RUNGS[0], TEXT),
    )
  })

  it('charges the picture its band, and only where there is a picture to show', () => {
    // The premise the ladder used to rest on — that a background image is free
    // — stopped being true when it grew a 100px band of its own. Everything
    // downstream (which rung a column gets, whether the lane scrolls) is wrong
    // if this stops being counted.
    for (const rung of WEEK_RUNGS) {
      expect(weekCardHeight(rung, BACKED)).toBe(weekCardHeight(rung, TEXT) + 100)
    }
    // A post with no picture pays nothing for the field being on...
    expect(weekCardHeight(WEEK_RUNGS[0], TEXT)).toBe(
      weekCardHeight(WEEK_RUNGS[0], TEXT, fields({ image: false })),
    )
    // ...and a post with one pays nothing once the user turns the field off.
    expect(weekCardHeight(WEEK_RUNGS[0], BACKED, fields({ image: false }))).toBe(
      weekCardHeight(WEEK_RUNGS[0], TEXT),
    )
  })

  it('gives the time its own line once the status is written out', () => {
    const plain = weekCardHeight(WEEK_RUNGS[0], TEXT)
    const worded = weekCardHeight(WEEK_RUNGS[0], TEXT, fields({ status: true }))
    // One more 16px row, plus the 6px gap that separates it.
    expect(worded).toBe(plain + 22)
    // Only one row for a post with no time to displace: the status takes the
    // slot rather than pushing anything out of it. Which is the same 111px as
    // the ordinary card above — the status row and the time row are the same
    // row, and this post only ever needed one of them.
    expect(weekCardHeight(WEEK_RUNGS[0], NO_TIME, fields({ status: true }))).toBe(plain)
  })

  it('drops the rows the user turned off', () => {
    const full = weekCardHeight(WEEK_RUNGS[0], TEXT)
    expect(weekCardHeight(WEEK_RUNGS[0], TEXT, fields({ platform: false }))).toBe(full - 22)
    expect(weekCardHeight(WEEK_RUNGS[0], TEXT, fields({ time: false }))).toBe(full - 22)
    expect(weekCardHeight(WEEK_RUNGS[0], TEXT, fields({ account: true }))).toBe(full + 22)
  })

  it('keeps a card big enough to see when this post has none of what is left on', () => {
    // Image only, on a post with no image: every row is off and there is
    // nothing to draw. It is still a card — clickable, draggable, and carrying
    // the status accent that has no switch.
    const nothing = fields({
      image: true,
      status: false,
      time: false,
      title: false,
      platform: false,
      account: false,
    })
    expect(weekCardHeight(WEEK_RUNGS[0], NO_TIME, nothing)).toBe(32)
  })
})

describe('pickWeekRung', () => {
  it('gives an empty column the roomiest rung', () => {
    expect(pickWeekRung([], 0).id).toBe('comfortable')
  })

  it('keeps the roomiest rung while one post has room to spare', () => {
    expect(pickWeekRung([TEXT], 600).id).toBe('comfortable')
  })

  it('steps down as the same column fills', () => {
    const lane = 460
    const ids = [1, 3, 5, 8].map(
      (n) => pickWeekRung(Array.from({ length: n }, () => TEXT), lane).id,
    )
    // Monotonic: never climbs back up as posts are added.
    const order = WEEK_RUNGS.map((r) => r.id)
    for (let i = 1; i < ids.length; i++) {
      expect(order.indexOf(ids[i])).toBeGreaterThanOrEqual(order.indexOf(ids[i - 1]))
    }
    expect(ids[0]).toBe('comfortable')
  })

  it('bottoms out rather than failing — the lane scrolls from there', () => {
    const thirty = Array.from({ length: 30 }, () => TEXT)
    expect(pickWeekRung(thirty, 400).id).toBe('minimal')
  })

  it('picks the rung that actually fits, not one past it', () => {
    // Build a lane exactly tall enough for two cards at `regular` and no more.
    const regular = WEEK_RUNGS[1]
    const lane = 2 * weekCardHeight(regular, TEXT) + WEEK_CARD_GAP
    expect(pickWeekRung([TEXT, TEXT], lane).id).toBe('regular')
    // One pixel short and it has to give up another rung.
    expect(pickWeekRung([TEXT, TEXT], lane - 1).id).toBe('tight')
  })

  it('has no rung that drops a picture, however much one would buy', () => {
    // The picture is now the most expensive thing on the card by a factor of
    // five, so a rung that dropped it would be the most tempting step on the
    // ladder — and the wrong one. Whether a calendar shows pictures is the
    // user's answer, in `cardFields`; the ladder's job is to fit what they
    // asked for, not to overrule it on a busy Tuesday.
    expect(WEEK_RUNGS.some((rung) => 'image' in rung)).toBe(false)
    // Two rungs that differ in nothing the height model reads would be dead
    // weight — every step down the ladder must actually be shorter.
    const heights = WEEK_RUNGS.map((rung) => weekCardHeight(rung, TEXT))
    expect(new Set(heights).size).toBe(WEEK_RUNGS.length)
  })

  it('spends the rungs it has to once the pictures are in', () => {
    // Four backed posts in a lane that would hold four plain ones comfortably.
    const plain = Array.from({ length: 4 }, () => TEXT)
    const lane = weekColumnHeight(WEEK_RUNGS[0], plain)
    expect(pickWeekRung(plain, lane).id).toBe('comfortable')
    const backed = Array.from({ length: 4 }, () => BACKED)
    expect(pickWeekRung(backed, lane).id).toBe('minimal')
    // And turning the pictures off gives the roomy rung straight back.
    expect(pickWeekRung(backed, lane, fields({ image: false })).id).toBe('comfortable')
  })
})

describe('weekColumnHeight', () => {
  it('is what the lane has to hold — cards plus the gaps between them', () => {
    expect(weekColumnHeight(WEEK_RUNGS[0], [])).toBe(0)
    expect(weekColumnHeight(WEEK_RUNGS[0], [TEXT])).toBe(weekCardHeight(WEEK_RUNGS[0], TEXT))
    expect(weekColumnHeight(WEEK_RUNGS[0], [TEXT, TEXT])).toBe(
      2 * weekCardHeight(WEEK_RUNGS[0], TEXT) + WEEK_CARD_GAP,
    )
  })

  it('agrees with the rung that was picked from it', () => {
    // The lane asks this a second time to decide whether to scroll, and a
    // column that scrolls when it did not have to is a column whose hover
    // shadow is sheared off for nothing. The two answers have to come from the
    // same arithmetic, which is the whole reason this is exported.
    const cards = Array.from({ length: 3 }, () => TEXT)
    const lane = weekColumnHeight(WEEK_RUNGS[2], cards)
    const rung = pickWeekRung(cards, lane)
    expect(weekColumnHeight(rung, cards)).toBeLessThanOrEqual(lane)
  })
})

describe('cardFields', () => {
  it('defaults to the card as it was before any of this was configurable', () => {
    expect(DEFAULT_CARD_FIELDS).toEqual({
      image: true,
      status: false,
      time: true,
      title: true,
      platform: true,
      account: false,
    })
  })

  it('lets the user switch off all but one', () => {
    const all = DEFAULT_CARD_FIELDS
    expect(CARD_FIELDS.every((field) => canHideField(all, field))).toBe(true)

    const one: CardFields = {
      image: false,
      status: false,
      time: false,
      title: true,
      platform: false,
      account: false,
    }
    expect(visibleFieldCount(one)).toBe(1)
    expect(canHideField(one, 'title')).toBe(false)
    // The switches that are already off stay switchable — the floor is on the
    // last one *on*, not on every control in the panel.
    expect(canHideField(one, 'image')).toBe(true)
  })
})

/**
 * What a real cell leaves for cards: a 134px row less the 22px date strip. Every
 * number below is arithmetic on this one, so a change to the cell's chrome
 * lands here first.
 */
const LANE = 112

describe('pickMonthRung', () => {
  it('walks down the whole ladder as the day fills up', () => {
    // One step per count, in the one cell size that matters:
    //   1–2 → generous (2 × 52 + 2 = 106)
    //   3   → roomy    (3 × 34 + 4 = 106)
    //   4–5 → regular  (5 × 20 + 8 = 108)
    //   6   → compact  (6 × 16 + 10 = 106)
    //   7   → density
    expect(pickMonthRung(1, LANE)?.id).toBe('generous')
    expect(pickMonthRung(2, LANE)?.id).toBe('generous')
    expect(pickMonthRung(3, LANE)?.id).toBe('roomy')
    expect(pickMonthRung(4, LANE)?.id).toBe('regular')
    expect(pickMonthRung(5, LANE)?.id).toBe('regular')
    expect(pickMonthRung(6, LANE)?.id).toBe('compact')
    expect(pickMonthRung(7, LANE)).toBeNull()
  })

  it('spends spare height on lines and on type rather than banking it', () => {
    // A cell that drew a 20px card with 90px of nothing under it was giving
    // the room back to no one. The quiet day is most of a month, so this is
    // the common case and not the exotic one.
    expect(pickMonthRung(1, LANE)?.titleLines).toBe(2)
    expect(pickMonthRung(3, LANE)?.lines).toBe(2)
    // What it costs: one more post and the whole cell steps down. The rung is
    // the cell's, not the card's — a cell of mixed heights would read broken.
    expect(pickMonthRung(4, LANE)?.lines).toBe(1)
  })

  it('reaches the taller cards at any count with the height for it', () => {
    // Nothing up the ladder is special-cased to quiet days: each rung is taken
    // wherever it fits, and one pixel less is what moves the answer.
    expect(pickMonthRung(5, 5 * 52 + 4 * 2)?.id).toBe('generous')
    expect(pickMonthRung(5, 5 * 52 + 4 * 2 - 1)?.id).toBe('roomy')
    expect(pickMonthRung(5, 5 * 34 + 4 * 2 - 1)?.id).toBe('regular')
  })

  it('falls to the compact row before giving up on titles', () => {
    // 112px fits five 20px rows (5×20 + 4×2 = 108) but not six (6×20 + 5×2 =
    // 130). The compact row is what saves the sixth: 6×16 + 5×2 = 106.
    expect(pickMonthRung(6, LANE)?.id).toBe('compact')
  })

  it('returns null — draw a density — when no row size fits', () => {
    expect(pickMonthRung(7, LANE)).toBeNull()
  })

  it('treats an empty day as roomy rather than dense', () => {
    // No cards to draw, so the value is only ever a non-null — what matters is
    // that a day with nothing in it never reads as a day too full to show.
    expect(pickMonthRung(0, 0)).not.toBeNull()
  })

  it('is ordered tallest-first, and every rung is a real step', () => {
    const heights = MONTH_RUNGS.map((rung) => rung.height)
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeLessThan(heights[i - 1])
    }
    // The two that aren't just shorter versions of their neighbour: the extra
    // height buys a second line, and then a second *title* line at a larger
    // size. Both are different cards rather than bigger ones, and the ladder
    // is ordered so that the more a rung gives back, the higher it sits.
    expect(MONTH_RUNGS.map((rung) => rung.lines)).toEqual([2, 2, 1, 1])
    expect(MONTH_RUNGS.map((rung) => rung.titleLines)).toEqual([2, 1, 1, 1])
    // A two-line card's height is exactly its parts — there is no padding in
    // it, so this is the arithmetic the card's layout depends on.
    expect(MONTH_RUNGS[1].height).toBe(16 + MONTH_LINE_GAP + 16)
    expect(MONTH_RUNGS[0].height).toBe(16 + MONTH_LINE_GAP + 2 * 17)
  })

  it('is monotonic in the height it is given', () => {
    const heights = [40, 60, 80, 100, 140, 200]
    const seen = heights.map((h) => pickMonthRung(5, h))
    for (let i = 1; i < seen.length; i++) {
      const prev = seen[i - 1]
      const next = seen[i]
      // Once a rung is affordable it stays affordable as the cell grows.
      if (prev) {
        expect(next).not.toBeNull()
        expect(MONTH_RUNGS.indexOf(next!)).toBeLessThanOrEqual(MONTH_RUNGS.indexOf(prev))
      }
    }
  })
})
