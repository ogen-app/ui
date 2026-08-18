import { describe, expect, it } from 'vitest'
import {
  CARD_GAP,
  CARD_RUNGS,
  fitRung,
  pickRung,
  cardHeight,
  stackHeight,
  type CardFacts,
} from './cardRungs'
import {
  CARD_FIELDS,
  DEFAULT_MONTH_FIELDS,
  DEFAULT_WEEK_FIELDS,
  canHideField,
  visibleFieldCount,
  type CardFields,
} from './cardFields'

const TEXT: CardFacts = { hasTime: true }
const NO_TIME: CardFacts = { hasTime: false }
const BACKED: CardFacts = { hasTime: true, hasImage: true }

/** The month's own fields, which is what a month cell is measured against. */
const MONTH = DEFAULT_MONTH_FIELDS

const fields = (overrides: Partial<CardFields> = {}): CardFields => ({
  ...DEFAULT_WEEK_FIELDS,
  ...overrides,
})

describe('cardHeight', () => {
  it('shrinks monotonically down the ladder', () => {
    const heights = CARD_RUNGS.map((rung) => cardHeight(rung, TEXT))
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeLessThan(heights[i - 1])
    }
  })

  it('omits the indicator row for a post that has no time, whatever the rung says', () => {
    expect(cardHeight(CARD_RUNGS[0], NO_TIME)).toBeLessThan(
      cardHeight(CARD_RUNGS[0], TEXT),
    )
  })

  it('keeps the indicator row on a flagged post even where the rung drops the time', () => {
    const minimal = CARD_RUNGS[CARD_RUNGS.length - 1] // titleLines 1, time false
    const plain = { ...TEXT }
    const flagged = { ...TEXT, hasFlag: true }
    expect(cardHeight(minimal, flagged)).toBeGreaterThan(cardHeight(minimal, plain))
    // And it costs nothing where the row was being drawn anyway.
    expect(cardHeight(CARD_RUNGS[0], flagged)).toBe(cardHeight(CARD_RUNGS[0], plain))
  })

  it('charges the floor its status row, which the switches alone would not predict', () => {
    // A card the switches have stripped to one row says its status in words —
    // `cardIsBare`, which `PostCard` renders from and this has to agree with.
    // Measured naively it comes out at one row and draws as two, and a column
    // of them overruns by exactly the cards that have least on them.
    const onlyTitle = fields({ image: false, time: false, platform: false })
    expect(cardHeight(CARD_RUNGS[0], NO_TIME, onlyTitle)).toBe(
      // the status row, the gap, and three lines of title
      16 + 16 + 6 + 3 * 17,
    )

    // "Only the time" is the case where the floor costs two rows rather than
    // one: the word takes the slot beside the mark and displaces the time, the
    // same way the status switch does.
    const onlyTime = fields({ image: false, title: false, platform: false })
    expect(cardHeight(CARD_RUNGS[0], TEXT, onlyTime)).toBe(16 + 16 + 6 + 16)

    // Two rows is above the floor, and nothing is added.
    const twoRows = fields({ image: false, platform: false })
    expect(cardHeight(CARD_RUNGS[0], TEXT, twoRows)).toBe(16 + 16 + 6 + 3 * 17)
  })

  it('does not let a tightening rung be what puts a card on the floor', () => {
    // The bare test reads the post's own time, not the rung's. Otherwise the
    // tightest rung would turn the status into a word on a card the user had
    // asked to show a time and a title — the column deciding what the card
    // says about itself, which is the user's business and the post's.
    const timeAndTitle = fields({ image: false, platform: false })
    const minimal = CARD_RUNGS[CARD_RUNGS.length - 1]
    // The padding and one line of title — no status row, though the rung has
    // just taken the time away and left a single row behind.
    expect(cardHeight(minimal, TEXT, timeAndTitle)).toBe(16 + 17)
  })

  it('draws the indicator row for a flagged post with no time at all', () => {
    expect(cardHeight(CARD_RUNGS[0], { ...NO_TIME, hasFlag: true })).toBe(
      cardHeight(CARD_RUNGS[0], TEXT),
    )
  })

  it('charges the picture its band, and only where there is a picture to show', () => {
    // The premise the ladder used to rest on — that a background image is free
    // — stopped being true when it grew a 100px band of its own. Everything
    // downstream (which rung a column gets, whether the lane scrolls) is wrong
    // if this stops being counted.
    for (const rung of CARD_RUNGS) {
      expect(cardHeight(rung, BACKED)).toBe(cardHeight(rung, TEXT) + 100)
    }
    // A post with no picture pays nothing for the field being on...
    expect(cardHeight(CARD_RUNGS[0], TEXT)).toBe(
      cardHeight(CARD_RUNGS[0], TEXT, fields({ image: false })),
    )
    // ...and a post with one pays nothing once the user turns the field off.
    expect(cardHeight(CARD_RUNGS[0], BACKED, fields({ image: false }))).toBe(
      cardHeight(CARD_RUNGS[0], TEXT),
    )
  })

  it('gives the time its own line once the status is written out', () => {
    const plain = cardHeight(CARD_RUNGS[0], TEXT)
    const worded = cardHeight(CARD_RUNGS[0], TEXT, fields({ status: true }))
    // One more 16px row, plus the 6px gap that separates it.
    expect(worded).toBe(plain + 22)
    // Only one row for a post with no time to displace: the status takes the
    // slot rather than pushing anything out of it. Which is the same 111px as
    // the ordinary card above — the status row and the time row are the same
    // row, and this post only ever needed one of them.
    expect(cardHeight(CARD_RUNGS[0], NO_TIME, fields({ status: true }))).toBe(plain)
  })

  it('drops the rows the user turned off', () => {
    const full = cardHeight(CARD_RUNGS[0], TEXT)
    expect(cardHeight(CARD_RUNGS[0], TEXT, fields({ platform: false }))).toBe(full - 22)
    expect(cardHeight(CARD_RUNGS[0], TEXT, fields({ time: false }))).toBe(full - 22)
    expect(cardHeight(CARD_RUNGS[0], TEXT, fields({ account: true }))).toBe(full + 22)
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
    expect(cardHeight(CARD_RUNGS[0], NO_TIME, nothing)).toBe(32)
  })
})

