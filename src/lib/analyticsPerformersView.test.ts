import { describe, expect, it } from 'vitest'
import { t } from '@/test/i18n'
import { buildPerformersView } from '@/lib/analyticsPerformersView'
import type {
  PerformerRow,
  PerformerSort,
  PerformersBoard,
} from '@/types/analytics'

/**
 * What the mapper does with `/api/analytics/performers`, and what it refuses to
 * invent.
 *
 * The cases worth arguing with rather than reading off a list: the figure
 * column follows the server's `by` and not a client-side sort, `interactions`
 * has to be summed because the wire sends its three parts, a null multiplier is
 * a state rather than a zero, and the count of what the board is *not* showing
 * is arithmetic the reader cannot do themselves.
 */

function row(over: Partial<PerformerRow> = {}): PerformerRow {
  return {
    post_id: 'p1',
    publisher_post_id: 'z1',
    title: 'A post',
    platform: 'linkedin',
    account: { id: 'a1', username: 'ogendental', display_name: 'ogendental' },
    reach: 1000,
    reach_still_accruing: false,
    period_share: 0.1,
    metrics: {
      impressions: 2000,
      likes: 10,
      comments: 3,
      shares: 2,
      engagement_rate: 0.015,
    },
    against_typical: 1,
    direction: 'typical',
    published_at: '2026-07-29T09:12:00Z',
    age_days: 13,
    ...over,
  }
}

function board(over: Partial<PerformersBoard> = {}): PerformersBoard {
  return {
    window: { from: '2026-07-22', to: '2026-08-19', days: 28 },
    updated_at: '2026-08-19T13:04:00Z',
    by: 'against_typical',
    total_posts: 2,
    best: [row()],
    worst: [row({ post_id: 'p2' })],
    insights: [],
    ...over,
  }
}

function figures(by: PerformerSort, rows: Partial<PerformerRow>[]) {
  const view = buildPerformersView(
    t,
    board({
      by,
      best: rows.map((r, i) => row({ post_id: `p${i}`, ...r })),
      worst: [],
      total_posts: rows.length,
    }),
  )
  return view.best.map((r) => r.figure)
}

describe('the figure column follows the basis the server ranked on', () => {
  it('formats reach as a count', () => {
    expect(figures('reach', [{ reach: 34800 }])).toEqual(['34.8K'])
  })

  it('formats the engagement rate as a percentage', () => {
    expect(
      figures('engagement_rate', [
        { metrics: { ...row().metrics, engagement_rate: 0.021 } },
      ]),
    ).toEqual(['2.1%'])
  })

  it('sums interactions, which the wire sends as three separate parts', () => {
    // There is no `interactions` field on a row — the server ranks on the sum
    // and leaves the client to add it back up.
    expect(
      figures('interactions', [
        { metrics: { ...row().metrics, likes: 420, comments: 63, shares: 28 } },
      ]),
    ).toEqual(['511'])
  })

  it('formats the multiplier with its unit', () => {
    expect(figures('against_typical', [{ against_typical: 3.42 }])).toEqual([
      '3.4×',
    ])
  })

  it('falls back to the default when the server echoes a basis we do not offer', () => {
    const view = buildPerformersView(
      t,
      board({ by: 'invented_later' as PerformerSort }),
    )
    expect(view.by).toBe('against_typical')
  })
})

