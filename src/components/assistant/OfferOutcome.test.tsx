import { fireEvent, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AssistantProposal,
  OfferOutcome as Outcome,
} from '@/types/assistant'
import { OfferOutcome } from './OfferOutcome'

const confirm = vi.fn(async () => {})
const undo = vi.fn(async () => {})

beforeEach(() => {
  confirm.mockClear()
  undo.mockClear()
  useAssistantStore.setState({ confirmProposal: confirm, undo })
})

const retry: AssistantProposal = {
  id: 'pr9',
  tool: 'draftIdeas',
  summary: 'Retry: Draft 2 posts from 2 ideas',
  options: [],
  status: 'pending',
}

function show(outcome: Outcome, proposal?: AssistantProposal) {
  return renderWithProviders(
    <OfferOutcome
      threadId="campaign:c1"
      turnId="t1"
      outcome={outcome}
      retry={proposal}
      undoStates={{}}
      disabled={false}
    />,
  )
}

const partial: Outcome = {
  reoffered: false,
  notMade: [
    {
      id: 'i1',
      title: 'Six rooms · instagram',
      reason: 'the writer timed out',
    },
    { id: 'i2', reason: 'it no longer exists or can’t be changed' },
    { id: 'i3', reason: 'it no longer exists or can’t be changed' },
  ],
  retryProposalId: 'pr9',
}

describe('OfferOutcome', () => {
  it('lists what a run left undone, and RETRY confirms the retry offer', async () => {
    await show(partial, retry)
    expect(screen.getByText('3 not done')).toBeTruthy()
    expect(screen.getByText('Six rooms · instagram')).toBeTruthy()
    expect(screen.getByText('the writer timed out').className).toContain(
      'text-warning',
    )
    // Items the server names no title for are counted under their reason.
    expect(screen.getByText('2 items')).toBeTruthy()
    fireEvent.click(screen.getByText('RETRY'))
    expect(confirm).toHaveBeenCalledWith('campaign:c1', 'pr9')
  })

  it('drops RETRY once the retry offer is answered', async () => {
    await show(partial, { ...retry, status: 'confirmed' })
    expect(screen.queryByText('RETRY')).toBeNull()
  })

  it('draws a tagging with UNDO', async () => {
    await show({
      reoffered: false,
      notMade: [],
      tagged: { count: 14, undoId: 'u1' },
    })
    expect(screen.getByText('14 assets tagged')).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u1')
  })
})

describe('the budget guard’s replace (CON-468)', () => {
  it('says how many drafts were deleted, and how many kept', async () => {
    await show({
      reoffered: false,
      notMade: [],
      replaced: { deleted: 4, kept: 1 },
    })
    expect(screen.getByText('4 weaker drafts deleted for good')).toBeTruthy()
    expect(
      screen.getByText('1 kept: it changed since the offer, or wasn’t needed.'),
    ).toBeTruthy()
    // Deleted for good: nothing to undo.
    expect(screen.queryByText('UNDO')).toBeNull()
  })
})

describe('a replace that deleted nothing', () => {
  it('doesn’t call it deleted', async () => {
    await show({
      reoffered: false,
      notMade: [],
      replaced: { deleted: 0, kept: 2 },
    })
    expect(screen.queryByText('DELETED')).toBeNull()
    expect(screen.getByText('NOTHING DELETED')).toBeTruthy()
    expect(screen.getByText('No drafts deleted')).toBeTruthy()
    expect(
      screen.getByText(
        '2 kept: they changed since the offer, or weren’t needed.',
      ),
    ).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the block', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show(partial, retry)
    expect(screen.getByText('3 sin hacer')).toBeTruthy()
    expect(screen.getByText('REINTENTAR')).toBeTruthy()
    expect(screen.queryByText('RETRY')).toBeNull()
  })
})
