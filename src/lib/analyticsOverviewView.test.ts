import { describe, expect, it } from 'vitest'
import { buildNowView } from '@/lib/analyticsOverviewView'
import type {
  AnalyticsOverview,
  OverviewCard,
  OverviewMetric,
  OverviewSeries,
} from '@/types/analytics'

/**
 * What the mapper does with `/api/analytics/overview`, and what it refuses to
 * invent.
 *
 * The four cases worth arguing with here rather than reading out of a chart:
 * the wire's flows are cumulative and the view's are not, `previous` is a
 * different quantity per metric, `delta_pct: 0` means two different things, and
 * `severity` is not polarity.
 */

const BUCKETS = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']

function series(over: Partial<OverviewSeries> = {}): OverviewSeries {
  return {
    buckets: BUCKETS,
    current: [0, 0, 0, 0],
    previous: [0, 0, 0, 0],
    ...over,
  }
}

function card(
  metric: OverviewMetric,
  over: Partial<OverviewCard> = {},
): OverviewCard {
  return {
    metric,
    label: metric,
    value: 0,
    delta_pct: 0,
    direction: 'flat',
    baseline: 'insufficient_history',
    sparkline: [],
    ...over,
  }
}

function overview(
  cards: OverviewCard[],
  seriesByMetric: Partial<Record<OverviewMetric, OverviewSeries>>,
  over: Partial<AnalyticsOverview> = {},
): AnalyticsOverview {
  const full = {
    reach: series(),
    interactions: series(),
    engagement_rate: series(),
    followers: series(),
    posts_published: series(),
    ...seriesByMetric,
  } as Record<OverviewMetric, OverviewSeries>

  return {
    window: {
      from: '2026-08-01',
      to: '2026-08-04',
      days: 4,
      granularity: 'day',
    },
    updated_at: '2026-08-04T12:00:00Z',
    cards,
    series: full,
    insights: [],
    ...over,
  }
}

function reading(view: ReturnType<typeof buildNowView>, measure: string) {
  return view.readings.find((r) => r.measure === measure)
}

describe('flows are differenced back to per-bucket', () => {
  it('undoes the running sum the wire already applied', () => {
    // The card accumulates a flow itself and scales onto the tile figure, so
    // handing it the wire's cumulative array draws the sum of a sum.
    const view = buildNowView(
      overview([card('reach', { value: 400 })], {
        reach: series({ current: [100, 250, 300, 400] }),
      }),
    )

    expect(reading(view, 'reach')?.series.map((p) => p.value)).toEqual([
      100, 150, 50, 100,
    ])
  })

  it('leaves a level alone — followers is where the count stood, not what arrived', () => {
    const view = buildNowView(
      overview([card('followers', { value: 14200 })], {
        followers: series({ current: [13900, 14000, 14100, 14200] }),
      }),
    )

    expect(reading(view, 'followers')?.series.map((p) => p.value)).toEqual([
      13900, 14000, 14100, 14200,
    ])
  })

  it('leaves a rate alone — a per-bucket ratio carries nothing over', () => {
    const view = buildNowView(
      overview([card('engagement_rate', { value: 0.05 })], {
        engagement_rate: series({ current: [0.04, 0.06, 0.05, 0.05] }),
      }),
    )

    expect(
      reading(view, 'engagement_rate')?.series.map((p) => p.value),
    ).toEqual([0.04, 0.06, 0.05, 0.05])
  })

  it('clamps rather than emitting a negative when the server pads a short window', () => {
    // `alignLen` pads a short previous-window array with trailing zeros. A flow
    // cannot un-earn reach, so the fall that padding creates is not a quantity.
    const view = buildNowView(
      overview([card('reach', { value: 400 })], {
        reach: series({
          current: [400, 400, 400, 400],
          previous: [300, 300, 0, 0],
        }),
      }),
    )

    const previous = reading(view, 'reach')?.previousSeries?.map((p) => p.value)
    expect(previous).toEqual([300, 0, 0, 0])
  })
})

describe('previous is a different quantity per metric', () => {
  it('reads a flow off the previous series, immune to trailing pad-zeros', () => {
    const view = buildNowView(
      overview([card('reach', { value: 400 })], {
        reach: series({ previous: [100, 300, 0, 0] }),
      }),
    )

    // 300 is the previous window's total; the zeros are padding, not a collapse.
    expect(reading(view, 'reach')?.previous).toBe(300)
  })

  it('holds followers against where the count stood at the start of this window', () => {
    // The server's own `followersStart`, which is also the end of the previous
    // window — so the tile's chip and the ghost behind the chart agree.
    const view = buildNowView(
      overview([card('followers', { value: 14200 })], {
        followers: series({ current: [13900, 14000, 14100, 14200] }),
      }),
    )

    expect(reading(view, 'followers')?.previous).toBe(13900)
  })

  it('recovers the engagement rate basis from the delta, since no series holds it', () => {
    // The server compares the ratio of the previous window's sums, which a
    // series of per-bucket ratios cannot be summed back into.
    const view = buildNowView(
      overview([card('engagement_rate', { value: 0.06, delta_pct: 20 })], {
        engagement_rate: series({ previous: [0.05, 0.05, 0.05, 0.05] }),
      }),
    )

    expect(reading(view, 'engagement_rate')?.previous).toBeCloseTo(0.05, 4)
  })
})

