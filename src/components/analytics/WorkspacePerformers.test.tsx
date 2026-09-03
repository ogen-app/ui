import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { t } from '@/test/i18n'
import { WorkspacePerformersView } from './WorkspacePerformers'
import { buildPerformersView } from '@/lib/analyticsPerformersView'
import type { PerformerRow, PerformersBoard } from '@/types/analytics'

/**
 * The board's withdrawals, and the two headings that have to count themselves.
 *
 * The withdrawal set is the overview's, for the same reason: "nothing is
 * switched on", "nothing was published in this window" and "the request failed"
 * send the reader somewhere different, and all three look identical if one of
 * them quietly falls through to another.
 *
 * The headings are pinned separately because they are the one place the card
 * can contradict the server. The lists are clamped and non-overlapping
 * server-side and are routinely different lengths, so a hard-coded "Best 5 /
 * Worst 5" would mislabel four rows on almost every real workspace.
 */

const SETTLED = {
  isPending: false,
  isError: false,
  isUnavailable: false,
  isEmpty: false,
}

function row(n: number, over: Partial<PerformerRow> = {}): PerformerRow {
  return {
    post_id: `p${n}`,
    publisher_post_id: `z${n}`,
    title: `Post ${n}`,
    platform: 'linkedin',
    account: { id: 'a1', username: 'ogendental', display_name: 'ogendental' },
    reach: 1000 * n,
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

function view(best: number, worst: number, total = best + worst) {
  const board: PerformersBoard = {
    window: { from: '2026-07-22', to: '2026-08-19', days: 28 },
    updated_at: '2026-08-19T13:04:00Z',
    by: 'against_typical',
    total_posts: total,
    best: Array.from({ length: best }, (_, i) => row(i + 1)),
    worst: Array.from({ length: worst }, (_, i) => row(100 + i)),
    insights: [],
  }
  return buildPerformersView(t, board)
}

function renderBoard(
  result: Partial<typeof SETTLED> & { view?: ReturnType<typeof view> },
) {
  return render(
    <WorkspacePerformersView
      result={{ ...SETTLED, ...result }}
      by="against_typical"
      onChangeBasis={vi.fn()}
    />,
  )
}

describe('how the board withdraws', () => {
  it('spins only while the answer is genuinely on its way', () => {
    const { container } = renderBoard({ isPending: true })

    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('explains a workspace that is not measuring anything', () => {
    renderBoard({ isUnavailable: true })

    expect(
      screen.getByText(/Nothing is being measured for this workspace/i),
    ).toBeInTheDocument()
  })

  it('tells a window with no posts apart from a fault', () => {
    renderBoard({ isEmpty: true })

    expect(
      screen.getByText(/Nothing to rank in this period/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Couldn't load performers/i)).toBeNull()
  })

  it('says a failed request is a failed request', () => {
    renderBoard({ isError: true })

    expect(screen.getByText(/Couldn't load performers/i)).toBeInTheDocument()
  })

  it('does not spin when the query has settled without a view', () => {
    const { container } = renderBoard({})

    expect(container.querySelector('.animate-pulse')).toBeNull()
    expect(screen.getByText(/Couldn't load performers/i)).toBeInTheDocument()
  })

  it('drops the ranking control in every state that has nothing to rank', () => {
    // A picker over an empty board is a control that teaches people it does
    // nothing.
    renderBoard({ isEmpty: true })

    expect(screen.queryByLabelText(/By/i)).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})

describe('the headings count themselves', () => {
  it('labels uneven ends with their real lengths', () => {
    // Nine posts at limit=5 is Best 5 / Worst 4 — the server fills the best end
    // first and the worst end takes what is left.
    renderBoard({ view: view(5, 4) })

    expect(screen.getByText('Best 5')).toBeInTheDocument()
    expect(screen.getByText('Worst 4')).toBeInTheDocument()
  })

  it('shows one list rather than a worst end of one', () => {
    renderBoard({ view: view(3, 0) })

    expect(screen.getByText('All 3')).toBeInTheDocument()
    expect(screen.queryByText(/^Worst/)).toBeNull()
  })
})

describe('what the board admits it is not showing', () => {
  it('counts the middle the server never sent', () => {
    // Otherwise a reader counting nine rows against twelve posts has to work
    // out the difference themselves — or conclude the count is wrong.
    renderBoard({ view: view(5, 4, 12) })

    expect(screen.getByText(/3 more posts/i)).toBeInTheDocument()
  })

  it('says nothing when the two ends are the whole window', () => {
    renderBoard({ view: view(5, 4) })

    expect(screen.queryByText(/more posts/i)).toBeNull()
  })
})
