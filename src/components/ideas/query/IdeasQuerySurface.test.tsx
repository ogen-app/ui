import { useState } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import type { IdeaBody, IdeaListPageBody } from '@/services/api/ideas'
import type { IdeaListSearch } from '@/lib/ideaFilter'
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

/** ADD IDEA in the header opens the capture field across it. */
async function openCapture() {
  await userEvent.click(screen.getByRole('button', { name: 'ADD IDEA' }))
  return screen.getByRole('textbox', { name: 'Write down an idea' })
}

function renderSurface(search = {}) {
  return renderWithProviders(
    <SidebarProvider>
      <IdeasQuerySurface
        heading="Ideas"
        campaignId={null}
        search={search}
        onSearchChange={onSearchChange}
      />
    </SidebarProvider>,
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

  it('draws no group heads when the list is not grouped', async () => {
    await renderSurface({ group: 'none' })
    await screen.findByText('Idea a')
    // The list's head is its edge to pin under the page header (CON-392).
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
    expect(
      screen.getByRole('checkbox', { name: 'Select the ideas shown' }),
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

  it('ticks the page from the head box, and every match as its own step', async () => {
    api.queryIdeas.mockResolvedValue(page({ total: 30 }))
    api.queryIdeaIds.mockResolvedValue({ ids: ['a', 'b', 'c'] })
    await renderSurface()
    await screen.findByText('Idea a')

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select the ideas shown' }),
    )
    expect(screen.getByRole('status')).toHaveTextContent('2 selected')
    expect(api.queryIdeaIds).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Select all 30 ideas in “On the desk”',
      }),
    )
    expect(
      await screen.findByText('All 30 ideas in “On the desk” are selected'),
    ).toBeInTheDocument()

    // A half- or fully-ticked head box clears.
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Clear the selection' }),
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('ticks a group from its own box', async () => {
    await renderSurface({ group: 'source' })
    await userEvent.click(
      await screen.findByRole('checkbox', {
        name: 'Select everything in Handbook',
      }),
    )
    expect(
      screen.getByRole('checkbox', { name: 'Select “Idea a”' }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Select “Idea b”' }),
    ).not.toBeChecked()
  })

  it('says so, and selects nothing, when the match is too big', async () => {
    api.queryIdeas.mockResolvedValue(page({ total: 30 }))
    api.queryIdeaIds.mockResolvedValue(null)
    await renderSurface()
    await screen.findByText('Idea a')

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select the ideas shown' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: /^Select all 30 ideas/ }),
    )

    await waitFor(() =>
      expect(toasts.error).toHaveBeenCalledWith(
        'Narrow the filter to select all (up to 5,000).',
      ),
    )
    expect(screen.queryByText(/are selected/)).not.toBeInTheDocument()
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
  it('opens over the header from ADD IDEA and folds back on Escape', async () => {
    await renderSurface()
    await screen.findByText('Idea a')
    const field = await openCapture()
    expect(field).toHaveFocus()
    // The field lies over the header's row; what it covers stays put, inert.
    expect(
      screen.getByRole('button', { name: /On the desk/ }).closest('[inert]'),
    ).not.toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(
      screen.queryByRole('textbox', { name: 'Write down an idea' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ADD IDEA' })).toBeInTheDocument()
  })

  it('shows a new idea at once on the undecided pile, and not on Yes', async () => {
    // The server takes its time; the row must not wait for it.
    api.captureIdea.mockReturnValue(new Promise(() => {}))
    await renderSurface()
    await screen.findByText('Idea a')
    await userEvent.type(await openCapture(), 'A brand-new idea{Enter}')
    expect(await screen.findByText('A brand-new idea')).toBeInTheDocument()
  })

  it('gives the words back when the save fails', async () => {
    api.captureIdea.mockRejectedValue(new Error('offline'))
    await renderSurface()
    await screen.findByText('Idea a')
    const field = await openCapture()
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
    const field = await openCapture()
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
    await userEvent.type(await openCapture(), 'A brand-new idea{Enter}')
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
    const answer = screen.getByRole('group', { name: 'Answer “Idea b”' })
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

    // The card closes from anywhere on it that is not a control.
    await userEvent.click(screen.getByDisplayValue('Idea b').closest('li')!)
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

    await userEvent.click(await screen.findByRole('button', { name: 'Views' }))
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
    await userEvent.click(await screen.findByRole('button', { name: 'Views' }))
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
    // Beside the open group's name, leading the pills row.
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

describe('the filter as pills', () => {
  const pills = () => screen.getByRole('group', { name: 'Filter' })
  const words = () =>
    screen
      .getAllByRole('button', { name: /^Change: / })
      .map((pill) => pill.textContent)

  it('draws no pills row with nothing chosen; Filter opens one', async () => {
    await renderSurface()
    await screen.findByText('Idea a')
    expect(screen.queryByRole('group', { name: 'Filter' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /^Filter/ }))
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'add a detail' }),
      ).toHaveFocus(),
    )
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
    expect(words()).toEqual([
      'from documents',
      'in Bees',
      'that aren’t web pages',
      'with a high or medium fit',
      'added in the last 30 days',
    ])
    // Filter says how many are on.
    expect(screen.getByRole('button', { name: /^Filter/ })).toHaveTextContent(
      'Filter5',
    )
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
    expect(words()).toEqual(['added more than 7 days ago'])
    expect(pills()).not.toHaveTextContent(/Invalid Date/)

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

  it('words exactly these ideas, asks for them, and lets the clause go (CON-510)', async () => {
    await renderSurface({ ids: 'a,b', fit: 'high' })
    await screen.findByText('Idea a')
    expect(pills()).toHaveTextContent('limited to these 2')
    expect(words()).toEqual(['with a high fit'])
    expect(api.queryIdeas.mock.calls[0][0]).toMatchObject({ ids: 'a,b' })
    // Its words open nothing; its × drops it.
    expect(
      screen.queryByRole('button', { name: 'Change: limited to these 2' }),
    ).toBeNull()
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove: limited to these 2' }),
    )
    expect(onSearchChange).toHaveBeenLastCalledWith({ fit: 'high' })
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

    await userEvent.click(screen.getByRole('button', { name: /^Filter/ }))
    const field = screen.getByRole('combobox', { name: 'add a detail' })
    expect(screen.getByText('in a campaign…')).toBeInTheDocument()

    await userEvent.type(field, 'wax{Enter}')
    expect(onSearchChange).toHaveBeenLastCalledWith({ text: 'wax' })

    await userEvent.click(screen.getByRole('button', { name: /^Filter/ }))
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

  it('offers Clear filters, but not while a group is open as saved', async () => {
    const first = await renderSurface({ fit: 'high' })
    await screen.findByText('Idea a')
    await userEvent.click(
      within(pills()).getByRole('button', { name: 'Clear filters' }),
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
      within(pills()).queryByRole('button', { name: 'Clear filters' }),
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

    expect(screen.getByRole('button', { name: /^Filtro/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vistas' })).toBeInTheDocument()
    expect(screen.getByText('Más tiempo esperando')).toBeInTheDocument()
    expect(screen.getByText('Fecha de alta')).toBeInTheDocument()
    expect(screen.queryByText('Waiting longest')).not.toBeInTheDocument()
    expect(screen.queryByText('Views')).not.toBeInTheDocument()
  })

  it('words each clause as one Spanish sentence', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await renderSurface({ origin: 'asset_analysis', fit: 'high,medium' })
    await screen.findByText('Idea a')

    expect(screen.getByRole('group', { name: 'Filtro' })).toHaveTextContent(
      'de documentos',
    )
    expect(
      screen.getByRole('button', {
        name: 'Cambiar: con un encaje alto o medio',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/high or medium/)).not.toBeInTheDocument()
  })
})

describe('an idea the address names (CON-481)', () => {
  it('opens once it is on the page, then lets the address go', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    await renderSurface({ idea: 'b' })
    await waitFor(() =>
      expect(
        document.querySelector('[data-idea-id="b"]')?.getAttribute('data-open'),
      ).toBe('true'),
    )
    await waitFor(() => expect(onSearchChange).toHaveBeenCalledWith({}))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('closes one left open when a different set of ideas is asked for (CON-510)', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    api.queryIdeas.mockImplementation(async (params: Record<string, string>) =>
      page(
        params.ids === 'b'
          ? { ideas: [idea('b', { group_key: 'none' })], total: 1 }
          : { ideas: [idea('a', { group_key: 'none' })], total: 1 },
      ),
    )
    function Harness() {
      const [search, setSearch] = useState<IdeaListSearch>({
        ids: 'a',
        idea: 'a',
      })
      return (
        <>
          <button type="button" onClick={() => setSearch({ ids: 'b' })}>
            next set
          </button>
          <SidebarProvider>
            <IdeasQuerySurface
              heading="Ideas"
              campaignId={null}
              search={search}
              onSearchChange={setSearch}
            />
          </SidebarProvider>
        </>
      )
    }
    await renderWithProviders(<Harness />)
    await waitFor(() =>
      expect(
        document.querySelector('[data-idea-id="a"]')?.getAttribute('data-open'),
      ).toBe('true'),
    )
    await userEvent.click(screen.getByRole('button', { name: 'next set' }))
    await screen.findByText('Idea b')
    await waitFor(() =>
      expect(document.querySelector('[data-idea-id="a"]')).toBeNull(),
    )
  })

  it('lets go of one the page doesn’t hold', async () => {
    await renderSurface({ idea: 'gone', pile: 'yes' })
    await waitFor(() =>
      expect(onSearchChange).toHaveBeenCalledWith({ pile: 'yes' }),
    )
  })

  it('reads on a page at a time to reach an idea past the first', async () => {
    // The undecided count reads the list too, so pages answer by cursor.
    api.queryIdeas.mockImplementation(async (params: Record<string, string>) =>
      params.cursor === 'p2'
        ? page({
            ideas: [idea('far', { group_key: 'none' })],
            next_cursor: null,
          })
        : page({ next_cursor: 'p2' }),
    )
    Element.prototype.scrollIntoView = vi.fn()
    await renderSurface({ idea: 'far' })
    await waitFor(() =>
      expect(
        document
          .querySelector('[data-idea-id="far"]')
          ?.getAttribute('data-open'),
      ).toBe('true'),
    )
    expect(api.queryIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: 'p2' }),
    )
  })
})
