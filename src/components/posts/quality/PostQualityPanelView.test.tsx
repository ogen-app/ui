import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  PostEvaluation,
  QualityDimension,
  QualityDimensionKey,
  QualitySuggestion,
} from '@/types/quality'
import { reasonRowId } from '@/lib/postQuality'
import { PostQualityPanelView } from './PostQualityPanelView'
import { QualityInlineSummary } from './QualityInlineSummary'

// jsdom has no layout; the corner click scrolls its verdict into view.
Element.prototype.scrollIntoView = () => {}

function suggestion(
  dimension: QualityDimensionKey,
  severity: QualitySuggestion['severity'],
  advice: string,
): QualitySuggestion {
  return { dimension, severity, advice, span: `Span for ${advice}` }
}

function dimension(
  score: number,
  weight: number,
  suggestions: QualitySuggestion[] | null = null,
): QualityDimension {
  return {
    score,
    verdict: `Verdict at ${score}.`,
    suggestions,
    weight,
    contribution: score * weight * 10,
  }
}

function evaluation(overrides: Partial<PostEvaluation> = {}): PostEvaluation {
  return {
    id: 'e1',
    post_id: 'p1',
    platform_id: 'li',
    platform_post_type: 'text-post',
    caption_scoped: false,
    overall_pct: 63,
    result: {
      correctness: dimension(6, 0.2, [
        suggestion('correctness', 'medium', 'Source the figure.'),
      ]),
      clarity: dimension(7, 0.2, [
        suggestion('clarity', 'low', 'Lead with one argument.'),
      ]),
      engagement: dimension(7, 0.35, null),
      delivery: dimension(5, 0.25, [
        suggestion('delivery', 'high', 'Remove the internal tag.'),
      ]),
    },
    model_id: 'm',
    input_hash: 'h',
    created_at: '2026-11-02T10:00:00Z',
    updated_at: '2026-11-02T10:00:00Z',
    ...overrides,
  }
}

function renderPanel(
  props: Partial<Parameters<typeof PostQualityPanelView>[0]> = {},
) {
  return render(
    <PostQualityPanelView
      assessment={evaluation()}
      platformName="LinkedIn"
      loading={false}
      unavailable={false}
      loadError={null}
      onReload={vi.fn()}
      onAssess={vi.fn()}
      assessing={false}
      steps={[]}
      cached={false}
      assessError={null}
      {...props}
    />,
  )
}

