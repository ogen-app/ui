import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ResultCard } from './ResultCard'
import { ThinkingTimeline } from './ThinkingTimeline'
import type { AssistantStep } from '@/types/assistant'

/** The approved reply grammar (CON-451), as the rules a reader can see. */

const done: AssistantStep = {
  id: 's',
  kind: 'tool',
  tool: 'listAssets',
  startedAt: 0,
  endedAt: 1000,
}

describe('timing', () => {
  it('leaves nothing behind for a turn under ten seconds', () => {
    const { container } = render(
      <ThinkingTimeline
        steps={[done]}
        streaming={false}
        startedAt={0}
        endedAt={4000}
      />,
    )
    expect(container.textContent).toBe('')
  })

  it('leaves one collapsed line for a longer one', () => {
    render(
      <ThinkingTimeline
        steps={[done]}
        streaming={false}
        startedAt={0}
        endedAt={21000}
      />,
    )
    expect(screen.getByText('Worked for 21s')).toBeTruthy()
    expect(screen.queryByText('Listed attached assets')).toBeNull()
  })

  it('shows its steps while it runs', () => {
    render(
      <ThinkingTimeline
        steps={[{ ...done, endedAt: null }]}
        streaming
        startedAt={performance.now()}
        endedAt={null}
      />,
    )
    expect(screen.getByText('Listing attached assets')).toBeTruthy()
  })
})

describe('results', () => {
  it('end on the sources slot, named when grounded, each linking its asset', async () => {
    await renderWithProviders(
      <ResultCard
        details={{
          contentPlan: {
            ideaCount: 12,
            warnings: [],
            grounding: {
              mode: 'grounded',
              sources: [
                { id: 'a1', title: 'Hotel de Russie brochure' },
                { id: 'a2', title: 'Press kit 2026' },
              ],
            },
          },
        }}
      />,
    )
    expect(screen.getByText('DONE')).toBeTruthy()
    expect(screen.getByText('+12 ideas on the Ideas tab')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Hotel de Russie brochure' })
        .getAttribute('href'),
    ).toBe('/assets/a1')
    expect(
      screen.getByRole('link', { name: 'Press kit 2026' }).getAttribute('href'),
    ).toBe('/assets/a2')
  })

  it('name an asset once, however many ideas it came through', async () => {
    await renderWithProviders(
      <ResultCard
        details={{
          contentPlan: {
            ideaCount: 2,
            warnings: [],
            grounding: {
              mode: 'grounded',
              sources: [
                { id: 'a1', title: 'Brochure', ideaId: 'i1' },
                { id: 'a1', title: 'Brochure', ideaId: 'i2' },
              ],
            },
          },
        }}
      />,
    )
    expect(screen.getAllByRole('link', { name: 'Brochure' })).toHaveLength(1)
  })

  it('say "Not grounded" in the same slot when they are not', () => {
    render(
      <ResultCard
        details={{
          generatedPosts: {
            ideaCount: 1,
            warnings: [],
            grounding: { mode: 'exploratory', sources: [] },
          },
        }}
      />,
    )
    expect(screen.getByText('Not grounded')).toBeTruthy()
  })

  it('name the documents a draft drew on, and say nothing when none are named', async () => {
    const { unmount } = await renderWithProviders(
      <ResultCard
        details={{
          draftedPosts: {
            postCount: 2,
            warnings: [],
            grounding: {
              mode: 'grounded',
              sources: [{ id: 'a1', title: 'Press kit 2026' }],
            },
          },
        }}
      />,
    )
    expect(screen.getByText('Press kit 2026')).toBeTruthy()
    unmount()
    render(
      <ResultCard details={{ draftedPosts: { postCount: 2, warnings: [] } }} />,
    )
    expect(screen.queryByText('Not grounded')).toBeNull()
  })

  it('say what a platforms change added and removed (CON-468)', () => {
    render(
      <ResultCard
        details={{
          platforms: {
            added: 'Threads',
            removed: 'the carousel post type on LinkedIn',
          },
        }}
      />,
    )
    expect(
      screen.getByText(
        'added Threads · removed the carousel post type on LinkedIn',
      ),
    ).toBeTruthy()
  })

  it('say a raised goal as its rate, with the campaign’s total', () => {
    render(
      <ResultCard
        details={{
          goal: { perPeriod: 32, cadence: 'month', target: 96, undoId: 'u1' },
        }}
        undo={{ states: {}, onUndo: () => {} }}
      />,
    )
    expect(screen.getByText('Goal raised to 32 posts a month')).toBeTruthy()
    expect(screen.getByText('96 in all')).toBeTruthy()
    expect(screen.getByText('UNDO')).toBeTruthy()
  })

  it('are never boxed', () => {
    const { container } = render(
      <ResultCard details={{ platforms: { added: 'Threads' } }} />,
    )
    expect(container.querySelector('.border-quinary-foreground')).toBeNull()
  })
})
