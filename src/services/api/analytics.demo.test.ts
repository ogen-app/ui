import { afterEach, describe, expect, it } from 'vitest'
import {
  demoLearnings,
  demoMode,
  demoOverview,
  demoPerformers,
  setDemoMode,
} from './analytics.demo'
import { fetchAnalyticsOverview } from './analytics'
import { buildNowView } from '@/lib/analyticsOverviewView'
import { buildPerformersView } from '@/lib/analyticsPerformersView'
import { buildLearningsView } from '@/lib/analyticsLearningsView'

/**
 * That the simulated payloads are the shape the endpoints send.
 *
 * The point of the demo is to look at the dashboard, so the thing worth
 * asserting is not the numbers but that they survive the *real* mappers — the
 * same three the cards use against the server. A fixture that only satisfies
 * TypeScript would still let the demo drift into a payload the wire could never
 * produce, and the first person to notice would be whoever wires up the real
 * endpoint and finds the card was never tested against it.
 *
 * These run with `DEV_TOOLS` on, because vitest runs in dev mode — which is the
 * only mode where any of this exists at all.
 */

const NOW = new Date('2026-09-02T14:00:00Z')

afterEach(() => setDemoMode('live'))

describe('the mode is off unless it is asked for', () => {
  it('serves the API by default', () => {
    expect(demoMode()).toBe('live')
  })

  it('leaves the real request path alone while it is off', async () => {
    // No fetch is stubbed here: reaching the network at all is the assertion,
    // because a demo that engaged by default would silently replace every
    // dashboard read in dev.
    await expect(fetchAnalyticsOverview({ window: '7d' })).rejects.toBeDefined()
  })
})

describe('the overview payload', () => {
  it('goes through the card’s own mapper', async () => {
    setDemoMode('demo')
    const envelope = await demoOverview({ window: '28d' }, NOW)
    const view = buildNowView(envelope.data!)

    expect(view.period).toMatchObject({ days: 28, to: '2026-09-02' })
    // Five cards, five series, and the headline first — `readings[0]` is reach
    // by the mapper's own convention.
    expect(view.readings).toHaveLength(5)
    expect(view.readings[0].measure).toBe('reach')
    expect(view.readings[0].series).toHaveLength(28)
  })

  it('resolves the window the way the server does, today included', async () => {
    setDemoMode('demo')
    const envelope = await demoOverview({ window: '7d' }, NOW)

    // Seven days ending today means six days back, not seven.
    expect(envelope.data!.window).toMatchObject({
      from: '2026-08-27',
      to: '2026-09-02',
      days: 7,
    })
  })

  it('sends the flows cumulatively, as the wire does', async () => {
    setDemoMode('demo')
    const reach = (await demoOverview({ window: '28d' }, NOW)).data!.series
      .reach

    // The mapper differences these back per bucket; handing it a per-bucket
    // series would draw the sum of a sum.
    expect(
      reach.current.every((v, i) => i === 0 || v >= reach.current[i - 1]),
    ).toBe(true)
  })

  it('is the same workspace on every read', async () => {
    setDemoMode('demo')
    const first = await demoOverview({ window: '28d' }, NOW)
    const second = await demoOverview({ window: '28d' }, NOW)

    expect(second.data).toEqual(first.data)
  })
})

