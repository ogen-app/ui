import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AssistantProposal, AssistantTurn } from '@/types/assistant'
import { AssistantReply } from './AssistantReply'

const retry: AssistantProposal = {
  id: 'pr9',
  tool: 'draftIdeas',
  summary: 'Retry: Draft 2 posts from 2 ideas',
  options: [],
  status: 'pending',
}

function reply(answered: AssistantTurn['answered']): AssistantTurn {
  return {
    id: 'a1',
    role: 'assistant',
    content: 'Done in part.',
    proposals: [retry],
    answered,
  }
}

describe('a confirm’s retry offer (CON-467)', () => {
  it('is RETRY under what was left undone, not a card of its own', async () => {
    await renderWithProviders(
      <AssistantReply
        threadId="campaign:c1"
        turn={reply({
          reoffered: false,
          notMade: [{ id: 'i1', title: 'Six rooms', reason: 'timed out' }],
          retryProposalId: 'pr9',
        })}
      />,
    )
    expect(screen.getByText('RETRY')).toBeTruthy()
    expect(screen.queryByText(retry.summary)).toBeNull()
  })

  it('keeps its card when there is no list to put RETRY under', async () => {
    await renderWithProviders(
      <AssistantReply
        threadId="campaign:c1"
        turn={reply({ reoffered: true, notMade: [], retryProposalId: 'pr9' })}
      />,
    )
    expect(screen.queryByText('RETRY')).toBeNull()
    expect(screen.getByText(retry.summary)).toBeTruthy()
    expect(screen.getByText('CONFIRM')).toBeTruthy()
  })
})
