import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
  it('end on the sources slot, named when grounded', () => {
    render(
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
      screen.getByText('Hotel de Russie brochure, Press kit 2026'),
    ).toBeTruthy()
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

  it('are never boxed', () => {
    const { container } = render(
      <ResultCard details={{ platforms: { added: 'Threads' } }} />,
    )
    expect(container.querySelector('.border-quinary-foreground')).toBeNull()
  })
})
