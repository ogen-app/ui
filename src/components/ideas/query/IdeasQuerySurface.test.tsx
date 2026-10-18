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
  setIdeaVerdict: vi.fn(),
  captureIdea: vi.fn(),
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
    setIdeaVerdict: api.setIdeaVerdict,
    captureIdea: api.captureIdea,
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
        source_asset: {
          id: 'pdf1',
          title: 'Handbook',
          kind: 'pdf',
          page_count: 7,
        },
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
  api.queryIdeas.mockResolvedValue(page())
  groups.listSavedViews.mockResolvedValue([VIEW])
})

describe('IdeasQuerySurface', () => {
  it('counts the piles within the filter and asks the server for the pile', async () => {
    await renderSurface({ fit: 'high' })

    expect(await screen.findByText('Idea a')).toBeInTheDocument()
    const tabs = screen.getByRole('button', { name: /Making\s*4/ })
    expect(tabs).toBeInTheDocument()
    expect(api.queryIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ fit: 'high', pile: 'waiting', limit: '50' }),
    )
  })

  it('says which filter is in the way when nothing matches', async () => {
    // Nothing is high fit; without that filter there are 9.
    api.queryIdeas.mockImplementation(async (params: Record<string, string>) =>
      params.fit
        ? page({ ideas: [], total: 0, groups: [] })
        : page({ total: 9 }),
    )
    await renderSurface({ fit: 'high' })

    expect(
      await screen.findByText('No ideas match these filters'),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Remove “with a high fit”' }),
    ).toBeInTheDocument()
  })

  it('draws a band per group, counted over the whole match', async () => {
    await renderSurface({ group: 'source' })

    expect(
      await screen.findByRole('heading', { name: /Handbook/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /No document/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('PDF · 7 pages')).toBeInTheDocument()
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

describe('capturing', () => {
  it('shows a new idea at once on the undecided pile, and not on Yes', async () => {
    // The server takes its time; the row must not wait for it.
    api.captureIdea.mockReturnValue(new Promise(() => {}))
    await renderSurface()
    await screen.findByText('Idea a')
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Write down an idea' }),
      'A brand-new idea{Enter}',
    )
    expect(await screen.findByText('A brand-new idea')).toBeInTheDocument()
  })

  it('gives the words back when the save fails', async () => {
    api.captureIdea.mockRejectedValue(new Error('offline'))
    await renderSurface()
    await screen.findByText('Idea a')
    const field = screen.getByRole('textbox', { name: 'Write down an idea' })
    await userEvent.type(field, 'A brand-new idea{Enter}')

    await waitFor(() => expect(field).toHaveValue('A brand-new idea'))
    expect(toasts.error).toHaveBeenCalled()
  })

  it('keeps both when two captures in a row fail', async () => {
    const pending: Array<(reason: Error) => void> = []
    api.captureIdea.mockImplementation(
      () => new Promise((_, reject) => pending.push(reject)),
    )
    await renderSurface()
    await screen.findByText('Idea a')
    const field = screen.getByRole('textbox', { name: 'Write down an idea' })
    await userEvent.type(field, 'First idea{Enter}')
    await userEvent.type(field, 'Second idea{Enter}')
    await waitFor(() => expect(pending).toHaveLength(2))

    pending[0](new Error('offline'))
    await waitFor(() => expect(field).toHaveValue('First idea'))
    pending[1](new Error('offline'))

    // The field already holds the first, so the second waits under it.
    expect(
      await screen.findByText('Not kept: “Second idea”'),
    ).toBeInTheDocument()
    expect(field).toHaveValue('First idea')
  })

  it('leaves another pile alone', async () => {
    api.captureIdea.mockReturnValue(new Promise(() => {}))
    await renderSurface({ pile: 'yes' })
    await screen.findByText('Idea a')
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Write down an idea' }),
      'A brand-new idea{Enter}',
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByText('A brand-new idea')).not.toBeInTheDocument()
  })
})

describe('an answered idea', () => {
  it('stays open where it was until it is closed', async () => {
    api.setIdeaVerdict.mockResolvedValue({})
    await renderSurface()
    await userEvent.click(await screen.findByText('Idea b'))

    // The server moves it to the Yes pile; this pile's next answer lacks it.
    api.queryIdeas.mockResolvedValue(
      page({ ideas: [page().ideas[0]], total: 1 }),
    )
    const answer = screen.getByRole('group', { name: 'Answer this idea' })
    await userEvent.click(
      within(answer).getByRole('button', { name: /Making/ }),
    )
    await waitFor(() =>
      expect(api.setIdeaVerdict).toHaveBeenCalledWith('b', 'yes', null),
    )
    // The list asked again (the rail's count asks too, so at least twice
    // more), and the answer without it has landed.
    await waitFor(() =>
      expect(api.queryIdeas.mock.calls.length).toBeGreaterThan(2),
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    // Open, a written idea's title is its field.
    expect(screen.getByDisplayValue('Idea b')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Close this idea' }),
    )
    await waitFor(() =>
      expect(screen.queryByText('Idea b')).not.toBeInTheDocument(),
    )
  })
})

describe('deleting the open idea', () => {
  it('closes it, so it does not stay on screen once it is gone', async () => {
    api.bulkDeleteIdeas.mockResolvedValue({ deleted: 1, failed: 0 })
    await renderSurface()
    await userEvent.click(await screen.findByText('Idea b'))
    api.queryIdeas.mockResolvedValue(
      page({ ideas: [page().ideas[0]], total: 1 }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'DELETE IDEA' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'DELETE IDEA' }),
    )

    await waitFor(() => expect(api.bulkDeleteIdeas).toHaveBeenCalledWith(['b']))
    await waitFor(() =>
      expect(screen.queryByDisplayValue('Idea b')).not.toBeInTheDocument(),
    )
    expect(screen.queryByText('Idea b')).not.toBeInTheDocument()
  })
})

describe('smart groups', () => {
  it('lists the groups with their undecided counts and opens one', async () => {
    await renderSurface({ pile: 'yes' })

    await userEvent.click(
      await screen.findByRole('button', { name: 'Views: All ideas' }),
    )
    const open = await screen.findByRole('menuitem', { name: /^Strong PDFs/ })
    expect(open).toHaveTextContent('3')
    await userEvent.click(open)

    // Its filter, grouping and sort into the address; the pile stays. A
    // group stored without a grouping is one that does not group.
    expect(onSearchChange).toHaveBeenLastCalledWith({
      fit: 'high',
      kind: 'pdf',
      sort: 'fit',
      group: 'none',
      view: 'v1',
      pile: 'yes',
    })
  })

  it("offers only Duplicate on somebody else's shared group", async () => {
    await renderSurface()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Views: All ideas' }),
    )
    await userEvent.click(
      await screen.findByRole('menuitem', {
        name: 'Actions for “Strong PDFs”',
      }),
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
      group: 'none',
      view: 'v1',
    })
    await screen.findByText('Idea a')
    expect(screen.queryByText('edited')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save as group' })).toBeNull()
    first.unmount()

    await renderSurface({ fit: 'high', kind: 'pdf', view: 'v1' })
    // On the Views button, which names the open group.
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

describe('the filter as a sentence', () => {
  const sentence = () => screen.getByRole('group', { name: 'Filter' })

  it('reads "Showing all ideas" with nothing chosen', async () => {
    await renderSurface()
    await screen.findByText('Idea a')
    expect(sentence()).toHaveTextContent('Showing all ideas')
  })

  it('reads the clauses in a fixed order, however the address holds them', async () => {
    await renderSurface({
      created: '30d',
      fit: 'high,medium',
      kind_not: 'web',
      campaign_id: 'c1',
      origin: 'asset_analysis',
    })
    await screen.findByText('Idea a')
    expect(sentence()).toHaveTextContent(
      'Showing ideas from documents, in Bees, that aren’t web pages, with a high or medium fit, added in the last 30 days',
    )
    expect(sentence()).toHaveTextContent('2 of 9')
  })

  it('changes a clause from its panel, and switches it to "not in"', async () => {
    await renderSurface({ fit: 'high' })
    await screen.findByText('Idea a')

    await userEvent.click(
      screen.getByRole('button', { name: 'Change: with a high fit' }),
    )
    const panel = screen.getByRole('dialog', { name: 'Ideas whose fit is…' })
    await userEvent.click(
      within(panel).getByRole('checkbox', { name: /Medium/ }),
    )
    expect(onSearchChange).toHaveBeenLastCalledWith({ fit: 'high,medium' })

    await userEvent.click(within(panel).getByRole('radio', { name: 'without' }))
    expect(onSearchChange).toHaveBeenLastCalledWith({ fit_not: 'high' })
  })

  it('words "before" a preset as its own phrase, and reopens it on the presets', async () => {
    await renderSurface({ created_before: '7d' })
    await screen.findByText('Idea a')
    expect(sentence()).toHaveTextContent(
      'Showing ideas added more than 7 days ago',
    )
    expect(sentence()).not.toHaveTextContent(/Invalid Date/)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Change: added more than 7 days ago',
      }),
    )
    const panel = screen.getByRole('dialog', { name: 'Ideas added…' })
    // The preset list, not the custom form holding "7d" as a day.
    expect(
      within(panel).getByRole('radio', { name: /Last 7 days/, checked: true }),
    ).toBeInTheDocument()
    expect(within(panel).queryByText('Before')).toBeNull()
  })

  it('removes a clause with its ×', async () => {
    await renderSurface({ fit: 'high', kind: 'pdf' })
    await screen.findByText('Idea a')
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove: that are PDFs' }),
    )
    expect(onSearchChange).toHaveBeenLastCalledWith({ fit: 'high' })
  })

  it('adds a detail by typing — "mentioning …" — or from a starter', async () => {
    await renderSurface()
    await screen.findByText('Idea a')

    await userEvent.click(screen.getByRole('button', { name: /add a detail/ }))
    const field = screen.getByRole('combobox', { name: 'add a detail' })
    expect(screen.getByText('in a campaign…')).toBeInTheDocument()

    await userEvent.type(field, 'wax{Enter}')
    expect(onSearchChange).toHaveBeenLastCalledWith({ text: 'wax' })

    await userEvent.click(screen.getByRole('button', { name: /add a detail/ }))
    await userEvent.click(screen.getByText('in a campaign…'))
    const panel = screen.getByRole('dialog', { name: 'Ideas filed under…' })
    await userEvent.click(within(panel).getByRole('checkbox', { name: /Bees/ }))
    expect(onSearchChange).toHaveBeenLastCalledWith({ campaign_id: 'c1' })
  })

  it('removes the last clause on Backspace in an empty detail', async () => {
    await renderSurface({ fit: 'high', kind: 'pdf' })
    await screen.findByText('Idea a')
    await userEvent.keyboard('/')
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'add a detail' }),
      ).toHaveFocus(),
    )
    await userEvent.keyboard('{Backspace}')
    // Fit reads after Type, so it is the last clause.
    expect(onSearchChange).toHaveBeenLastCalledWith({ kind: 'pdf' })
  })

  it('offers Clear, but not while a group is open as saved', async () => {
    const first = await renderSurface({ fit: 'high' })
    await screen.findByText('Idea a')
    await userEvent.click(
      within(sentence()).getByRole('button', { name: 'Clear' }),
    )
    expect(onSearchChange).toHaveBeenLastCalledWith({})
    first.unmount()

    await renderSurface({
      fit: 'high',
      kind: 'pdf',
      sort: 'fit',
      group: 'none',
      view: 'v1',
    })
    await screen.findByText('Idea a')
    expect(
      within(sentence()).queryByRole('button', { name: 'Clear' }),
    ).toBeNull()
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

    expect(screen.getByRole('group', { name: 'Filtro' })).toHaveTextContent(
      'Mostrando todas las ideas',
    )
    expect(
      screen.getByRole('button', { name: /añadir un detalle/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Más tiempo esperando')).toBeInTheDocument()
    expect(screen.getByText('Fecha de alta')).toBeInTheDocument()
    expect(screen.queryByText('Waiting longest')).not.toBeInTheDocument()
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
    expect(screen.queryByText('add a detail')).not.toBeInTheDocument()
  })

  it('words each clause as one Spanish sentence', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await renderSurface({ origin: 'asset_analysis', fit: 'high,medium' })
    await screen.findByText('Idea a')

    expect(screen.getByRole('group', { name: 'Filtro' })).toHaveTextContent(
      // The language's own joining: Spanish puts "y" before the last.
      'Mostrando ideas de documentos y con un encaje alto o medio',
    )
    expect(
      screen.getByRole('button', {
        name: 'Cambiar: con un encaje alto o medio',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/high or medium/)).not.toBeInTheDocument()
  })
})
