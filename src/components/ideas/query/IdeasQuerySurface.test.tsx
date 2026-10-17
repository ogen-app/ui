import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import type { IdeaBody, IdeaListPageBody } from '@/services/api/ideas'
import { IdeasQuerySurface } from './IdeasQuerySurface'

const api = vi.hoisted(() => ({
  queryIdeas: vi.fn(),
  queryIdeaIds: vi.fn(),
  bulkDeleteIdeas: vi.fn(),
}))
const groups = vi.hoisted(() => ({
  listSavedViews: vi.fn(),
  createSavedView: vi.fn(),
  updateSavedView: vi.fn(),
  deleteSavedView: vi.fn(),
}))
vi.mock('@/services/api/savedViews', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/savedViews')>()),
  ...groups,
}))
const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('@/services/api/ideas', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/services/api/ideas')>()
  return {
    ...real,
    queryIdeas: async (params: Record<string, string>) => {
      const body = (await api.queryIdeas(params)) as IdeaListPageBody
      return { ...body, ideas: body.ideas.map(real.ideaFromWire) }
    },
    queryIdeaIds: api.queryIdeaIds,
    bulkDeleteIdeas: api.bulkDeleteIdeas,
  }
})
vi.mock('@/stores/toastStore', () => ({
  toast: { ...toasts, info: vi.fn(), warning: vi.fn(), dismiss: vi.fn() },
}))
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({ data: [{ id: 'c1', name: 'Bees' }] }),
  useArchivedCampaigns: () => ({ data: [] }),
}))

const idea = (id: string, over: Partial<IdeaBody> = {}): IdeaBody => ({
  id,
  title: `Idea ${id}`,
  note: '',
  campaign_id: null,
  verdict: null,
  created_at: '2026-10-01T09:00:00Z',
  created_by: null,
  created_by_name: 'Alex Lane',
  decided_at: null,
  decided_by: null,
  remind_at: null,
  ...over,
})

function page(over: Partial<IdeaListPageBody> = {}): IdeaListPageBody {
  return {
    ideas: [
      idea('a', {
        origin: 'asset_analysis',
        fit_score: 78,
        group_key: 'pdf1',
        source_asset: { id: 'pdf1', title: 'Handbook', kind: 'pdf' },
      }),
      idea('b', { group_key: 'none' }),
    ],
    total: 2,
    total_unfiltered: 9,
    piles: { waiting: 2, yes: 4, later: 1, no: 2 },
    facets: {},
    groups: [
      { key: 'pdf1', count: 1 },
      { key: 'none', count: 1 },
    ],
    next_cursor: null,
    ...over,
  }
}

const onSearchChange = vi.fn()

function renderSurface(search = {}) {
  return renderWithProviders(
    <IdeasQuerySurface
      campaignId={null}
      search={search}
      onSearchChange={onSearchChange}
    />,
  )
}

const VIEW = {
  id: 'v1',
  surface: 'ideas' as const,
  name: 'Strong PDFs',
  query: 'fit=high&kind=pdf&sort=fit',
  shared: true,
  createdBy: 'u2',
  createdAt: '2026-10-16T09:00:00Z',
  valid: true,
  canEdit: false,
  counts: { undecided: 3 },
}

beforeEach(() => {
  vi.clearAllMocks()
  // A wide window, where the groups panel starts open.
  window.innerWidth = 1440
  api.queryIdeas.mockResolvedValue(page())
  groups.listSavedViews.mockResolvedValue([VIEW])
})

