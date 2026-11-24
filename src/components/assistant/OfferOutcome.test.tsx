import { fireEvent, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AssistantProposal,
  OfferOutcome as Outcome,
  UndoState,
} from '@/types/assistant'
import { OfferOutcome } from './OfferOutcome'

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (id: string) =>
      ({ pl1: { name: 'LinkedIn' }, pl2: { name: 'Instagram' } })[id],
  }),
}))

const confirm = vi.fn(async () => {})
const undo = vi.fn(async () => {})
const send = vi.fn(async () => {})

beforeEach(() => {
  confirm.mockClear()
  undo.mockClear()
  send.mockClear()
  useAssistantStore.setState({ confirmProposal: confirm, undo, send })
})

const retry: AssistantProposal = {
  id: 'pr9',
  tool: 'draftIdeas',
  summary: 'Retry: Draft 3 posts from 3 ideas',
  options: [],
  status: 'pending',
}

function show(
  outcome: Outcome,
  {
    proposal,
    undoStates = {},
    undoRefused,
    retriedTotal,
  }: {
    proposal?: AssistantProposal
    undoStates?: Record<string, UndoState>
    undoRefused?: Record<string, { changed: number; of: number }>
    retriedTotal?: number
  } = {},
) {
  return renderWithProviders(
    <OfferOutcome
      threadId="campaign:c1"
      turnId="t1"
      outcome={outcome}
      retry={proposal}
      retriedTotal={retriedTotal}
      undoStates={undoStates}
      undoRefused={undoRefused}
      disabled={false}
    />,
  )
}

const partial: Outcome = {
  reoffered: false,
  made: 9,
  total: 12,
  notMade: [
    {
      id: 'i1',
      title: 'What the water does in March',
      platform: 'pl1',
      reason: 'the writer timed out',
    },
    { id: 'i2', reason: 'it no longer exists or can’t be changed' },
    { id: 'i3', reason: 'it no longer exists or can’t be changed' },
  ],
  retryProposalId: 'pr9',
}

describe('OfferOutcome (CON-482)', () => {
  it('is PARTLY DONE, X of Y, with the platform on each miss and RETRY N', async () => {
    await show(partial, { proposal: retry })
    expect(screen.getByText('PARTLY DONE')).toBeTruthy()
    expect(screen.getByText('9 of 12 made')).toBeTruthy()
    expect(screen.getByText('NOT MADE · 3')).toBeTruthy()
    expect(
      screen.getByText('LinkedIn · the writer timed out').className,
    ).toContain('text-warning-ink')
    // Items the server names no title for are counted under their reason.
    expect(screen.getByText('2 items')).toBeTruthy()
    fireEvent.click(screen.getByText('Retry 3'))
    expect(confirm).toHaveBeenCalledWith('campaign:c1', 'pr9')
  })

  it('asks again once the retry offer has lapsed', async () => {
    await show(partial, { proposal: { ...retry, status: 'expired' } })
    expect(screen.queryByText('Retry 3')).toBeNull()
    fireEvent.click(screen.getByText('Ask again'))
    expect(send).toHaveBeenCalledWith('campaign:c1', retry.summary)
  })

  it('drops RETRY once the retry offer is answered', async () => {
    await show(partial, { proposal: { ...retry, status: 'confirmed' } })
    expect(screen.queryByText('Retry 3')).toBeNull()
  })

  it('sums a retry that made the rest with the run it retried', async () => {
    await show(
      { reoffered: false, made: 3, total: 3, notMade: [] },
      { retriedTotal: 12 },
    )
    expect(screen.getByText('Retried: 3 not made')).toBeTruthy()
    expect(screen.getByText('All 12 made')).toBeTruthy()
    expect(screen.getByText('3 on retry')).toBeTruthy()
  })
})

const tagged: NonNullable<Outcome['tagged']> = {
  count: 14,
  undoId: 'u1',
  changed: 13,
  add: ['spa'],
  remove: [],
  assets: [
    { id: 'a1', title: 'Villa Aurora brochure', added: ['spa'], removed: [] },
    { id: 'a2', title: 'Spa menu: spring', added: [], removed: [] },
  ],
  more: 12,
}

describe('a tagging', () => {
  it('names the tag and each asset, with UNDO', async () => {
    await show({ reoffered: false, notMade: [], tagged })
    expect(screen.getByText('14 assets tagged “spa”')).toBeTruthy()
    expect(screen.getByText('“spa” added')).toBeTruthy()
    expect(screen.getByText('already as asked')).toBeTruthy()
    expect(screen.getByText('and 12 more')).toBeTruthy()
    fireEvent.click(screen.getByText('Undo'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u1')
  })

  it('says both when a job adds and takes tags away', async () => {
    await show({
      reoffered: false,
      notMade: [],
      tagged: {
        ...tagged,
        add: ['summer'],
        remove: ['winter'],
        assets: [
          {
            id: 'a1',
            title: 'Villa Aurora brochure',
            added: ['summer'],
            removed: ['winter'],
          },
        ],
        more: 0,
      },
    })
    expect(
      screen.getByText('14 assets retagged: “summer” added, “winter” removed'),
    ).toBeTruthy()
    expect(screen.getByText('“summer” added, “winter” removed')).toBeTruthy()
  })

  it('says what UNDO put back', async () => {
    await show(
      { reoffered: false, notMade: [], tagged },
      { undoStates: { u1: 'undone' } },
    )
    expect(
      screen.getByText('Put back: “spa” taken back from the 13 it changed'),
    ).toBeTruthy()
  })

  it('is CAN’T UNDO when tags moved since, saying how many', async () => {
    await show(
      { reoffered: false, notMade: [], tagged },
      {
        undoStates: { u1: 'changed' },
        undoRefused: { u1: { changed: 4, of: 14 } },
      },
    )
    expect(screen.getByText('CAN’T UNDO')).toBeTruthy()
    expect(screen.getByText('4 of 14 retagged since')).toBeTruthy()
    expect(screen.getByText('Open').getAttribute('href')).toBe('/assets')
  })
})

describe('the budget guard’s replace (CON-468)', () => {
  it('says how many drafts were deleted, and how many kept', async () => {
    await show({
      reoffered: false,
      notMade: [],
      replaced: {
        deleted: 4,
        kept: 1,
        draftedCount: 4,
        drafted: [],
        removed: [],
      },
    })
    expect(screen.getByText('4 drafted, 4 weaker drafts removed')).toBeTruthy()
    expect(
      screen.getByText('1 kept: it changed since the offer, or wasn’t needed.'),
    ).toBeTruthy()
    // Deleted for good: nothing to undo.
    expect(screen.queryByText('Undo')).toBeNull()
  })
})

describe('a replace that deleted nothing', () => {
  it('doesn’t call it deleted', async () => {
    await show({
      reoffered: false,
      notMade: [],
      replaced: {
        deleted: 0,
        kept: 2,
        draftedCount: 0,
        drafted: [],
        removed: [],
      },
    })
    expect(screen.queryByText('REPLACED')).toBeNull()
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
    await show(partial, { proposal: retry })
    expect(screen.getByText('9 de 12 hechas')).toBeTruthy()
    expect(screen.getByText('Reintentar 3')).toBeTruthy()
    expect(screen.queryByText('Retry 3')).toBeNull()
  })
})
