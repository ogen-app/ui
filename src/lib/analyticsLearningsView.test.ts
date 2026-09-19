import { describe, expect, it } from 'vitest'
import { t } from '@/test/i18n'
import { buildLearningsView } from '@/lib/analyticsLearningsView'
import type {
  AnalyticsLearnings,
  HeatmapCell,
  LearningsPattern,
} from '@/types/analytics'

/**
 * What the mapper does with `/api/analytics/learnings`, and what it refuses to
 * flatten.
 *
 * The cases worth arguing with: the grid is sparse and Sunday-first and has to
 * become dense and Monday-first without turning "never published then" into a
 * zero, the three sections withdraw independently, a `works` lift and a
 * `fading` trend have to read in one unit, and no confidence grade is invented
 * on top of the support the server already enforced.
 */

function cell(over: Partial<HeatmapCell> = {}): HeatmapCell {
  return {
    day_of_week: 4,
    hour: 18,
    score: 1,
    post_count: 6,
    median: 12400,
    ...over,
  }
}

function pattern(over: Partial<LearningsPattern> = {}): LearningsPattern {
  return {
    id: 'media_format:carousel',
    dimension: 'media_format',
    segment: 'carousel',
    headline: 'Carousels',
    metric: 'saves',
    lift: 1.6,
    support: 18,
    detail: 'Roughly 60% more saves than a typical post.',
    ...over,
  }
}

function learnings(over: Partial<AnalyticsLearnings> = {}): AnalyticsLearnings {
  return {
    scope: {
      since: null,
      trend_window_days: 90,
      measured_posts: 96,
      settled_posts: 74,
      metric: 'reach',
    },
    updated_at: '2026-08-27T10:00:00Z',
    heatmap: {
      metric: 'reach',
      cells: [cell()],
      strongest: { day_of_week: 4, hour: 18, post_count: 6 },
      measured_posts: 96,
    },
    lifespan: {
      settled_posts: 74,
      t50_hours: 19,
      t75_hours: 38,
      t95_hours: 82,
      horizon_hours: 124,
      curve: [
        { age_hours: 0, share_of_final: 0 },
        { age_hours: 6, share_of_final: 0.28 },
      ],
    },
    patterns: { works: [pattern()], fading: [] },
    ...over,
  }
}

/** The grid a set of cells produces, for reading a slot out by row and hour. */
function grid(cells: HeatmapCell[]) {
  const view = buildLearningsView(
    t,
    'en',
    learnings({
      heatmap: { metric: 'reach', cells, measured_posts: cells.length },
    }),
  )
  return view.heatmap?.grid
}

describe('the sparse grid becomes a dense one without inventing zeroes', () => {
  it.each([
    ['Sunday', 0, 6],
    ['Monday', 1, 0],
    ['Thursday', 4, 3],
    ['Saturday', 6, 5],
  ])('re-bases %s from the wire onto a Monday-first row', (_, wire, row) => {
    // The wire follows `/best-times`: 0 = Sunday. The grid is drawn Monday
    // first, so every day but Monday moves.
    expect(grid([cell({ day_of_week: wire })])?.[row][18]).not.toBeNull()
  })

  it('leaves a slot with no posts absent rather than at the bottom of the scale', () => {
    // The bug this forbids: a zero here draws "we post at 3am and it does
    // nothing" identically to "we have never posted at 3am". Opposite
    // findings, opposite actions.
    const rows = grid([cell()])

    expect(rows?.[3][18]).not.toBeNull()
    expect(rows?.[3][17]).toBeNull()
    expect(rows?.flat().filter(Boolean)).toHaveLength(1)
  })

  it('is always seven rows of twenty-four, however little was sent', () => {
    const rows = grid([cell()])

    expect(rows).toHaveLength(7)
    expect(rows?.every((row) => row.length === 24)).toBe(true)
  })

  it('drops a day or hour outside the grid instead of wrapping it onto a real one', () => {
    // A wrapped cell is worse than a missing one: it puts a finding on a slot
    // the workspace never published in.
    expect(
      grid([cell({ day_of_week: 7 })])
        ?.flat()
        .filter(Boolean),
    ).toEqual([])
    expect(
      grid([cell({ hour: 24 })])
        ?.flat()
        .filter(Boolean),
    ).toEqual([])
  })

  it('carries the sample and the median into the slot’s tooltip', () => {
    // The only place the count behind a square is available at all.
    expect(grid([cell()])?.[3][18]?.title).toBe(
      'Thursday 18:00 UTC · 6 posts · 12.4K median reach',
    )
  })

  it('names the strongest slot in UTC, because that is the clock the server bucketed on', () => {
    const view = buildLearningsView(t, 'en', learnings())

    expect(view.heatmap?.strongest).toEqual({
      label: 'Thursday 18:00 UTC',
      postCount: 6,
    })
  })

  it('says nothing about a strongest slot when the server did not pick one', () => {
    const view = buildLearningsView(
      t,
      'en',
      learnings({
        heatmap: { metric: 'reach', cells: [cell()], measured_posts: 96 },
      }),
    )

    expect(view.heatmap?.strongest).toBeNull()
  })
})