describe('delta_pct: 0 is two different answers', () => {
  it('reads a flat rate as flat when the previous window reported one', () => {
    const view = buildNowView(
      overview([card('engagement_rate', { value: 0.05, delta_pct: 0 })], {
        engagement_rate: series({ previous: [0.05, 0.05, 0.05, 0.05] }),
      }),
    )

    expect(reading(view, 'engagement_rate')?.previous).toBe(0.05)
  })

  it('reads it as no-comparison when the previous window reported nothing', () => {
    // `pct()` returns 0 when the previous value is 0, so the delta alone cannot
    // tell "unchanged" from "nothing to change from". The tile says "nothing to
    // compare" rather than drawing a 0% chip.
    const view = buildNowView(
      overview([card('engagement_rate', { value: 0.05, delta_pct: 0 })], {
        engagement_rate: series({ previous: [0, 0, 0, 0] }),
      }),
    )

    expect(reading(view, 'engagement_rate')?.previous).toBeNull()
  })

  it('gives a flow no comparison when the previous window earned nothing', () => {
    const view = buildNowView(
      overview([card('reach', { value: 400 })], { reach: series() }),
    )

    expect(reading(view, 'reach')?.previous).toBeNull()
  })
})

describe('insight tone comes from the rule, not the severity', () => {
  it('separates the two directions of the one rule that fires both ways', () => {
    const both = (severity: 'info' | 'note') =>
      buildNowView(
        overview(
          [],
          {},
          {
            insights: [{ id: 'reinforcing', severity, text: 'x' }],
          },
        ),
      ).insights[0].tone

    expect(both('info')).toBe('positive')
    expect(both('note')).toBe('negative')
  })

  it('does not colour a mechanic as bad news', () => {
    // `rate_vs_reach` explains arithmetic — rate fell because reach rose. Red
    // would make a definition look like a problem.
    const view = buildNowView(
      overview(
        [],
        {},
        {
          insights: [
            { id: 'rate_vs_reach', severity: 'info', text: 'x', note: 'why' },
          ],
        },
      ),
    )

    expect(view.insights[0].tone).toBe('neutral')
    expect(view.insights[0].basis).toBe('why')
  })

  it('falls back to neutral for a rule it has never heard of', () => {
    const view = buildNowView(
      overview(
        [],
        {},
        { insights: [{ id: 'invented_later', severity: 'info', text: 'x' }] },
      ),
    )

    expect(view.insights[0].tone).toBe('neutral')
  })
})

describe('what the endpoint cannot answer', () => {
  it('carries no usual range, because every card comes back insufficient_history', () => {
    const view = buildNowView(
      overview([card('reach', { value: 400 })], { reach: series() }),
    )

    expect(reading(view, 'reach')?.expected).toBeNull()
  })

  it('picks up a band the day the server sends one', () => {
    // Written against the field rather than against today's absence, so the
    // verdict lines and the cone return without this mapper being edited.
    const view = buildNowView(
      overview([card('reach', { value: 400, baseline: 'above_usual' })], {
        reach: series({
          band: [
            { lower: 10, upper: 20 },
            { lower: 20, upper: 40 },
            { lower: 30, upper: 60 },
            { lower: 40, upper: 80 },
          ],
        }),
      }),
    )

    // The window total's range is the band at the end of the window.
    expect(reading(view, 'reach')?.expected).toEqual({ low: 40, high: 80 })
  })

  it('draws no publication rail — the payload counts posts without naming them', () => {
    const view = buildNowView(overview([], {}))
    expect(view.publications).toBeUndefined()
  })
})

describe('coverage and freshness', () => {
  it('treats the Go zero time as no freshness rather than a date in year 1', () => {
    const view = buildNowView(
      overview([], {}, { updated_at: '0001-01-01T00:00:00Z' }),
    )

    expect(view.coverage.lastRefreshedAt).toBeUndefined()
  })

  it('counts published posts and reads anything earned as measured', () => {
    const view = buildNowView(
      overview(
        [card('reach', { value: 4200 }), card('posts_published', { value: 9 })],
        { reach: series({ current: [4200, 4200, 4200, 4200] }) },
      ),
    )

    expect(view.coverage.published).toBe(9)
    expect(view.coverage.measured).toBeGreaterThan(0)
  })

  it('says nothing is measured when posts went out and none reported', () => {
    // The card's own empty state, and the sentence it prints quotes `published`.
    const view = buildNowView(
      overview([card('reach'), card('posts_published', { value: 9 })], {}),
    )

    expect(view.coverage.measured).toBe(0)
    expect(view.coverage.published).toBe(9)
  })
})

describe('the window', () => {
  it('names the stretch and anchors the comparison to the day it began', () => {
    const view = buildNowView(overview([], {}))

    expect(view.period).toEqual({
      label: 'last 4 days',
      from: '2026-08-01',
      to: '2026-08-04',
      days: 4,
    })
    // The legend reads "the stretch to 1 Aug" off this — the day the previous
    // window ended is the day this one began.
    expect(view.comparedToDate).toBe('2026-08-01')
  })

  it('renames posts_published onto the view’s own id and keeps the server’s order', () => {
    const view = buildNowView(
      overview(
        [card('reach'), card('interactions'), card('posts_published')],
        {},
      ),
    )

    expect(view.readings.map((r) => r.measure)).toEqual([
      'reach',
      'interactions',
      'published',
    ])
  })
})
