import { describe, expect, it } from 'vitest'
import { drawnSeries } from './format'
import { MEASURES, type Point } from './types'

/**
 * Which shape a measure is drawn in.
 *
 * The rule earns a test of its own because it used to be written twice — once
 * in the tile and once in the chart under it — and the two drifted: the tile
 * drew per-day buckets beneath a label reading "Cumulative reach" while the
 * chart drew the running total. One measure, one window, two shapes, and
 * nothing on the page to say which was the real one.
 */

const DAYS: Point[] = [
  { date: '2026-09-01', value: 100 },
  { date: '2026-09-02', value: 40 },
  { date: '2026-09-03', value: 60 },
]

describe('drawnSeries', () => {
  it('accumulates a flow onto the headline figure exactly', () => {
    const points = drawnSeries(MEASURES.reach, DAYS, 400)

    // Not merely rising — landing on the tile's own number. Anything else and
    // the reader is left to wonder whether the chart and the figure above it
    // are counting the same thing.
    expect(points.map((p) => p.value)).toEqual([200, 280, 400])
    expect(points[points.length - 1].value).toBe(400)
  })

  it('leaves a level alone', () => {
    // Followers on Wednesday is not Monday's plus Tuesday's; summing a level
    // invents a quantity that does not exist.
    expect(drawnSeries(MEASURES.followers, DAYS, 60)).toEqual(DAYS)
  })

  it('leaves columns alone even when the measure is a flow', () => {
    // The rule is keyed to the chart, not to the kind. No measure ships as both
    // today, so this is the case that would otherwise go unnoticed until one
    // does — and a running total drawn in bars is a staircase nobody reads.
    const flowInBars = { ...MEASURES.reach, chart: 'columns' as const }

    expect(drawnSeries(flowInBars, DAYS, 400)).toEqual(DAYS)
  })

  it('does not scale a window that earned nothing', () => {
    const quiet: Point[] = DAYS.map((p) => ({ ...p, value: 0 }))

    // There is no factor that takes zero to a total, and reaching for one is a
    // division by zero drawn as `NaN` across the whole plot.
    expect(drawnSeries(MEASURES.reach, quiet, 400).map((p) => p.value)).toEqual(
      [0, 0, 0],
    )
  })
})
