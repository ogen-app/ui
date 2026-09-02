import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceLearningsView } from './WorkspaceLearnings'
import { buildLearningsView } from '@/lib/analyticsLearningsView'
import type { AnalyticsLearnings } from '@/types/analytics'

/**
 * The card's withdrawals — all four of the whole card, and three more that only
 * take a section with them.
 *
 * The per-section ones are the reason this card cannot have a single empty
 * state: the heatmap needs measured posts and the curve needs *settled* ones,
 * so a workspace six weeks old routinely has one and not the other, and a card
 * that withdrew as a unit would hide the half it has.
 *
 * The scope note is pinned separately. It is the only thing standing between a
 * standing lesson and a figure someone reads as belonging to the period picker
 * above it.
 */

const SETTLED = {
  isPending: false,
  isError: false,
  isUnavailable: false,
  isEmpty: false,
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
      cells: [
        { day_of_week: 4, hour: 18, score: 1, post_count: 6, median: 12400 },
      ],
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
        { age_hours: 24, share_of_final: 0.6 },
      ],
    },
    patterns: {
      works: [
        {
          id: 'media_format:carousel',
          dimension: 'media_format',
          segment: 'carousel',
          headline: 'Carousels',
          metric: 'saves',
          lift: 1.6,
          support: 18,
          detail: 'Roughly 60% more saves than a typical post.',
        },
      ],
      fading: [],
    },
    ...over,
  }
}

function renderCard(
  result: Partial<typeof SETTLED> & {
    view?: ReturnType<typeof buildLearningsView>
  },
) {
  return render(
    <WorkspaceLearningsView
      result={{ ...SETTLED, ...result }}
      metric="reach"
      onChangeMetric={vi.fn()}
    />,
  )
}

describe('how the card withdraws', () => {
  it('spins only while the answer is genuinely on its way', () => {
    const { container } = renderCard({ isPending: true })

    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('explains a workspace that is not measuring anything', () => {
    renderCard({ isUnavailable: true })

    expect(
      screen.getByText(/Nothing is being measured for this workspace/i),
    ).toBeInTheDocument()
  })

  it('tells a workspace that has never published apart from a fault', () => {
    renderCard({ isEmpty: true })

    expect(screen.getByText(/Nothing published yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/Couldn't load/i)).toBeNull()
  })

  it('says a failed request is a failed request', () => {
    renderCard({ isError: true })

    expect(
      screen.getByText(/Couldn't load what we've learned/i),
    ).toBeInTheDocument()
  })

  it('drops the metric control in every state that has nothing to mine', () => {
    renderCard({ isEmpty: true })

    expect(screen.queryByRole('combobox')).toBeNull()
  })
})

describe('a section withdraws without taking the others with it', () => {
  it('keeps the heatmap when the curve has no settled posts behind it', () => {
    renderCard({
      view: buildLearningsView(
        learnings({ lifespan: { insufficient_history: true } }),
      ),
    })

    expect(
      screen.getByText(/Not enough finished posts yet/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Your strongest slot is/i)).toBeInTheDocument()
    expect(screen.getByText('Carousels')).toBeInTheDocument()
  })

  it('keeps the curve when there are too few slots to draw a week', () => {
    renderCard({
      view: buildLearningsView(
        learnings({ heatmap: { insufficient_history: true } }),
      ),
    })

    expect(screen.getByText(/Not enough posts to say yet/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Half of everything a post earns/i),
    ).toBeInTheDocument()
  })

  it('tells a patterns section with nothing in it from one with no history', () => {
    // Two different sentences, because they need two different responses: wait
    // versus there is nothing to see.
    renderCard({ view: buildLearningsView(learnings({ patterns: {} })) })

    expect(
      screen.getByText(/Nothing has separated itself/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/No habits to compare yet/i)).toBeNull()
  })

  it('says so when the whole patterns section was withdrawn', () => {
    renderCard({
      view: buildLearningsView(
        learnings({ patterns: { insufficient_history: true } }),
      ),
    })

    expect(screen.getByText(/No habits to compare yet/i)).toBeInTheDocument()
  })
})

describe('what the card says about its own scope', () => {
  it('states that the period picker above does not reach it', () => {
    // The whole reason this is a card and not a section of the overview.
    renderCard({ view: buildLearningsView(learnings()) })

    expect(
      screen.getByText(/All time — not affected by the period above/i),
    ).toBeInTheDocument()
  })

  it('says the hours are UTC, because the wire carries no offset', () => {
    renderCard({ view: buildLearningsView(learnings()) })

    expect(screen.getByText(/Times are UTC/i)).toBeInTheDocument()
    expect(screen.getByText(/Thursday 18:00 UTC/)).toBeInTheDocument()
  })

  it('names the sample behind every section', () => {
    renderCard({ view: buildLearningsView(learnings()) })

    expect(screen.getByText(/From 96 measured posts/i)).toBeInTheDocument()
    expect(
      screen.getByText(/From 74 posts that have run their course/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/18 posts/)).toBeInTheDocument()
  })
})