describe('PostQualityPanelView', () => {
  it('states the band in words and explains the weighting', () => {
    renderPanel()
    expect(screen.getByText('63')).toBeInTheDocument()
    expect(screen.getByText('Workable')).toBeInTheDocument()
    expect(
      screen.getByText('Engagement weighs most for this format.'),
    ).toBeInTheDocument()
  })

  it('names every score and the lowest in the radar’s accessible name', () => {
    renderPanel()
    expect(
      screen.getByRole('img', {
        name: 'Accuracy 6, Clarity 7, Engagement 7, and Channel fit 5. Channel fit is lowest.',
      }),
    ).toBeInTheDocument()
  })

  it('lists every suggestion in one list, most severe first', () => {
    renderPanel()
    const list = screen
      .getByRole('heading', { name: /Fix first/ })
      .closest('section')!
    const advice = within(list)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('p:last-child')?.textContent)
    expect(advice).toEqual([
      'Remove the internal tag.',
      'Source the figure.',
      'Lead with one argument.',
    ])
  })

  it('opens and closes the radar guide, returning focus to the button', async () => {
    renderPanel()
    const button = screen.getByRole('button', { name: 'How to read the radar' })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(button)
    const dialog = screen.getByRole('dialog', { name: 'Reading the radar' })
    expect(within(dialog).getByText('Rings at 5 and 8')).toBeInTheDocument()
    expect(
      within(dialog).getByText('Left: the writing. Right: fit for LinkedIn.'),
    ).toBeInTheDocument()
    // Radix moves focus into the pop-over, onto its first control.
    expect(dialog).toContainElement(document.activeElement as HTMLElement)

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('closes the guide on a click outside it', async () => {
    renderPanel()
    await userEvent.click(
      screen.getByRole('button', { name: 'How to read the radar' }),
    )
    await userEvent.click(screen.getByText('Workable'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('takes a radar corner to its dimension’s verdict', async () => {
    renderPanel()
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Channel fit: 5 out of 10. Show why.',
      }),
    )
    const row = document.getElementById(reasonRowId('delivery'))!
    expect(row).toHaveFocus()
    expect(within(row).getByText('Verdict at 5.')).toBeInTheDocument()
  })

  it('draws no comparison without a previous run', () => {
    renderPanel()
    expect(screen.queryByText('Before your edits')).not.toBeInTheDocument()
    expect(screen.queryByText(/before your edits/)).not.toBeInTheDocument()
  })

  it('compares against the run it replaced', () => {
    const previous = evaluation({
      overall_pct: 58,
      updated_at: '2026-11-01T10:00:00Z',
    })
    previous.result.delivery = dimension(3, 0.25)
    renderPanel({ previous })
    expect(screen.getByText('Before your edits')).toBeInTheDocument()
    expect(screen.getByText(/Up from/)).toHaveTextContent(
      'Up from 58 before your edits',
    )
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('reads an empty suggestion list without failing', () => {
    const quiet = evaluation()
    for (const key of [
      'correctness',
      'clarity',
      'engagement',
      'delivery',
    ] as const) {
      quiet.result[key] = { ...quiet.result[key], suggestions: null }
    }
    renderPanel({ assessment: quiet })
    expect(screen.getByText('No suggestions on this run.')).toBeInTheDocument()
  })

  it('keeps the server’s staleness badge', () => {
    renderPanel({
      assessment: evaluation({ stale: true, stale_reason: 'content' }),
    })
    expect(screen.getByText('May be outdated')).toBeInTheDocument()
  })

  // CON-443: the model wraps the phrase that matters in `**…**`.
  it('sets the marked phrase in semibold and strips the markers', () => {
    const marked = evaluation()
    marked.result.delivery = {
      ...marked.result.delivery,
      verdict: 'Facts hold, but **the hashtags read as LinkedIn**.',
      suggestions: [
        {
          dimension: 'delivery',
          severity: 'high',
          span: '#bees',
          advice: 'Five tags is a lot, so **keep one topic tag**.',
        },
      ],
    }
    renderPanel({ assessment: marked })
    const strong = screen.getByText('keep one topic tag')
    expect(strong.tagName).toBe('STRONG')
    expect(strong).toHaveClass('font-semibold')
    expect(screen.getByText('the hashtags read as LinkedIn').tagName).toBe(
      'STRONG',
    )
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument()
  })

  it('leads Why these scores with its icon', () => {
    renderPanel()
    const heading = screen.getByRole('heading', { name: 'Why these scores' })
    expect(heading.querySelector('svg')).not.toBeNull()
  })
})

// CON-441: the list chooses which span the post shows at full strength.
describe('PostQualityPanelView with highlights', () => {
  function renderHighlighted(
    highlight: Partial<
      NonNullable<Parameters<typeof PostQualityPanelView>[0]['highlight']>
    > = {},
  ) {
    const onToggle = vi.fn()
    renderPanel({
      highlight: {
        statuses: ['marked', 'marked', 'marked'],
        chosen: null,
        onToggle,
        ...highlight,
      },
    })
    return onToggle
  }

  it('makes each quote and its advice one toggle', async () => {
    const onToggle = renderHighlighted()
    const button = screen.getByRole('button', {
      name: /Span for Source the figure\..*Source the figure\./,
    })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    // Second in the list: high first, then medium.
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('fills the chosen row’s tag and announces its span', () => {
    renderHighlighted({ chosen: 0 })
    const button = screen.getByRole('button', { pressed: true })
    const row = button.closest('li')!
    expect(row).toHaveAttribute('data-chosen')
    expect(within(row).getByText('High')).toHaveClass('bg-destructive')
    expect(
      screen.getByText(
        'Highlighted in the post: Span for Remove the internal tag.',
      ),
    ).toBeInTheDocument()
  })

  it('says Edited once a span has changed', () => {
    renderHighlighted({ statuses: ['edited', 'marked', 'marked'] })
    const row = screen
      .getByRole('button', { name: /Remove the internal tag/ })
      .closest('li')!
    expect(within(row).getByText('Edited')).toBeInTheDocument()
    expect(screen.getAllByText('Edited')).toHaveLength(1)
  })

  it('names a whole-post suggestion instead of quoting it', () => {
    renderHighlighted({ statuses: ['whole', 'marked', 'marked'] })
    expect(screen.getByText('The whole post')).toBeInTheDocument()
    expect(screen.getByText('· not marked in the text')).toBeInTheDocument()
    expect(
      screen.queryByText('Span for Remove the internal tag.'),
    ).not.toBeInTheDocument()
  })

  it('keeps plain rows without an editor beside the panel', () => {
    renderPanel()
    expect(
      screen.queryByRole('button', { name: /Remove the internal tag/ }),
    ).not.toBeInTheDocument()
  })
})

describe('QualityInlineSummary', () => {
  it('counts the suggestions instead of quoting them', () => {
    render(
      <QualityInlineSummary assessment={evaluation()} onOpenPanel={vi.fn()} />,
    )
    expect(
      screen.getByText('3 suggestions, 1 of them high.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Fix first')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Remove the internal tag.'),
    ).not.toBeInTheDocument()
  })
})