describe('the performers payload', () => {
  it('goes through the board’s own mapper', async () => {
    setDemoMode('demo')
    const envelope = await demoPerformers({ window: '28d' }, NOW)
    const view = buildPerformersView(envelope.data!)

    expect(view.best.length).toBeGreaterThan(0)
    expect(view.worst.length).toBeGreaterThan(0)
    // The two ends never overlap — the middle is simply not sent.
    const ids = [...view.best, ...view.worst].map((row) => row.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('agrees with the overview about the period', async () => {
    setDemoMode('demo')
    const overview = await demoOverview({ window: '28d' }, NOW)
    const board = await demoPerformers({ window: '28d' }, NOW)
    const published = overview.data!.cards.find(
      (c) => c.metric === 'posts_published',
    )

    // Three cards that disagreed about the same month would make the demo
    // useless for reading the page as a page.
    expect(board.data!.total_posts).toBe(published!.value)
    expect(board.data!.window).toEqual(overview.data!.window)
  })

  it('includes rows the server could not place against a typical', async () => {
    setDemoMode('demo')
    const view = buildPerformersView(
      (await demoPerformers({ window: '28d' }, NOW)).data!,
    )

    // The state the board draws with no bar rather than a bar at zero — worth
    // seeing, and only seen if the demo produces one.
    expect(view.withoutBaseline).toBeGreaterThan(0)
  })

  it('re-ranks rather than re-sorting when the basis changes', async () => {
    setDemoMode('demo')
    const byTypical = await demoPerformers(
      { window: '28d', by: 'against_typical' },
      NOW,
    )
    const byReach = await demoPerformers({ window: '28d', by: 'reach' }, NOW)

    expect(byReach.data!.by).toBe('reach')
    expect(byReach.data!.best.map((r) => r.post_id)).not.toEqual(
      byTypical.data!.best.map((r) => r.post_id),
    )
  })
})

describe('the learnings payload', () => {
  it('goes through the card’s own mapper', async () => {
    setDemoMode('demo')
    const view = buildLearningsView((await demoLearnings({}, NOW)).data!)

    expect(view.heatmap?.strongest).toEqual({
      label: 'Thursday 18:00 UTC',
      postCount: 6,
    })
    expect(view.lifespan?.half).toBe('19h')
    expect(view.patterns?.works.length).toBeGreaterThan(0)
    expect(view.patterns?.fading.length).toBeGreaterThan(0)
  })

  it('sends a sparse grid, which is the case the mapper exists for', async () => {
    setDemoMode('demo')
    const grid = buildLearningsView((await demoLearnings({}, NOW)).data!)
      .heatmap!.grid

    const filled = grid.flat().filter(Boolean).length
    expect(filled).toBeGreaterThan(0)
    // Most of the week is blank, and has to stay blank rather than becoming a
    // field of zeroes.
    expect(filled).toBeLessThan(7 * 24)
  })

  it('puts the milestones exactly where t50/t75/t95 say they are', async () => {
    setDemoMode('demo')
    const lifespan = (await demoLearnings({}, NOW)).data!.lifespan
    const curve = 'curve' in lifespan ? lifespan.curve : []

    // The curve is `1 − 0.5^(t/19)`, so the three scalars are not merely near
    // their points on it.
    const at = (hours: number) =>
      curve.find((p) => p.age_hours === hours)?.share_of_final
    expect(at(24)).toBeCloseTo(0.583, 2)
    expect(at(0)).toBe(0)
  })

  it('cannot have settled more posts than it measured', async () => {
    setDemoMode('demo')
    const { scope } = (await demoLearnings({}, NOW)).data!

    // The two counts sit four lines apart on the same card — "62 measured
    // posts" above "74 posts that have run their course" reads as a bug in the
    // card rather than in the seed behind it.
    expect(scope.settled_posts).toBeLessThan(scope.measured_posts)
  })

  it('moves the figures when the metric picker does', async () => {
    setDemoMode('demo')
    const reach = (await demoLearnings({ metric: 'reach' }, NOW)).data!
    const saves = (await demoLearnings({ metric: 'saves' }, NOW)).data!

    expect(saves.scope.metric).toBe('saves')
    // A picker that changed a label and no numbers reads as a control that does
    // nothing.
    const median = (payload: typeof reach) =>
      'cells' in payload.heatmap ? payload.heatmap.cells[0].median : 0
    expect(median(saves)).toBeLessThan(median(reach))
  })
})

describe('the two ways of having nothing to show', () => {
  it('answers `no_data` for a workspace that has published nothing', async () => {
    setDemoMode('empty')
    const envelope = await demoOverview({ window: '28d' }, NOW)

    expect(envelope).toMatchObject({
      available: false,
      reason: 'no_data',
      data: null,
    })
  })

  it('answers with a setup reason when measurement is not connected', async () => {
    setDemoMode('unavailable')
    const envelope = await demoLearnings({}, NOW)

    // The cards tell these apart — one is a state to explain, the other is a
    // workspace waiting on its first post — so the demo has to produce both.
    expect(envelope.available).toBe(false)
    expect(envelope.reason).not.toBe('no_data')
  })
})
