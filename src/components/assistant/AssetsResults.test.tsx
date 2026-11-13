import { fireEvent, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { QueryWrapper } from '@/test/queryWrapper'
import { setUiActionApplier, useAssistantStore } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'
import type { AssetsResults as Results, ThreadSubject } from '@/types/assistant'
import { AssetsResults } from './AssetsResults'
import { StarterChips } from './StarterChips'

const send = vi.fn(async () => {})
const askFor = vi.fn()

beforeEach(() => {
  send.mockClear()
  askFor.mockClear()
  useAssistantStore.setState({ send, askFor })
})

afterEach(() => {
  setUiActionApplier(null)
  vi.unstubAllGlobals()
})

function show(
  results: Results,
  undoStates = {},
  subject: ThreadSubject = { kind: 'workspace' },
) {
  return renderWithProviders(
    <AssetsResults
      threadId="workspace"
      turnId="t1"
      subject={subject}
      results={results}
      undoStates={undoStates}
      disabled={false}
    />,
  )
}

describe('what a question searched', () => {
  it('cites pages and says when only the open asset was searched', async () => {
    await show({
      ask: {
        scope: 'open_asset',
        excerpts: [
          { assetId: 'a1', title: 'Brochure', type: 'PDF', pages: 'p. 11' },
          { assetId: 'a1', title: 'Brochure', type: 'PDF', pages: 'p. 12' },
        ],
      },
    })
    expect(screen.getByText('p. 11')).toBeTruthy()
    // Each chip carries its kind's mark, not a generic file.
    expect(screen.getAllByRole('img', { name: 'PDF' })).toHaveLength(2)
    expect(screen.getByText('p. 12')).toBeTruthy()
    expect(screen.getByText('Only this asset.')).toBeTruthy()
    fireEvent.click(screen.getByText('SEARCH ALL ASSETS'))
    expect(send).toHaveBeenCalledWith(
      'workspace',
      'Search all the assets for that, not only this one.',
    )
  })

  it('names the asset on each chip when several answered', async () => {
    await show({
      ask: {
        scope: 'campaign',
        excerpts: [
          { assetId: 'a1', title: 'Brochure', pages: 'p. 4' },
          { assetId: 'a2', title: 'Press kit', pages: '' },
        ],
      },
    })
    expect(screen.getByText('Brochure · p. 4')).toBeTruthy()
    expect(screen.getByText('Press kit')).toBeTruthy()
    expect(screen.queryByText('Only this asset.')).toBeNull()
  })
})

describe('what an analysis found', () => {
  it('states a lens’s reading and offers the others', async () => {
    await show({
      analysis: {
        assetId: 'a1',
        title: 'Villa Aurora brochure',
        pageCount: 24,
        lens: {
          status: 'ready',
          readAt: '2026-11-06T10:00:00Z',
          ideaCount: 8,
        },
        gist: 'Sells the slow stay.',
        summary: '',
        keyPoints: ['Not drawn'],
        ideas: { undecided: 5, yes: 2, later: 1, no: 0 },
        topIdeas: [],
        otherLenses: [
          {
            campaignId: 'c1',
            campaignName: 'Spring reopening',
            status: 'ready',
            readAt: '2026-11-07T10:00:00Z',
            ideaCount: 4,
          },
        ],
      },
    })
    // The lens is in the status word, the length and the date in the meta.
    expect(screen.getByText('Analysed · Workspace lens')).toBeTruthy()
    expect(screen.getByText('24 pages · Nov 6')).toBeTruthy()
    expect(screen.getByText('Sells the slow stay.')).toBeTruthy()
    expect(screen.queryByText('Not drawn')).toBeNull()
    expect(screen.getByText('8 ideas distilled')).toBeTruthy()
    // The Ideas list's own piles; an empty one is left out.
    expect(
      screen.getByText('5 on the desk · 2 making · 1 in the drawer'),
    ).toBeTruthy()
    expect(screen.getByText('OPEN IDEAS')).toBeTruthy()
    expect(screen.getByText('4 ideas · read Nov 7')).toBeTruthy()
    expect(screen.getByText('Read from')).toBeTruthy()
    fireEvent.click(screen.getByText('SHOW'))
    expect(send).toHaveBeenCalledWith(
      'workspace',
      'What did the analysis find for the Spring reopening’s lens?',
    )
  })

  it('says plainly when a lens hasn’t read it, and fills the composer to analyse', async () => {
    await show({
      analysis: {
        assetId: 'a2',
        title: 'Founder interview',
        durationMs: 1_080_000,
        lens: {
          campaignId: 'c1',
          campaignName: 'Spring reopening',
          status: 'not_read',
          ideaCount: 0,
        },
        gist: '',
        summary: '',
        keyPoints: [],
        ideas: { undecided: 0, yes: 0, later: 0, no: 0 },
        topIdeas: [],
        otherLenses: [
          { status: 'ready', readAt: '2026-11-02T10:00:00Z', ideaCount: 3 },
        ],
      },
    })
    expect(screen.getByText('Not read for this lens')).toBeTruthy()
    expect(screen.getByText('18 min')).toBeTruthy()
    expect(screen.queryByText('OPEN IDEAS')).toBeNull()
    // One row: the reading that does exist, and this lens's absence under it.
    expect(screen.getByText('Read for the workspace on Nov 2')).toBeTruthy()
    expect(
      screen.getByText('Spring reopening’s lens hasn’t read it'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('SHOW THAT'))
    expect(send).toHaveBeenCalledWith(
      'workspace',
      'What did the analysis find for the Workspace lens?',
    )
    send.mockClear()
    fireEvent.click(
      screen.getByRole('button', { name: 'Analyse for Spring reopening' }),
    )
    expect(askFor).toHaveBeenCalledWith(
      'workspace',
      'Analyse it for the Spring reopening’s lens.',
    )
    expect(send).not.toHaveBeenCalled()
  })
})

describe('a comparison', () => {
  it('letters each claim, gives a disagreement its own way to settle, and says what was read from passages', async () => {
    await show({
      compare: {
        mode: 'compare',
        assets: [
          { id: 'a1', title: 'Brochure', letter: 'A', from: 'analysis' },
          { id: 'a2', title: 'Spa menu', letter: 'B', from: 'passages' },
        ],
        summary: '',
        shared: [{ text: 'Opens 14 March', letters: ['A', 'B'] }],
        partial: [],
        conflicts: [
          { text: 'Spa hours: 9–21 against 10–20', letters: ['A', 'B'] },
        ],
        skipped: [],
        missing: 0,
      },
    })
    expect(screen.getByText('2 documents')).toBeTruthy()
    expect(screen.getByText('Opens 14 March')).toBeTruthy()
    // Counted by the documents behind the claim, lettered beside it.
    expect(screen.getByText('All 2')).toBeTruthy()
    expect(screen.getAllByText('A')).toHaveLength(2)
    expect(
      screen.getByText(
        'Spa menu isn’t analysed for this lens, so it was read from its passages.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('ASK WHICH'))
    expect(send).toHaveBeenCalledWith(
      'workspace',
      'Which is right: Spa hours: 9–21 against 10–20?',
    )
  })
})

describe('a summary of one document', () => {
  it('carries no letters, and names its source plainly', async () => {
    await show({
      compare: {
        mode: 'summarise',
        assets: [
          { id: 'a1', title: 'Brochure', letter: 'A', from: 'analysis' },
        ],
        summary: 'One summary.',
        shared: [{ text: 'Opens 14 March', letters: ['A'] }],
        partial: [],
        conflicts: [],
        skipped: [],
        missing: 0,
        grounding: {
          mode: 'grounded',
          sources: [{ id: 'a1', title: 'Brochure' }],
        },
      },
    })
    expect(screen.queryByText('A')).toBeNull()
    expect(screen.getByText('Brochure')).toBeTruthy()
  })
})

describe('a comparison with ids that named nothing', () => {
  it('says how many of the selection were left out', async () => {
    await show({
      compare: {
        mode: 'summarise',
        assets: [
          { id: 'a1', title: 'Brochure', letter: 'A', from: 'analysis' },
        ],
        summary: 'One summary.',
        shared: [],
        partial: [],
        conflicts: [],
        skipped: [],
        missing: 2,
      },
    })
    expect(
      screen.getByText('2 of the selected weren’t found, and were left out.'),
    ).toBeTruthy()
  })
})

describe('smart groups', () => {
  it('opens one through the same applier a turn’s ui_action uses', async () => {
    const apply = vi.fn(async () => undefined)
    setUiActionApplier({ apply, restore: vi.fn() })
    await show({
      savedViews: {
        list: 'assets',
        views: [
          {
            id: 'v1',
            name: 'Needs analysis',
            shared: true,
            count: 12,
            filter: 'ideas=unread',
          },
          {
            id: 'v2',
            name: 'Spring PDFs',
            shared: false,
            count: 3,
            filter: 'kind=pdf',
          },
        ],
      },
    })
    expect(screen.getByText('2 on Assets')).toBeTruthy()
    // Each group as the filter it stands for, in the list's own sentence.
    expect(screen.getByText('Documents not analysed yet')).toBeTruthy()
    expect(screen.getByText('PDFs')).toBeTruthy()
    fireEvent.click(screen.getAllByText('OPEN')[0])
    expect(apply).toHaveBeenCalledWith({
      type: 'open_saved_view',
      screen: 'assets',
      savedViewId: 'v1',
      savedViewName: 'Needs analysis',
    })
  })

  it('opens on the workspace’s list from inside a campaign, and says so', async () => {
    const apply = vi.fn(async () => undefined)
    setUiActionApplier({ apply, restore: vi.fn() })
    await show(
      {
        savedViews: {
          list: 'ideas',
          views: [{ id: 'v1', name: 'Hot', shared: false, filter: '' }],
        },
      },
      {},
      { kind: 'campaign', campaignId: 'c1' },
    )
    expect(
      screen.getByText(
        'Smart groups open on the workspace’s Ideas, outside this campaign.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('OPEN'))
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ screen: 'ideas', savedViewId: 'v1' }),
    )
    expect(apply).not.toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: expect.anything() }),
    )
  })
})