describe('pickRung', () => {
  it('gives an empty column the roomiest rung', () => {
    expect(pickRung([], 0).id).toBe('comfortable')
  })

  it('keeps the roomiest rung while one post has room to spare', () => {
    expect(pickRung([TEXT], 600).id).toBe('comfortable')
  })

  it('steps down as the same column fills', () => {
    const lane = 460
    const ids = [1, 3, 5, 8].map(
      (n) => pickRung(Array.from({ length: n }, () => TEXT), lane).id,
    )
    // Monotonic: never climbs back up as posts are added.
    const order = CARD_RUNGS.map((r) => r.id)
    for (let i = 1; i < ids.length; i++) {
      expect(order.indexOf(ids[i])).toBeGreaterThanOrEqual(order.indexOf(ids[i - 1]))
    }
    expect(ids[0]).toBe('comfortable')
  })

  it('bottoms out rather than failing — the lane scrolls from there', () => {
    const thirty = Array.from({ length: 30 }, () => TEXT)
    expect(pickRung(thirty, 400).id).toBe('minimal')
  })

  it('picks the rung that actually fits, not one past it', () => {
    // Build a lane exactly tall enough for two cards at `regular` and no more.
    const regular = CARD_RUNGS[1]
    const lane = 2 * cardHeight(regular, TEXT) + CARD_GAP
    expect(pickRung([TEXT, TEXT], lane).id).toBe('regular')
    // One pixel short and it has to give up another rung.
    expect(pickRung([TEXT, TEXT], lane - 1).id).toBe('tight')
  })

  it('has no rung that drops a picture, however much one would buy', () => {
    // The picture is now the most expensive thing on the card by a factor of
    // five, so a rung that dropped it would be the most tempting step on the
    // ladder — and the wrong one. Whether a calendar shows pictures is the
    // user's answer, in `cardFields`; the ladder's job is to fit what they
    // asked for, not to overrule it on a busy Tuesday.
    expect(CARD_RUNGS.some((rung) => 'image' in rung)).toBe(false)
    // Two rungs that differ in nothing the height model reads would be dead
    // weight — every step down the ladder must actually be shorter.
    const heights = CARD_RUNGS.map((rung) => cardHeight(rung, TEXT))
    expect(new Set(heights).size).toBe(CARD_RUNGS.length)
  })

  it('spends the rungs it has to once the pictures are in', () => {
    // Four backed posts in a lane that would hold four plain ones comfortably.
    const plain = Array.from({ length: 4 }, () => TEXT)
    const lane = stackHeight(CARD_RUNGS[0], plain)
    expect(pickRung(plain, lane).id).toBe('comfortable')
    const backed = Array.from({ length: 4 }, () => BACKED)
    expect(pickRung(backed, lane).id).toBe('minimal')
    // And turning the pictures off gives the roomy rung straight back.
    expect(pickRung(backed, lane, fields({ image: false })).id).toBe('comfortable')
  })
})

