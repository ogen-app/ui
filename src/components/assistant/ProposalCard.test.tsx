import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import { ProposalCard } from './ProposalCard'
import type { AssistantProposal } from '@/types/assistant'

const base: AssistantProposal = {
  id: 'pr1',
  tool: 'draftIdeas',
  summary: 'Draft 2 posts from 3 ideas',
  options: [],
  status: 'pending',
}

describe('ProposalCard', () => {
  it('boxes a waiting offer with one confirm', () => {
    const confirm = vi.fn(async () => {})
    useAssistantStore.setState({ confirmProposal: confirm })
    render(<ProposalCard threadId="t" proposal={base} disabled={false} />)
    expect(screen.getByText('PROPOSAL')).toBeTruthy()
    fireEvent.click(screen.getByText('CONFIRM'))
    expect(confirm).toHaveBeenCalledWith('t', 'pr1')
  })

  it('names each option as its button, and confirms the one picked', () => {
    const confirm = vi.fn(async () => {})
    useAssistantStore.setState({ confirmProposal: confirm })
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          summary: 'That makes 18 April posts, not 10',
          options: [
            { id: 'add2', title: 'Add 2 posts to reach the goal' },
            { id: 'ideas', title: 'Save 10 as ideas instead' },
          ],
        }}
      />,
    )
    expect(screen.getByText('CHOOSE ONE')).toBeTruthy()
    fireEvent.click(screen.getByText('Save 10 as ideas instead'))
    expect(confirm).toHaveBeenCalledWith('t', 'pr1', 'ideas')
  })

  it('leads with the option the server recommends, saying why (CON-482)', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          summary: 'Thursday already has 3 posts',
          options: [
            {
              id: 'friday',
              title: 'Move it to Friday',
              why: 'Friday is empty.',
            },
            {
              id: 'anyway',
              title: 'Add it anyway',
              description: 'Four on one day.',
            },
          ],
          recommended: 'friday',
        }}
      />,
    )
    expect(screen.getAllByText('RECOMMENDED')).toHaveLength(1)
    const lead = screen.getByText('Move it to Friday')
    const other = screen.getByText('Add it anyway')
    // The lead is the dark button; the rest are outlined.
    expect(lead.className).not.toBe(other.className)
    expect(screen.getByText('Friday is empty.')).toBeTruthy()
    expect(screen.getByText('Four on one day.')).toBeTruthy()
  })

  it('weighs every option alike without a recommendation', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          options: [
            { id: 'a', title: 'Rewrite the tone line' },
            { id: 'b', title: 'Pick the Host voice' },
          ],
        }}
      />,
    )
    expect(screen.queryByText('RECOMMENDED')).toBeNull()
    const a = screen.getByText('Rewrite the tone line')
    const b = screen.getByText('Pick the Host voice')
    expect(a.className).toBe(b.className)
  })

  it('says what was chosen once answered', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          status: 'confirmed',
          chosen: 'friday',
          options: [{ id: 'friday', title: 'Move it to Friday' }],
        }}
      />,
    )
    expect(screen.getByText('Chose: Move it to Friday')).toBeTruthy()
    expect(screen.getByText('Checked again — nothing changed')).toBeTruthy()
  })

  it('says a yes ran nothing because the offer went stale, with what changed and the fresh offer under it', () => {
    const fresh: AssistantProposal = {
      ...base,
      id: 'pr2',
      summary: 'Move 2 posts instead',
      replaces: 'pr1',
    }
    useAssistantStore.setState({
      threads: {
        t: {
          id: 't',
          subject: { kind: 'workspace' },
          title: '',
          campaignTitle: '',
          turns: [
            { id: 'a2', role: 'assistant', content: '', proposals: [fresh] },
          ],
          status: 'idle',
          runStartedAt: null,
          lastActiveAt: null,
          unread: false,
          loaded: true,
          streamedPosts: [],
        },
      },
    })
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          status: 'stale',
          reasons: ['“Wedding packages” was deleted'],
          replacedBy: 'pr2',
        }}
      />,
    )
    expect(screen.getByText('NOTHING RAN')).toBeTruthy()
    expect(screen.getByText('“Wedding packages” was deleted')).toBeTruthy()
    expect(screen.getByText('FRESH OFFER')).toBeTruthy()
    expect(screen.getByText('Move 2 posts instead')).toBeTruthy()
  })

  it('is EXPIRED with ASK AGAIN once lapsed, even while open', () => {
    const send = vi.fn(async () => {})
    useAssistantStore.setState({ send })
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{ ...base, expiresAt: '2020-01-01T00:00:00Z' }}
      />,
    )
    expect(screen.getByText('EXPIRED')).toBeTruthy()
    expect(screen.queryByText('CONFIRM')).toBeNull()
    fireEvent.click(screen.getByText('ASK AGAIN'))
    expect(send).toHaveBeenCalledWith('t', base.summary)
  })

  it('draws a line that ran nothing without a tick', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{ ...base, status: 'dismissed' }}
      />,
    )
    const line = screen.getByText('Draft 2 posts from 3 ideas · dismissed')
    expect(line.parentElement?.querySelector('svg')).toBeNull()
  })

  it('collapses to one line once answered', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{ ...base, status: 'confirmed' }}
      />,
    )
    expect(
      screen.getByText('Draft 2 posts from 3 ideas · confirmed'),
    ).toBeTruthy()
    expect(screen.queryByText('CONFIRM')).toBeNull()
  })

  it('shows what an offer draws on and makes, and names its confirm (CON-476)', async () => {
    const confirm = vi.fn(async () => {})
    const send = vi.fn(async () => {})
    useAssistantStore.setState({ confirmProposal: confirm, send })
    await renderWithProviders(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          tool: 'createCampaignFromAssets',
          summary: 'New campaign',
          card: {
            verb: 'Create campaign',
            meta: 'from 4 assets',
            rows: [
              { kind: 'type', value: 'Launch' },
              {
                kind: 'dates',
                value: '2 Mar – 26 Apr 2026',
                note: 'Around the 14 March opening, from the brochure',
                start: '2026-03-02',
                end: '2026-04-26',
              },
              { kind: 'grounding', value: 'Not grounded in an asset' },
            ],
            sources: [
              { id: 'a1', title: 'Villa Aurora brochure', type: 'PDF' },
            ],
            footnote: 'The 4 become its sources.',
            widen: {
              note: 'Draws on the open asset only.',
              label: 'Use the campaign’s 6 assets',
              instruction: 'Use all the campaign’s assets.',
            },
          },
        }}
      />,
    )
    expect(screen.getByText('from 4 assets')).toBeTruthy()
    expect(screen.getByText('Launch')).toBeTruthy()
    expect(screen.getByText('Type')).toBeTruthy()
    // The dates are formatted here, from the days; the reason sits under them.
    expect(screen.getByText('Mar 2 – Apr 26')).toBeTruthy()
    expect(
      screen.getByText('Around the 14 March opening, from the brochure'),
    ).toBeTruthy()
    expect(screen.getByText('Not grounded in an asset')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'PDF' })).toBeTruthy()
    expect(screen.getByText('Villa Aurora brochure')).toBeTruthy()
    expect(screen.getByText('The 4 become its sources.')).toBeTruthy()
    fireEvent.click(screen.getByText('Use the campaign’s 6 assets'))
    expect(send).toHaveBeenCalledWith('t', 'Use all the campaign’s assets.')
    expect(screen.queryByText('CONFIRM')).toBeNull()
    fireEvent.click(screen.getByText('Create campaign'))
    expect(confirm).toHaveBeenCalledWith('t', 'pr1')
  })

  it('says when an offer was confirmed', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          status: 'confirmed',
          answeredAt: new Date(2026, 10, 13, 15, 12).toISOString(),
        }}
      />,
    )
    expect(
      screen.getByText('Draft 2 posts from 3 ideas · confirmed 3:12 PM'),
    ).toBeTruthy()
  })

  it('shows the trail a "more like these" offer would follow (CON-479)', async () => {
    await renderWithProviders(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          tool: 'moreLikeThese',
          summary: 'Plan 4 ideas like these',
          card: {
            rows: [],
            sources: [],
            trail: [
              {
                postId: 'p1',
                title: 'The thermal pool at dusk',
                rate: 0.052,
                ideas: [
                  {
                    id: 'i1',
                    title: 'The pool cut into the rock',
                    passages: [],
                  },
                ],
                assets: [],
                noTrail: false,
              },
            ],
          },
        }}
      />,
    )
    expect(screen.getByText('The thermal pool at dusk')).toBeTruthy()
    expect(screen.getByText('The pool cut into the rock')).toBeTruthy()
  })
})