describe('a missing multiplier is a state, not a zero', () => {
  it('carries the null through rather than reading it as no performance', () => {
    const view = buildPerformersView(
      t,
      board({
        best: [
          row({ against_typical: null, baseline: 'insufficient_history' }),
        ],
        worst: [],
        total_posts: 1,
      }),
    )

    expect(view.best[0].pace).toBeNull()
    // No placement means no bar — a bar at the centre would claim the post is
    // typical, which is the one thing the server said it cannot know.
    expect(view.best[0].placement).toBeNull()
  })

  it('writes a dash rather than 0.0× when the multiplier is the ranked figure', () => {
    expect(figures('against_typical', [{ against_typical: null }])).toEqual([
      '—',
    ])
  })

  it('carries no raw value either, so the row draws no bar rather than one at zero', () => {
    // The bug this pins: substituting 0 put the row at the far left of a bar
    // scaled against the leader's 3.4×, which reads as a post that earned
    // nothing. What the server said is that it cannot be placed.
    const view = buildPerformersView(
      t,
      board({
        by: 'against_typical',
        best: [
          row({ against_typical: 3.4 }),
          row({ post_id: 'p2', against_typical: null }),
        ],
        worst: [],
        total_posts: 2,
      }),
    )

    expect(view.best[1].value).toBeNull()
  })

  it('still shows the raw figure when something else is the basis', () => {
    expect(figures('reach', [{ against_typical: null, reach: 2600 }])).toEqual([
      '2,600',
    ])
  })

  it('keeps the raw value for the fallback bar when the basis has its own unit', () => {
    // Ranked on reach, this row has a reach — it loses its multiplier, not its
    // place in the list, and the bar falls back to a plain rank.
    const view = buildPerformersView(
      t,
      board({
        by: 'reach',
        best: [row({ against_typical: null, reach: 2600 })],
        worst: [],
        total_posts: 1,
      }),
    )

    expect(view.best[0].value).toBe(2600)
  })

  it('counts the unplaceable rows across both lists', () => {
    const view = buildPerformersView(
      t,
      board({
        best: [row({ against_typical: null }), row({ post_id: 'p2' })],
        worst: [row({ post_id: 'p3', against_typical: null })],
        total_posts: 3,
      }),
    )

    expect(view.withoutBaseline).toBe(2)
  })
})

describe('the placement is the server’s verdict, not a threshold of ours', () => {
  it.each([
    ['above', 'ahead'],
    ['below', 'behind'],
    ['typical', 'usual'],
  ] as const)('reads %s as %s', (direction, expected) => {
    const view = buildPerformersView(
      t,
      board({
        best: [row({ direction, against_typical: 1.1 })],
        worst: [],
        total_posts: 1,
      }),
    )
    expect(view.best[0].placement).toBe(expected)
  })

  it('does not second-guess a multiplier the server called typical', () => {
    // 1.3 would be "ahead" under the harness's own 1.25 threshold. The server
    // ran its own config and said otherwise, and its answer is the one drawn.
    const view = buildPerformersView(
      t,
      board({
        best: [row({ direction: 'typical', against_typical: 1.3 })],
        worst: [],
        total_posts: 1,
      }),
    )
    expect(view.best[0].placement).toBe('usual')
  })
})

describe('what the board is not showing', () => {
  it('counts the middle of the distribution the server never sent', () => {
    const view = buildPerformersView(
      t,
      board({
        best: [row(), row({ post_id: 'p2' })],
        worst: [row({ post_id: 'p3' })],
        total_posts: 12,
      }),
    )

    expect(view.hidden).toBe(9)
  })

  it('says nothing is hidden when the two ends are the whole window', () => {
    const view = buildPerformersView(
      t,
      board({ best: [row()], worst: [], total_posts: 1 }),
    )

    expect(view.hidden).toBe(0)
  })

  it('clamps rather than printing a negative when the counts disagree', () => {
    // `total_posts` and the lists are counted separately server-side; "−2 more
    // posts are not shown" is worse than saying nothing.
    const view = buildPerformersView(
      t,
      board({
        best: [row(), row({ post_id: 'p2' })],
        worst: [row({ post_id: 'p3' })],
        total_posts: 1,
      }),
    )

    expect(view.hidden).toBe(0)
  })
})

