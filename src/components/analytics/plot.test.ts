import { describe, expect, it } from 'vitest'
import { buildScale, plotIndex, plotX } from './plot'
import type { Point } from './types'

/**
 * The plot's arithmetic, at the inputs that draw nothing visible when they are
 * wrong.
 *
 * A chart with a healthy month of data looks right or looks obviously broken.
 * The cases worth pinning are the ones that quietly produce `NaN` in a path
 * attribute or put the hover card on the wrong day: a flat line, a window one
 * day long, and the half-day offset between a line and a column.
 */

const DAYS: Point[] = [
  { date: '2026-09-01', value: 10 },
  { date: '2026-09-02', value: 30 },
]

describe('buildScale', () => {
  it('gives a flat line somewhere to sit', () => {
    const flat: Point[] = DAYS.map((p) => ({ ...p, value: 7 }))
    const y = buildScale([flat], 100)

    // A zero-width domain divides by zero and draws the whole series at `NaN`,
    // which renders as an empty box rather than as an error.
    expect(Number.isFinite(y(7))).toBe(true)
    expect(y(7)).toBeGreaterThan(0)
  })

  it('survives having no points at all', () => {
    const y = buildScale([[]], 100)

    expect(Number.isFinite(y(0))).toBe(true)
  })

  it('puts zero on the scale only when asked', () => {
    const high: Point[] = [
      { date: 'a', value: 1000 },
      { date: 'b', value: 1010 },
    ]

    // Forcing 0 onto a follower count that moves between 1,000 and 1,010
    // flattens the entire movement into the top two pixels — which is why a
    // level does not get the floor a running total does.
    const level = buildScale([high], 100)
    const flow = buildScale([high], 100, { floor: true })

    expect(level(1000) - level(1010)).toBeGreaterThan(50)
    expect(flow(1000) - flow(1010)).toBeLessThan(5)
  })

  it('leaves headroom above the tallest column', () => {
    const y = buildScale([DAYS], 100, { floor: true, headroom: 1.06 })

    // Flush against the ceiling reads as clipped.
    expect(y(30)).toBeGreaterThan(4)
  })
})

describe('plotX and plotIndex', () => {
  const line = { align: 'point' as const, count: 28, width: 700 }
  const bars = { align: 'slot' as const, count: 28, width: 700 }

  it('puts a line’s points on the edges and a column in its slot', () => {
    expect(plotX(0, line)).toBe(0)
    expect(plotX(27, line)).toBe(700)

    // Half a slot in, and half a slot short of the end: a column *is* a day,
    // where a point on a line only marks one.
    expect(plotX(0, bars)).toBeCloseTo(12.5, 5)
    expect(plotX(27, bars)).toBeCloseTo(687.5, 5)
  })

  it('inverts itself, on both alignments', () => {
    // The rail and the focus dot are placed by one of these and found by the
    // other. If they disagree, a bend gets attributed to the wrong post.
    for (const axis of [line, bars]) {
      for (let i = 0; i < axis.count; i++) {
        expect(plotIndex(plotX(i, axis), axis)).toBe(i)
      }
    }
  })

  it('clamps a pointer that has run off either end', () => {
    expect(plotIndex(-40, line)).toBe(0)
    expect(plotIndex(9999, line)).toBe(27)
    expect(plotIndex(-40, bars)).toBe(0)
    expect(plotIndex(9999, bars)).toBe(27)
  })

  it('has somewhere to put a single day', () => {
    const one = { align: 'point' as const, count: 1, width: 700 }

    // `i / (n - 1)` is a division by zero here, and the middle is the only
    // place a lone point can honestly go.
    expect(plotX(0, one)).toBe(350)
    expect(plotIndex(0, one)).toBe(0)
    expect(plotIndex(700, one)).toBe(0)
  })
})
