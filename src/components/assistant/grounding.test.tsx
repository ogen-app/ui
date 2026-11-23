import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import { handleEvent } from '@/stores/eventStreamStore'
import type { AssistantProposal, Grounding } from '@/types/assistant'
import { SourcesLine } from './blocks'
import { ResultCard } from './ResultCard'
import { ProposalCard } from './ProposalCard'
import { AssetsResults } from './AssetsResults'

vi.mock('@/hooks/usePlatforms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/usePlatforms')>()),
  usePlatformCatalog: () => ({
    resolve: (id: string) =>
      id === 'th'
        ? { name: 'Threads', postTypes: [{ slug: 'text-post', label: 'Text' }] }
        : undefined,
  }),
}))

const asset = vi.hoisted(() => ({ data: undefined as unknown }))
vi.mock('@/hooks/useContent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useContent')>()),
  useAsset: () => asset,
}))

const exploratory = (reason?: string, note?: string): Grounding => ({
  mode: 'exploratory',
  sources: [],
  ...(reason ? { reason } : {}),
  ...(note ? { note } : {}),
})

describe('the sources slot (CON-484)', () => {
  it('says why a result isn’t grounded, from the server’s reason', () => {
    render(<SourcesLine grounding={exploratory('none_relevant')} />)
    expect(screen.getByText('Not grounded')).toBeTruthy()
    expect(
      screen.getByText('nothing in the campaign’s documents is about this'),
    ).toBeTruthy()
  })

  it('falls back to the server’s sentence for a reason this build lacks', () => {
    render(<SourcesLine grounding={exploratory('brand_new', 'a new reason')} />)
    expect(screen.getByText('a new reason')).toBeTruthy()
  })
})

describe('a draft from chat', () => {
  it('is DRAFTED, says where and when, and lists each draft with OPEN', async () => {
    await renderWithProviders(
      <ResultCard
        campaignId="c1"
        details={{
          draftedPosts: {
            postCount: 1,
            warnings: [],
            grounding: exploratory('none_relevant'),
            posts: [
              {
                id: 'p1',
                title: 'Why slow travel is back',
                platformId: 'th',
                platform: 'Threads',
                postType: 'text-post',
                date: '2026-04-23',
              },
            ],
          },
        }}
      />,
    )
    expect(screen.getByText('DRAFTED')).toBeTruthy()
    expect(screen.getByText('1 post')).toBeTruthy()
    expect(screen.getByText(/^Threads · Thu/)).toBeTruthy()
    expect(screen.getByText('Threads · Text')).toBeTruthy()
    expect(screen.getByText('Open').getAttribute('href')).toBe(
      '/campaigns/c1/posts/p1',
    )
    // Bug 3: a dated draft is never "not scheduled".
    expect(screen.queryByText(/not scheduled/)).toBeNull()
  })

  it('says not scheduled only when none of them has a day', async () => {
    await renderWithProviders(
      <ResultCard
        details={{
          draftedPosts: {
            postCount: 1,
            warnings: [],
            posts: [
              {
                id: 'p1',
                title: 'A pool',
                platformId: 'th',
                platform: 'Threads',
                postType: 'text-post',
              },
            ],
          },
        }}
      />,
    )
    expect(screen.getByText('Threads · not scheduled')).toBeTruthy()
  })
})

describe('an enriched brief', () => {
  it('is BRIEF, with a row per field it rewrote', async () => {
    await renderWithProviders(
      <ResultCard
        undo={{ states: {}, onUndo: () => {} }}
        details={{
          brief: {
            applied: true,
            undoId: 'u1',
            fields: [
              { field: 'keyMessages', value: 'A house to slow down in.' },
            ],
          },
        }}
      />,
    )
    expect(screen.getByText('BRIEF')).toBeTruthy()
    expect(screen.getByText('Messaging rewritten')).toBeTruthy()
    expect(screen.getByText('1 field')).toBeTruthy()
    expect(screen.getByText('Key messages')).toBeTruthy()
    expect(screen.getByText('A house to slow down in.')).toBeTruthy()
    expect(screen.getByText('Undo')).toBeTruthy()
  })
})

const noSources: AssistantProposal = {
  id: 'pr1',
  tool: 'draftPost',
  summary: 'This campaign has no sources yet',
  status: 'pending',
  recommended: 'add_document',
  options: [
    { id: 'add_document', title: 'Add a document' },
    {
      id: 'import_page',
      title: 'Import a page',
      input: { kind: 'url', label: 'Page link' },
    },
    { id: 'exploratory', title: 'Go ahead without sources' },
  ],
}

