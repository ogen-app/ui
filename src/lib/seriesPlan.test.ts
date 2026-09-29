import { describe, expect, it } from 'vitest'
import type { CampaignSeriesRun } from '@/components/series/types'
import { rhythmClaim, seriesPlan } from './seriesPlan'

/**
 * The mix, which is derived and never typed.
 *
 * These are the arithmetic the Strategy line prints and the per-row counts on
 * the campaign's band, and both read the same function — so a disagreement
 * between the total and its parts would have to be a bug in one place rather
 * than a drift between two.
 */

const JAN = '2026-01-01T00:00:00Z'
/** Four whole weeks, and one calendar month. */
const JAN_END = '2026-01-28T00:00:00Z'

describe('rhythmClaim', () => {
  it('multiplies the rate by the periods the window spans', () => {
    expect(rhythmClaim({ times: 1, per: 'week' }, JAN, JAN_END)).toBe(4)
    expect(rhythmClaim({ times: 2, per: 'week' }, JAN, JAN_END)).toBe(8)
    expect(rhythmClaim({ times: 3, per: 'month' }, JAN, JAN_END)).toBe(3)
  })

  it('compares a weekly series against a monthly goal without a conversion', () => {
    // The point of reusing `GoalCadence`: both sides land on absolute counts
    // over the same dates, so a weekly series in a three-month campaign is
    // directly comparable to a monthly rate.
    const q1 = rhythmClaim(
      { times: 1, per: 'week' },
      JAN,
      '2026-03-31T00:00:00Z',
    )
    expect(q1).toBe(13)
  })

  it('claims nothing when the series is occasional', () => {
    // `null` is a real answer — runs when there is something for it — and is
    // why the model has no `times: 0`.
    expect(rhythmClaim(null, JAN, JAN_END)).toBe(0)
    expect(rhythmClaim({ times: 0, per: 'week' }, JAN, JAN_END)).toBe(0)
  })

  it('counts once for an undated campaign rather than refusing', () => {
    // Matches what the goal does with the same missing dates, which is the
    // only way the two numbers stay comparable.
    expect(rhythmClaim({ times: 3, per: 'week' }, null, null)).toBe(3)
  })
})

describe('seriesPlan', () => {
  const runs: CampaignSeriesRun[] = [
    { seriesId: 'digest', rhythm: { times: 1, per: 'week' } },
    { seriesId: 'profile', rhythm: { times: 2, per: 'month' } },
    { seriesId: 'whenever', rhythm: null },
  ]

  it('reports what is claimed and what is left open', () => {
    const plan = seriesPlan({
      postsPerPeriod: 10,
      cadence: 'month',
      startDate: JAN,
      endDate: JAN_END,
      runs,
    })

    expect(plan.total).toBe(10)
    // 4 from the weekly digest, 2 from the monthly profile, 0 occasional.
    expect(plan.claimed).toBe(6)
    expect(plan.open).toBe(4)
    expect(plan.over).toBe(0)
    expect(plan.dated).toBe(true)
  })

  it('marks an occasional series as claiming nothing rather than zero', () => {
    const plan = seriesPlan({
      postsPerPeriod: 10,
      cadence: 'month',
      startDate: JAN,
      endDate: JAN_END,
      runs,
    })

    expect(plan.lines).toEqual([
      { seriesId: 'digest', posts: 4, occasional: false },
      { seriesId: 'profile', posts: 2, occasional: false },
      { seriesId: 'whenever', posts: 0, occasional: true },
    ])
  })

  it('reports an oversubscribed campaign instead of preventing it', () => {
    // A campaign may genuinely want more series output and then raise its
    // rate. Refusing the rhythm would be the app deciding which of two numbers
    // the user meant.
    const plan = seriesPlan({
      postsPerPeriod: 2,
      cadence: 'month',
      startDate: JAN,
      endDate: JAN_END,
      runs,
    })

    expect(plan.claimed).toBe(6)
    expect(plan.over).toBe(4)
    expect(plan.open).toBe(0)
  })

  it('has no total to measure against when the campaign has no goal', () => {
    // `null`, not zero: a campaign nobody has given a rate to has no plan, and
    // "0 open" would read as a full schedule.
    const plan = seriesPlan({
      postsPerPeriod: null,
      cadence: 'month',
      startDate: JAN,
      endDate: JAN_END,
      runs,
    })

    expect(plan.total).toBeNull()
    expect(plan.open).toBe(0)
    expect(plan.over).toBe(0)
    // Still counted, so the band can list them while Strategy says there is
    // nothing to compare them to.
    expect(plan.claimed).toBe(6)
  })

  it('still adds up without dates, and says the window is unset', () => {
    const plan = seriesPlan({
      postsPerPeriod: 4,
      cadence: 'month',
      startDate: null,
      endDate: null,
      runs,
    })

    expect(plan.dated).toBe(false)
    expect(plan.total).toBe(4)
    expect(plan.claimed).toBe(3)
  })
})