describe('IdeasQuerySurface', () => {
  it('counts the piles within the filter and asks the server for the pile', async () => {
    await renderSurface({ fit: 'high' })

    expect(await screen.findByText('Idea a')).toBeInTheDocument()
    const tabs = screen.getByRole('button', { name: /Yes\s*4/ })
    expect(tabs).toBeInTheDocument()
    expect(api.queryIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ fit: 'high', pile: 'waiting', limit: '50' }),
    )
  })

  it('draws a band per group, counted over the whole match', async () => {
    await renderSurface({ group: 'source' })

    expect(
      await screen.findByRole('heading', { name: 'Handbook' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'No document' }),
    ).toBeInTheDocument()
  })

  it('says so, and selects nothing, when the match is too big', async () => {
    api.queryIdeaIds.mockResolvedValue(null)
    await renderSurface()
    await screen.findByText('Idea a')

    await userEvent.click(screen.getByRole('checkbox', { name: /Select all/ }))

    await waitFor(() =>
      expect(toasts.error).toHaveBeenCalledWith(
        'Narrow the filter to select all (up to 5,000).',
      ),
    )
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })

  it('deletes a selection only after asking, naming one idea', async () => {
    api.bulkDeleteIdeas.mockResolvedValue({ deleted: 1, failed: 0 })
    await renderSurface()
    await screen.findByText('Idea a')

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select “Idea b”' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'DELETE' }))
    expect(api.bulkDeleteIdeas).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Delete “Idea b”?')).toBeInTheDocument()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'DELETE IDEA' }),
    )

    await waitFor(() => expect(api.bulkDeleteIdeas).toHaveBeenCalledWith(['b']))
    expect(toasts.success).toHaveBeenCalledWith('Deleted 1 idea.')
  })
})

describe('smart groups', () => {
  it('lists the groups with their undecided counts and opens one', async () => {
    await renderSurface({ pile: 'yes' })

    const open = await screen.findByRole('button', { name: /^Strong PDFs/ })
    expect(open).toHaveTextContent('3')
    await userEvent.click(open)

    // Its filter, grouping and sort into the address; the pile stays.
    expect(onSearchChange).toHaveBeenLastCalledWith({
      fit: 'high',
      kind: 'pdf',
      sort: 'fit',
      view: 'v1',
      pile: 'yes',
    })
  })

  it("offers only Duplicate on somebody else's shared group", async () => {
    await renderSurface()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions for “Strong PDFs”' }),
    )
    expect(
      screen.getByRole('menuitem', { name: 'Duplicate' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: 'Rename' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: 'Delete' }),
    ).not.toBeInTheDocument()
  })

  it('marks an open group edited once the address differs from it', async () => {
    const first = await renderSurface({
      fit: 'high',
      kind: 'pdf',
      sort: 'fit',
      view: 'v1',
    })
    await screen.findByText('Idea a')
    expect(screen.queryByText('edited')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save as group' })).toBeNull()
    first.unmount()

    await renderSurface({ fit: 'high', kind: 'pdf', view: 'v1' })
    expect(await screen.findByText('edited')).toBeInTheDocument()
    // Somebody else's group: no Save changes, but it can be saved as new.
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Save as new…' }),
    ).toBeInTheDocument()
  })

  it('saves the filter, grouping and sort as a new group — never the pile', async () => {
    groups.createSavedView.mockResolvedValue({
      ...VIEW,
      id: 'v2',
      name: 'Mine',
    })
    await renderSurface({ fit: 'high', pile: 'no', group: 'source' })
    await screen.findByText('Idea a')

    await userEvent.click(screen.getByRole('button', { name: 'Save as group' }))
    const dialog = await screen.findByRole('dialog')
    const name = within(dialog).getByRole('textbox')
    await userEvent.clear(name)
    await userEvent.type(name, 'Mine')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'SAVE GROUP' }),
    )

    await waitFor(() =>
      expect(groups.createSavedView).toHaveBeenCalledWith({
        surface: 'ideas',
        name: 'Mine',
        query: 'fit=high&group=source',
        shared: false,
      }),
    )
  })
})

describe('IdeasQuerySurface in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the bar, the tabs and the menus from the catalogue', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await renderSurface()
    await screen.findByText('Idea a')

    expect(
      screen.getByPlaceholderText(
        'Filtrar por texto, fuente, campaña, encaje…',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Más tiempo esperando')).toBeInTheDocument()
    expect(screen.getByText('Sin agrupar')).toBeInTheDocument()
    expect(screen.queryByText('Waiting longest')).not.toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Filter by text, source, campaign, fit…'),
    ).not.toBeInTheDocument()
  })
})