describe('each section withdraws on its own', () => {
  it('keeps the other two when the curve has no settled posts behind it', () => {
    // A workspace can know when it publishes and not yet know how long a post
    // lives — the curve needs posts that have *finished*, which takes weeks.
    const view = buildLearningsView(
      t,
      'en',
      learnings({ lifespan: { insufficient_history: true } }),
    )

    expect(view.lifespan).toBeNull()
    expect(view.heatmap).not.toBeNull()
    expect(view.patterns).not.toBeNull()
  })

  it.each(['heatmap', 'lifespan', 'patterns'] as const)(
    'reads a withdrawn %s as absent rather than as an empty one',
    (section) => {
      const view = buildLearningsView(
        t,
        'en',
        learnings({ [section]: { insufficient_history: true } }),
      )

      expect(view[section]).toBeNull()
    },
  )

  it('tells a section with history and nothing in it apart from one with none', () => {
    // `{works: [], fading: []}` is "nothing has separated itself yet"; a
    // withdrawn section is "there is not enough to look at". Different copy.
    const view = buildLearningsView(t, 'en', learnings({ patterns: {} }))

    expect(view.patterns).toEqual({ works: [], fading: [] })
  })
})

describe('the two pattern columns read in one unit', () => {
  it('turns a lift into how far above the median it sits', () => {
    const view = buildLearningsView(t, 'en', learnings())

    expect(view.patterns?.works[0].figure).toBe('+60%')
  })

  it('turns a decline into a fall rather than a fraction', () => {
    // `0.66×` beside `1.6×` makes the reader convert one of them.
    const view = buildLearningsView(
      t,
      'en',
      learnings({
        patterns: {
          fading: [pattern({ lift: undefined, trend: 0.66, metric: 'reach' })],
        },
      }),
    )

    expect(view.patterns?.fading[0].figure).toBe('−34%')
  })

  it('prints no figure for a card the server sent without one', () => {
    const view = buildLearningsView(
      t,
      'en',
      learnings({ patterns: { works: [pattern({ lift: undefined })] } }),
    )

    expect(view.patterns?.works[0].figure).toBeNull()
  })

  it('carries the card’s own metric, which need not be the one asked for', () => {
    // The miner evaluates reach and saves and keeps whichever gives the
    // stronger signal per segment, so a card on a reach-mined board can be
    // about saves.
    const view = buildLearningsView(t, 'en', learnings())

    expect(view.metric).toBe('reach')
    expect(view.patterns?.works[0].metric).toBe('saves')
  })

  it('states the support and grades it no further', () => {
    // No confidence enum on the wire and none invented: the server enforces a
    // minimum support and withdraws the whole section below it, so a card that
    // arrives is one it was willing to stand behind.
    const view = buildLearningsView(
      t,
      'en',
      learnings({ patterns: { works: [pattern({ support: 1 })] } }),
    )

    expect(view.patterns?.works[0].support).toBe('1 post')
  })
})

describe('the lifespan curve', () => {
  it('renames the wire’s axes into the ones the chart draws', () => {
    const view = buildLearningsView(t, 'en', learnings())

    expect(view.lifespan?.curve).toEqual([
      { hour: 0, share: 0 },
      { hour: 6, share: 0.28 },
    ])
  })

  it('assembles three scalars into the marks on it', () => {
    const view = buildLearningsView(t, 'en', learnings())

    expect(view.lifespan?.milestones).toEqual([
      { share: 0.5, hour: 19 },
      { share: 0.75, hour: 38 },
      { share: 0.95, hour: 82 },
    ])
  })

  it('reads hours as hours until they stop being readable', () => {
    const view = buildLearningsView(t, 'en', learnings())

    expect(view.lifespan?.half).toBe('19h')
    expect(view.lifespan?.horizon).toBe('5d 4h')
  })
})

describe('how far back the lessons reach', () => {
  it('says nothing when the server used everything, because the card already does', () => {
    expect(buildLearningsView(t, 'en', learnings()).historySince).toBeNull()
  })

  it('writes a cut-off in the active language, as the rest of the surface does', () => {
    const view = buildLearningsView(
      t,
      'en',
      learnings({
        scope: { ...learnings().scope, since: '2026-01-01' },
      }),
    )

    expect(view.historySince).toBe('since Jan 1, 2026')
  })

  it('treats the Go zero time as no freshness rather than a date in year 1', () => {
    const view = buildLearningsView(
      t,
      'en',
      learnings({ updated_at: '0001-01-01T00:00:00Z' }),
    )

    expect(view.lastRefreshedAt).toBeUndefined()
  })
})
