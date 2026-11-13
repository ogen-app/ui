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

  it('offers each option, and confirms the one picked', () => {
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
    fireEvent.click(screen.getAllByText('CHOOSE')[1])
    expect(confirm).toHaveBeenCalledWith('t', 'pr1', 'ideas')
  })

  it('leads with the option the server recommends (CON-467)', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          summary: 'Thursday already has 3 posts',
          options: [
            { id: 'friday', title: 'Move it to Friday' },
            { id: 'anyway', title: 'Add it anyway' },
          ],
          recommended: 'friday',
        }}
      />,
    )
    expect(screen.getAllByText('RECOMMENDED')).toHaveLength(1)
    const [lead, other] = screen.getAllByText('CHOOSE')
    expect(lead.closest('li')?.textContent).toContain('Move it to Friday')
    // The lead is the dark button; the rest are text actions.
    expect(lead.className).not.toBe(other.className)
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
    const [a, b] = screen.getAllByText('CHOOSE')
    expect(a.className).toBe(b.className)
  })

  it('says a confirm ran nothing because the offer went stale', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          ...base,
          status: 'stale',
          error: 'the ideas were deleted',
        }}
      />,
    )
    expect(
      screen.getByText(
        'Draft 2 posts from 3 ideas · changed since, nothing ran',
      ),
    ).toBeTruthy()
    expect(screen.getByText('the ideas were deleted')).toBeTruthy()
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
})
