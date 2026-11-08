import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
})