describe('the bank’s state', () => {
  it('counts, then one row for each thing waiting, each with its action', async () => {
    await show({
      state: {
        total: 64,
        processing: 0,
        processingFailed: 0,
        analysed: 49,
        waiting: 12,
        analysing: 0,
        analysisFailed: 0,
        skipped: 0,
        undecided: [
          { ideas: 29 },
          { campaignId: 'c1', campaignName: 'Spring reopening', ideas: 12 },
        ],
        waitingAssets: [
          { id: 'a1', title: 'Founder interview' },
          { id: 'a2', title: 'Wedding packages' },
        ],
        failedAssets: [],
      },
    })
    expect(screen.getByText('Assets · now')).toBeTruthy()
    expect(screen.getByText('64 documents')).toBeTruthy()
    expect(screen.getByText('49 analysed')).toBeTruthy()
    expect(screen.getByText('12 not analysed yet')).toBeTruthy()
    expect(
      screen.getByText('Founder interview, Wedding packages and 10 more'),
    ).toBeTruthy()
    // Nothing failed, so nothing offers a retry.
    expect(screen.queryByText('RETRY')).toBeNull()
    expect(screen.getByText('41 ideas undecided')).toBeTruthy()
    expect(
      screen.getByText('Workspace lens 29 · Spring reopening 12'),
    ).toBeTruthy()
    expect(screen.getByText('TRIAGE').closest('a')?.getAttribute('href')).toBe(
      '/ideas',
    )
    fireEvent.click(screen.getByText('ANALYSE'))
    expect(askFor).toHaveBeenCalledWith(
      'workspace',
      'Analyse the documents that haven’t been analysed yet.',
    )
  })
})