describe('the row’s supporting line', () => {
  it('marks a young post’s reach as unfinished, not the post', () => {
    const view = buildPerformersView(
      t,
      board({
        best: [row({ reach: 12900, reach_still_accruing: true })],
        worst: [],
        total_posts: 1,
      }),
    )

    expect(view.best[0].reach).toBe('12.9K reached and counting')
  })

  it('names a share worth checking and stays quiet about a sliver', () => {
    const view = buildPerformersView(
      t,
      board({
        best: [row({ period_share: 0.19 })],
        worst: [row({ post_id: 'p2', period_share: 0.004 })],
        total_posts: 2,
      }),
    )

    expect(view.best[0].share).toBe('19% of the period')
    // "0.4% of the period" is a fact about arithmetic, not a finding.
    expect(view.worst[0].share).toBeNull()
  })

  it('falls back through the account label rather than assuming either field', () => {
    const view = buildPerformersView(
      t,
      board({
        best: [row({ account: { id: 'a1', username: 'ogendental' } })],
        worst: [],
        total_posts: 1,
      }),
    )

    expect(view.best[0].account.name).toBe('ogendental')
  })

  it('treats the empty avatar the server sends today as no avatar', () => {
    // An empty `src` is a request for the current page, not a missing image.
    const view = buildPerformersView(
      t,
      board({
        best: [row({ account: { id: 'a1', username: 'x', avatar_url: '' } })],
        worst: [],
        total_posts: 1,
      }),
    )

    expect(view.best[0].account.avatarUrl).toBeUndefined()
  })

  it('writes the date in the active language, as the chart axis above does', () => {
    // Both used to pin en-GB so they would agree with each other; both now read
    // the app's language, so they still do. What must never happen is one of
    // them moving on its own — "Aug 19, 2026" under an axis reading "19 Aug",
    // in one column of one card.
    const view = buildPerformersView(
      t,
      board({
        best: [row({ published_at: '2026-08-19T09:12:00Z' })],
        worst: [],
        total_posts: 1,
      }),
    )

    expect(view.best[0].published).toBe('Aug 19, 2026')
  })

  it('singularises a one-day-old post', () => {
    const view = buildPerformersView(
      t,
      board({
        best: [row({ age_days: 1 }), row({ post_id: 'p2', age_days: 10 })],
        worst: [],
        total_posts: 2,
      }),
    )

    expect(view.best.map((r) => r.age)).toEqual(['1 day', '10 days'])
  })
})

describe('insight tone comes from the rule, not the severity', () => {
  const toneOf = (id: string, severity: 'info' | 'note' = 'info') =>
    buildPerformersView(t, board({ insights: [{ id, severity, text: 'x' }] }))
      .insights[0].tone

  it('does not colour an observation about shape as good or bad news', () => {
    // None of these is a win or a loss — they describe the period, and a tone
    // mark would put a verdict on a description.
    expect(toneOf('rank_divergence')).toBe('neutral')
    expect(toneOf('platform_skew')).toBe('neutral')
    expect(toneOf('spread')).toBe('neutral')
  })

  it('does not read the sample-size caveat as bad news because it is a note', () => {
    // `severity: "note"` is loudness. A thin sample is a caveat about what can
    // be claimed, not a statement that the posts did badly.
    expect(toneOf('sample_size', 'note')).toBe('neutral')
  })

  it('marks the one rule that is genuinely good news', () => {
    expect(toneOf('fresh_standout')).toBe('positive')
  })

  it('falls back to neutral for a rule it has never heard of', () => {
    expect(toneOf('invented_later')).toBe('neutral')
  })
})

describe('the window and its freshness', () => {
  it('names the stretch the server resolved to', () => {
    expect(buildPerformersView(t, board()).period).toEqual({
      label: 'last 28 days',
      from: '2026-07-22',
      to: '2026-08-19',
      days: 28,
    })
  })

  it('treats the Go zero time as no freshness rather than a date in year 1', () => {
    const view = buildPerformersView(
      t,
      board({ updated_at: '0001-01-01T00:00:00Z' }),
    )

    expect(view.lastRefreshedAt).toBeUndefined()
  })
})