describe('a choice that asks for a link', () => {
  const confirm = vi.fn(async () => {})
  beforeEach(() => {
    confirm.mockClear()
    useAssistantStore.setState({ confirmProposal: confirm })
  })

  it('takes the page’s link in the card and sends it with the choice', () => {
    render(<ProposalCard threadId="t" proposal={noSources} disabled={false} />)
    // The option's own button asks for the link; it doesn't run without one.
    fireEvent.click(screen.getByText('Import a page'))
    expect(confirm).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Page link'), {
      target: { value: ' villaaurora.it/spa ' },
    })
    fireEvent.click(screen.getByText('Import'))
    // Typed without its scheme, sent as a page on the web.
    expect(confirm).toHaveBeenCalledWith(
      't',
      'pr1',
      'import_page',
      'https://villaaurora.it/spa',
    )
  })

  it('says a link that isn’t one, and sends nothing', () => {
    render(<ProposalCard threadId="t" proposal={noSources} disabled={false} />)
    fireEvent.change(screen.getByLabelText('Page link'), {
      target: { value: 'not a link' },
    })
    fireEvent.click(screen.getByText('Import'))
    expect(confirm).not.toHaveBeenCalled()
    expect(
      screen.getByText('That doesn’t look like a web address.'),
    ).toBeTruthy()
  })

  it('runs an option without an input on its button', () => {
    render(<ProposalCard threadId="t" proposal={noSources} disabled={false} />)
    fireEvent.click(screen.getByText('Add a document'))
    expect(confirm).toHaveBeenCalledWith('t', 'pr1', 'add_document')
  })

  it('says what the card is waiting for when the server asked', () => {
    render(
      <ProposalCard
        threadId="t"
        proposal={{
          ...noSources,
          error: 'Paste the page’s link to import it.',
        }}
        disabled={false}
      />,
    )
    expect(screen.getByText('Paste the page’s link to import it.')).toBeTruthy()
  })
})

describe('the assets pack’s import and distill', () => {
  const show = (results: Parameters<typeof AssetsResults>[0]['results']) =>
    renderWithProviders(
      <AssetsResults
        threadId="campaign:c1"
        turnId="t1"
        subject={{ kind: 'campaign', campaignId: 'c1' }}
        results={results}
        undoStates={{}}
        disabled={false}
      />,
    )

  it('is IMPORTING while the page is read, from the asset as it is now', async () => {
    asset.data = { status: 'processing', title: 'Spa · Villa Aurora' }
    await show({
      import: {
        assetId: 'a9',
        title: '',
        url: 'https://villaaurora.it/spa/',
        status: 'pending',
        attached: true,
      },
    })
    expect(screen.getByText('IMPORTING')).toBeTruthy()
    expect(screen.getByText('villaaurora.it/spa')).toBeTruthy()
    expect(screen.getByText('Spa · Villa Aurora')).toBeTruthy()
    expect(screen.getByText('analysing').className).toContain(
      'text-warning-ink',
    )
  })

  it('is IMPORTED once the asset is ready', async () => {
    asset.data = { status: 'ready', title: 'Spa · Villa Aurora' }
    await show({
      import: {
        assetId: 'a9',
        title: 'Spa',
        url: 'https://villaaurora.it/spa',
        status: 'processing',
        attached: true,
      },
    })
    expect(screen.getByText('IMPORTED')).toBeTruthy()
    expect(screen.getByText('ready')).toBeTruthy()
  })

  it('says a distill is on its way, with OPEN IDEAS and its sources', async () => {
    await show({
      distill: {
        queued: true,
        grounding: { mode: 'grounded', sources: [{ id: 'a1', title: 'B' }] },
      },
    })
    expect(screen.getByText('More ideas on the way')).toBeTruthy()
    expect(screen.getByText('Open ideas').getAttribute('href')).toBe(
      '/campaigns/c1/ideas',
    )
    expect(screen.getByRole('link', { name: 'B' })).toBeTruthy()
  })
})

describe('an offer made again once its source is read', () => {
  it('reloads the thread it was made in, when this tab has it open', () => {
    const reloadHistory = vi.fn(async () => {})
    useAssistantStore.setState({ reloadHistory })
    act(() => {
      handleEvent({
        id: 'e1',
        topic: 'entity:campaign:c1',
        type: 'assistant.offer.created',
        payload: { scope: { kind: 'campaign', id: 'c1' }, proposalIds: ['p2'] },
        created_at: '',
      })
    })
    expect(reloadHistory).toHaveBeenCalledWith('campaign:c1')
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the reason and the drafted card', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    render(<SourcesLine grounding={exploratory('no_sources')} />)
    expect(
      screen.getByText('aún no hay documentos de los que partir'),
    ).toBeTruthy()
    expect(
      screen.queryByText('there are no documents to draw on yet'),
    ).toBeNull()
  })
})