describe('a campaign set up from assets', () => {
  it('says what was made, with OPEN and UNDO', async () => {
    await show({
      campaign: {
        campaignId: 'c9',
        name: 'Spring reopening at Villa Aurora',
        type: 'Launch',
        startDate: '2026-03-02T00:00:00Z',
        endDate: '2026-04-26T00:00:00Z',
        assetIds: ['a1', 'a2', 'a3', 'a4'],
        undoId: 'u7',
      },
    })
    expect(screen.getByText('Spring reopening at Villa Aurora')).toBeTruthy()
    expect(screen.getByText('Launch')).toBeTruthy()
    // The window has a row of its own, not a place in the meta.
    expect(screen.getByText('Mar 2 – Apr 26')).toBeTruthy()
    expect(screen.getByText('4 sources attached')).toBeTruthy()
    expect(
      screen.getByText(
        'The documents stay in the bank; the campaign points at them.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('OPEN')).toBeTruthy()
    expect(screen.getByText('UNDO')).toBeTruthy()
  })
})

describe('suggestions from the bank’s state', () => {
  it('offers only what is waiting, with its count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: RequestInfo | URL) =>
        String(url).includes('/assets-state')
          ? new Response(
              JSON.stringify({
                total: 64,
                waiting: 12,
                analysis_failed: 0,
                undecided: [{ ideas: 29 }, { campaign_id: 'c1', ideas: 12 }],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            )
          : new Response('{}', { status: 200 }),
      ),
    )
    useViewContextStore.setState({
      location: { screen: 'assets' },
      page: null,
    })
    render(<StarterChips kind="workspace" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(await screen.findByText('Analyse the 12 new')).toBeTruthy()
    expect(screen.getByText('Triage 41 ideas')).toBeTruthy()
    expect(screen.queryByText(/Retry/)).toBeNull()
    expect(screen.getByText('Open a smart group')).toBeTruthy()
    expect(screen.getByText('Find documents about…')).toBeTruthy()
    expect(screen.queryByText('Ask the assets')).toBeNull()
    // In the empty thread's body the chips carry no heading.
    expect(screen.queryByText('On this screen')).toBeNull()
  })

  it('heads the chips in a thread already going', () => {
    useViewContextStore.setState({
      location: { screen: 'asset', focus: { kind: 'asset', id: 'a1' } },
      page: null,
    })
    render(
      <StarterChips kind="workspace" onPick={() => {}} placement="footer" />,
      { wrapper: QueryWrapper },
    )
    expect(screen.getByText('On this screen')).toBeTruthy()
    expect(screen.getByText('Tag it')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words a comparison', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({
      compare: {
        mode: 'summarise',
        assets: [{ id: 'a1', title: 'Folleto', letter: 'A', from: 'analysis' }],
        summary: 'Un resumen.',
        shared: [],
        partial: [],
        conflicts: [],
        skipped: [],
        missing: 0,
      },
    })
    expect(screen.getByText('1 documento')).toBeTruthy()
    expect(screen.getByText('Resumido', { exact: false })).toBeTruthy()
    expect(screen.queryByText('Summarised', { exact: false })).toBeNull()
  })

  it('words the bank’s state and a campaign made from assets', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({
      state: {
        total: 2,
        processing: 0,
        processingFailed: 0,
        analysed: 1,
        waiting: 0,
        analysing: 0,
        analysisFailed: 1,
        skipped: 0,
        undecided: [],
        waitingAssets: [],
        failedAssets: [{ id: 'a1', title: 'Folleto' }],
      },
      campaign: {
        campaignId: 'c9',
        name: 'Primavera',
        type: 'Lanzamiento',
        assetIds: ['a1'],
      },
    })
    expect(screen.getByText('Recursos · ahora')).toBeTruthy()
    expect(screen.getByText('1 análisis fallido')).toBeTruthy()
    expect(screen.getByText('REINTENTAR')).toBeTruthy()
    expect(
      screen.getByText(
        'Los documentos siguen en el banco; la campaña apunta a ellos.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText('Assets · now')).toBeNull()
    expect(screen.queryByText('RETRY')).toBeNull()
    expect(screen.queryByText(/stay in the bank/)).toBeNull()
  })
})