describe('stackHeight', () => {
  it('is what the lane has to hold — cards plus the gaps between them', () => {
    expect(stackHeight(CARD_RUNGS[0], [])).toBe(0)
    expect(stackHeight(CARD_RUNGS[0], [TEXT])).toBe(cardHeight(CARD_RUNGS[0], TEXT))
    expect(stackHeight(CARD_RUNGS[0], [TEXT, TEXT])).toBe(
      2 * cardHeight(CARD_RUNGS[0], TEXT) + CARD_GAP,
    )
  })

  it('agrees with the rung that was picked from it', () => {
    // The lane asks this a second time to decide whether to scroll, and a
    // column that scrolls when it did not have to is a column whose hover
    // shadow is sheared off for nothing. The two answers have to come from the
    // same arithmetic, which is the whole reason this is exported.
    const cards = Array.from({ length: 3 }, () => TEXT)
    const lane = stackHeight(CARD_RUNGS[2], cards)
    const rung = pickRung(cards, lane)
    expect(stackHeight(rung, cards)).toBeLessThanOrEqual(lane)
  })
})

describe('cardFields', () => {
  it('defaults to the card as it was before any of this was configurable', () => {
    expect(DEFAULT_WEEK_FIELDS).toEqual({
      image: true,
      status: false,
      time: true,
      title: true,
      platform: true,
      account: false,
    })
  })

  it('lets the user switch off all but one', () => {
    const all = DEFAULT_WEEK_FIELDS
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
    expect(canHideField(one, 'time')).toBe(true)
  })
})


/**
 * What a real month cell leaves for cards: a 134px row less the 22px date
 * strip. Every number below is arithmetic on this one, so a change to the
 * cell's chrome lands here first.
 */
const CELL = 112

describe('fitRung', () => {
  it('gives up rather than bottoming out — the month draws a density instead', () => {
    // The one difference between the two views' use of the ladder. A week
    // column scrolls when nothing fits; a month cell can't, so it needs to be
    // told, and `null` is what tells it.
    const day = Array.from({ length: 12 }, () => TEXT)
    expect(fitRung(day, CELL, MONTH)).toBeNull()
    expect(pickRung(day, CELL, MONTH)).toBe(CARD_RUNGS[CARD_RUNGS.length - 1])
  })

  it('fits a real month cell with the fields the month starts on', () => {
    // Time and title, no platform and no picture (`DEFAULT_MONTH_FIELDS`): a
    // card is 16px of padding + a 16px time row + a 6px gap + a title line, so
    // 55px on one title line. Two of those and their gap is 112 exactly. A
    // third only fits once the time goes with it (`minimal`, 33px each), and
    // the fourth is what a cell has no rung left for.
    expect(fitRung([TEXT, TEXT], CELL, MONTH)?.id).toBe('tight')
    expect(fitRung([TEXT, TEXT, TEXT], CELL, MONTH)?.id).toBe('minimal')
    expect(fitRung([TEXT, TEXT, TEXT, TEXT], CELL, MONTH)).toBeNull()
  })

  it('spends a quiet day on the roomier rung', () => {
    expect(fitRung([TEXT], CELL, MONTH)?.id).toBe('comfortable')
  })

  it('never charges the month for a picture', () => {
    // The month's `image` is always false — `useCalendarSettings` stamps the
    // calendar-wide preview preference over the week only, because the 100px
    // band is the whole 112px cell: charged for it, one backed post has no
    // rung and the day collapses into a density summary.
    expect(fitRung([BACKED], CELL, MONTH)?.id).toBe('comfortable')
    expect(fitRung([BACKED], CELL, { ...MONTH, image: true })).toBeNull()
  })

  it('costs the month a rung when it is given the week fields', () => {
    // The whole reason the two views keep separate fields. The same two posts
    // in the same cell: the month's card keeps its time, the week's card has
    // to drop it to make room for the platform row.
    expect(fitRung([TEXT, TEXT], CELL, MONTH)?.id).toBe('tight')
    expect(fitRung([TEXT, TEXT], CELL, fields())?.id).toBe('minimal')
  })

  it('treats an empty day as roomy rather than dense', () => {
    // No cards to draw, so the value is only ever a non-null — what matters is
    // that a day with nothing in it never reads as a day too full to show.
    expect(fitRung([], 0, MONTH)).not.toBeNull()
  })

  it('is monotonic in the height it is given', () => {
    const cells = [40, 60, 80, 100, 140, 200]
    const seen = cells.map((h) => fitRung([TEXT, TEXT], h, MONTH))
    for (let i = 1; i < seen.length; i++) {
      const prev = seen[i - 1]
      const next = seen[i]
      // Once a rung is affordable it stays affordable as the cell grows.
      if (prev) {
        expect(next).not.toBeNull()
        expect(CARD_RUNGS.indexOf(next!)).toBeLessThanOrEqual(CARD_RUNGS.indexOf(prev))
      }
    }
  })
})
