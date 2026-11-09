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
import type { AssetsResults as Results } from '@/types/assistant'
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

function show(results: Results, undoStates = {}) {
  return renderWithProviders(
    <AssetsResults
      threadId="workspace"
      turnId="t1"
      subject={{ kind: 'workspace' }}
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
          { assetId: 'a1', title: 'Brochure', pages: 'p. 11' },
          { assetId: 'a1', title: 'Brochure', pages: 'p. 12' },
        ],
      },
    })
    expect(screen.getByText('p. 11')).toBeTruthy()
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
        lens: { status: 'ready', readAt: '2026-11-06T10:00:00Z' },
        gist: 'Sells the slow stay.',
        summary: '',
        keyPoints: [],
        ideas: { undecided: 5, yes: 2, later: 1, no: 0 },
        topIdeas: [],
        otherLenses: [
          {
            campaignId: 'c1',
            campaignName: 'Spring reopening',
            status: 'ready',
          },
        ],
      },
    })
    expect(screen.getByText('ANALYSED', { exact: false })).toBeTruthy()
    expect(screen.getByText('Sells the slow stay.')).toBeTruthy()
    expect(screen.getByText('8 ideas distilled')).toBeTruthy()
    expect(screen.getByText('5 undecided · 2 yes · 1 later')).toBeTruthy()
    expect(screen.getByText('OPEN IDEAS')).toBeTruthy()
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
        lens: {
          campaignId: 'c1',
          campaignName: 'Spring reopening',
          status: 'not_read',
        },
        gist: '',
        summary: '',
        keyPoints: [],
        ideas: { undecided: 0, yes: 0, later: 0, no: 0 },
        topIdeas: [],
        otherLenses: [],
      },
    })
    expect(
      screen.getByText('Not read for this lens', { exact: false }),
    ).toBeTruthy()
    expect(screen.queryByText('OPEN IDEAS')).toBeNull()
    fireEvent.click(screen.getByText('ANALYSE'))
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
      },
    })
    expect(screen.getByText('2 documents')).toBeTruthy()
    expect(screen.getByText('Opens 14 March')).toBeTruthy()
    expect(
      screen.getByText(
        'Spa menu was read from its passages: there’s no analysis for this lens.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('ASK WHICH'))
    expect(send).toHaveBeenCalledWith(
      'workspace',
      'Which is right: Spa hours: 9–21 against 10–20?',
    )
  })
})

describe('smart groups', () => {
  it('opens one through the same applier a turn’s ui_action uses', async () => {
    const apply = vi.fn(async () => undefined)
    setUiActionApplier({ apply, restore: vi.fn() })
    await show({
      savedViews: {
        list: 'assets',
        views: [{ id: 'v1', name: 'Needs analysis', shared: true, count: 12 }],
      },
    })
    expect(screen.getByText('1 on Assets')).toBeTruthy()
    expect(screen.getByText('12 documents · Shared')).toBeTruthy()
    fireEvent.click(screen.getByText('OPEN'))
    expect(apply).toHaveBeenCalledWith({
      type: 'open_saved_view',
      screen: 'assets',
      savedViewId: 'v1',
    })
  })
})

describe('a campaign set up from assets', () => {
  it('says what was made, with OPEN and UNDO', async () => {
    await show({
      campaign: {
        campaignId: 'c9',
        name: 'Spring reopening at Villa Aurora',
        type: 'Launch',
        assetIds: ['a1', 'a2', 'a3', 'a4'],
        undoId: 'u7',
      },
    })
    expect(screen.getByText('Spring reopening at Villa Aurora')).toBeTruthy()
    expect(screen.getByText('4 sources attached')).toBeTruthy()
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
      },
    })
    expect(screen.getByText('1 documento')).toBeTruthy()
    expect(screen.getByText('Resumido', { exact: false })).toBeTruthy()
    expect(screen.queryByText('Summarised', { exact: false })).toBeNull()
  })
})
