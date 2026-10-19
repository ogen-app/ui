import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { useState, type ComponentProps } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import { EMPTY_FILTER, withToken, type AssetFilter } from '@/lib/assetFilter'
import type { AssetListItem } from '@/types/assetList'

/** Select all asks the server for every matching id; nothing else here does. */
const ids = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/services/api/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/content')>()),
  queryAssetIds: ids.fn,
}))

const { ContentList } = await import('./ContentList')
const { useFilterVocabulary } =
  await import('./smartFilter/useFilterVocabulary')

/** The list as the page draws it: with the page's filter vocabulary. */
function WithVocabulary(
  props: Omit<ComponentProps<typeof ContentList>, 'vocabulary' | 'clearable'>,
) {
  const vocabulary = useFilterVocabulary({ facets: {}, scoped: false })
  return <ContentList {...props} vocabulary={vocabulary} clearable />
}

function asset(id: string, title: string): AssetListItem {
  return {
    id,
    title,
    type: 'MD',
    kind: 'note',
    status: 'ready',
    failure_code: '',
    source_url: null,
    analysis_status: null,
    file: null,
    tags: [],
    campaign_ids: [],
    idea_counts: { waiting: 0, yes: 0, later: 0, no: 0 },
    gist: null,
    next_idea: null,
    published_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

const POSITIONING = asset('a1', 'Positioning')
const TRANSCRIPT = asset('a2', 'Interview transcript')

/** The list as `useAssetList` answers it: a page of rows and the totals. */
function listOf(
  rows: AssetListItem[],
  total = rows.length,
  unfiltered = total,
) {
  return {
    query: {
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
      fetchNextPage: vi.fn(),
      dataUpdatedAt: Date.parse('2026-01-02T00:00:00Z'),
    },
    rows,
    total,
    totalUnfiltered: unfiltered,
    facets: {},
    groups: [],
    ideasUndecidedTotal: 0,
  } as never
}

function show(
  onDeleteMany = vi.fn().mockResolvedValue(undefined),
  {
    total = 2,
    filter = EMPTY_FILTER,
    params = {},
    onFilterChange = () => {},
  }: {
    total?: number
    filter?: AssetFilter
    params?: Record<string, string>
    onFilterChange?: (next: AssetFilter) => void
  } = {},
) {
  return {
    onDeleteMany,
    ui: (
      <WithVocabulary
        campaignId={null}
        list={listOf([POSITIONING, TRANSCRIPT], total, Math.max(total, 5))}
        params={params}
        filter={filter}
        onFilterChange={onFilterChange}
        sort="-updated_at"
        onSortChange={() => {}}
        grouping="created"
        onGroupingChange={() => {}}
        paramsFor={() => ({})}
        uploads={[]}
        onDeleteMany={onDeleteMany}
        onWrite={() => {}}
        onUpload={() => {}}
        onAddWebPage={() => {}}
      />
    ),
  }
}

beforeEach(() => {
  ids.fn.mockReset()
  // The filter reads the workspace's tags and campaigns; nothing here is
  // about them.
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response('[]', { headers: { 'Content-Type': 'application/json' } }),
      ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A row's own controls, by the names a screen reader hears. */
const tick = (title: string) =>
  userEvent.click(screen.getByRole('checkbox', { name: `Select ${title}` }))
const bin = (title: string) =>
  userEvent.click(screen.getByRole('button', { name: `Delete ${title}` }))
const ticked = (title: string) =>
  screen.getByRole('checkbox', { name: `Select ${title}` })

describe('deleting one row', () => {
  /*
   * The regression this exists for. The bin used to call the delete directly:
   * one click, no dialog, and nothing anywhere in the product that undoes it.
   */
  it('asks first, and names the document it is asking about', async () => {
    const { ui, onDeleteMany } = show()
    await renderWithProviders(ui)

    await bin('Positioning')

    expect(
      screen.getByRole('heading', { name: 'Delete "Positioning"?' }),
    ).toBeInTheDocument()
    expect(onDeleteMany).not.toHaveBeenCalled()
  })

  it('deletes only that document once confirmed', async () => {
    const { ui, onDeleteMany } = show()
    await renderWithProviders(ui)

    await bin('Interview transcript')
    await userEvent.click(
      screen.getByRole('button', { name: 'DELETE DOCUMENT' }),
    )

    expect(onDeleteMany).toHaveBeenCalledWith(['a2'])
  })

  it('deletes nothing when the dialog is turned down', async () => {
    const { ui, onDeleteMany } = show()
    await renderWithProviders(ui)

    await bin('Positioning')
    await userEvent.click(screen.getByRole('button', { name: 'KEEP DOCUMENT' }))

    expect(onDeleteMany).not.toHaveBeenCalled()
    expect(screen.queryByText('Delete "Positioning"?')).not.toBeInTheDocument()
  })

  /*
   * A row's bin and the selection are different gestures on the same screen,
   * and binning a row nobody ticked must not throw away a selection somebody
   * spent a minute building.
   */
  it('leaves a selection that was not what it deleted', async () => {
    const { ui } = show()
    await renderWithProviders(ui)

    await tick('Positioning')
    await bin('Interview transcript')
    await userEvent.click(
      screen.getByRole('button', { name: 'DELETE DOCUMENT' }),
    )

    expect(ticked('Positioning')).toBeChecked()
  })
})

describe('deleting a selection', () => {
  it('counts what it is about to delete, and empties the selection after', async () => {
    const { ui, onDeleteMany } = show()
    await renderWithProviders(ui)

    await tick('Positioning')
    await tick('Interview transcript')
    await userEvent.click(screen.getByRole('button', { name: /DELETE$/ }))

    expect(
      screen.getByRole('heading', { name: 'Delete 2 documents?' }),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'DELETE 2 DOCUMENTS' }),
    )

    expect(onDeleteMany).toHaveBeenCalledWith(['a1', 'a2'])
    expect(ticked('Positioning')).not.toBeChecked()
    expect(ticked('Interview transcript')).not.toBeChecked()
  })
})

describe('select all', () => {
  /*
   * The list is fifty rows at a time, so the box on the filter bar selects the
   * whole match by asking the server for its ids — never just what is loaded —
   * and the delete it leads to names the count it will act on.
   */
  it('selects every match from the Group by line, and deletes all N', async () => {
    ids.fn.mockResolvedValue(['a1', 'a2', 'a3', 'a4', 'a5'])
    const { ui, onDeleteMany } = show(undefined, {
      total: 5,
      params: { kind: 'pdf', sort: '-updated_at' },
    })
    await renderWithProviders(ui)

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select all 5 documents' }),
    )

    expect(ids.fn).toHaveBeenCalledWith({ kind: 'pdf', sort: '-updated_at' })
    expect(await screen.findByText('5 selected')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /DELETE$/ }))
    expect(
      screen.getByRole('heading', { name: 'Delete 5 documents?' }),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'DELETE 5 DOCUMENTS' }),
    )
    expect(onDeleteMany).toHaveBeenCalledWith(['a1', 'a2', 'a3', 'a4', 'a5'])
  })

  it('shows a dash while some are selected, and clears once all are', async () => {
    ids.fn.mockResolvedValue(['a1', 'a2'])
    const { ui } = show(undefined, { total: 2 })
    await renderWithProviders(ui)

    await tick('Positioning')
    const box = screen.getByRole('checkbox', { name: 'Select all 2 documents' })
    expect(box).toHaveAttribute('aria-checked', 'mixed')

    await userEvent.click(box)
    const full = await screen.findByRole('checkbox', {
      name: 'Clear the selection',
    })
    expect(full).toBeChecked()

    await userEvent.click(full)
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument()
  })

  /*
   * The same rule across a request: an answer for the previous filter that
   * lands after the filter changed must not put its ids back.
   */
  it('drops an answer that arrives after the filter changed', async () => {
    let answer: (ids: string[]) => void = () => {}
    ids.fn.mockReturnValue(new Promise<string[]>((r) => (answer = r)))
    function Harness() {
      const [params, setParams] = useState<Record<string, string>>({
        kind: 'pdf',
      })
      return (
        <>
          <button onClick={() => setParams({ kind: 'web' })}>refilter</button>
          {show(undefined, { total: 5, params }).ui}
        </>
      )
    }
    await renderWithProviders(<Harness />)
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select all 5 documents' }),
    )
    await userEvent.click(screen.getByText('refilter'))
    answer(['a1', 'a2', 'a3', 'a4', 'a5'])
    await Promise.resolve()

    expect(ticked('Positioning')).not.toBeChecked()
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument()
  })

  /* A set picked under one question must not be deleted under another. */
  it('empties the selection when the question changes, not the order', async () => {
    function Harness() {
      const [params, setParams] = useState<Record<string, string>>({
        kind: 'pdf',
      })
      return (
        <>
          <button onClick={() => setParams({ kind: 'pdf', sort: 'title' })}>
            resort
          </button>
          <button onClick={() => setParams({ kind: 'pdf', group: 'tag' })}>
            regroup
          </button>
          <button onClick={() => setParams({ kind: 'web' })}>refilter</button>
          {show(undefined, { params }).ui}
        </>
      )
    }
    await renderWithProviders(<Harness />)
    await tick('Positioning')
    expect(ticked('Positioning')).toBeChecked()

    // Another order, or another grouping, is the same question.
    await userEvent.click(screen.getByText('resort'))
    await userEvent.click(screen.getByText('regroup'))
    expect(ticked('Positioning')).toBeChecked()

    await userEvent.click(screen.getByText('refilter'))
    expect(ticked('Positioning')).not.toBeChecked()
  })
})

describe('the filter sentence', () => {
  const sentence = () => screen.getByRole('group', { name: 'Filter' })

  it('reads "Showing all assets" with nothing chosen', async () => {
    await renderWithProviders(show().ui)
    expect(sentence()).toHaveTextContent('Showing all assets')
  })

  it('names what is listed by its type, and reads the rest in order', async () => {
    let filter = withToken(EMPTY_FILTER, {
      field: 'status',
      negated: false,
      values: ['partial'],
    })
    filter = withToken(filter, {
      field: 'kind',
      negated: false,
      values: ['pdf', 'web'],
    })
    filter = withToken(filter, {
      field: 'title',
      negated: false,
      values: ['q4'],
    })
    filter = withToken(filter, {
      field: 'updated',
      negated: false,
      values: ['30d'],
    })
    await renderWithProviders(show(undefined, { filter, total: 2 }).ui)
    expect(sentence()).toHaveTextContent(
      'Showing PDFs or web pages, with “q4” in the title, only partly read, updated in the last 30 days',
    )
    expect(sentence()).toHaveTextContent('2 of 5')
  })

  it('falls back to "assets" when a type is left out', async () => {
    const filter = withToken(EMPTY_FILTER, {
      field: 'kind',
      negated: true,
      values: ['pdf'],
    })
    await renderWithProviders(show(undefined, { filter }).ui)
    expect(sentence()).toHaveTextContent('Showing assets that aren’t PDFs')
  })

  it('removes a clause and clears them all', async () => {
    const onFilterChange = vi.fn()
    const filter = withToken(EMPTY_FILTER, {
      field: 'kind',
      negated: false,
      values: ['pdf'],
    })
    await renderWithProviders(
      show(undefined, { filter, total: 2, onFilterChange }).ui,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove: PDFs' }))
    expect(onFilterChange).toHaveBeenLastCalledWith(EMPTY_FILTER)
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onFilterChange).toHaveBeenLastCalledWith(EMPTY_FILTER)
  })

  it('offers both searches when typing — inside the documents and in the title', async () => {
    const onFilterChange = vi.fn()
    await renderWithProviders(show(undefined, { onFilterChange }).ui)
    await userEvent.click(screen.getByRole('button', { name: /add a detail/ }))
    const field = screen.getByRole('combobox', { name: 'add a detail' })
    await userEvent.type(field, 'garden')
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toContain('mentioning “garden”')
    expect(options).toContain('with “garden” in the title')

    await userEvent.click(screen.getByText(/in the title/))
    expect(onFilterChange).toHaveBeenLastCalledWith(
      withToken(EMPTY_FILTER, {
        field: 'title',
        negated: false,
        values: ['garden'],
      }),
    )
  })

  it('takes a day, never a preset, for "updated before"', async () => {
    await renderWithProviders(show().ui)
    await userEvent.click(screen.getByRole('button', { name: /add a detail/ }))
    await userEvent.click(screen.getByText('updated…'))
    const panel = () => screen.getByRole('dialog', { name: 'Assets updated…' })
    expect(panel()).toHaveTextContent('Last 7 days')
    await userEvent.click(screen.getByRole('radio', { name: 'before' }))
    // The day's own field, with no presets to choose from.
    expect(panel()).not.toHaveTextContent('Last 7 days')
    expect(screen.getByText('Before')).toBeInTheDocument()
  })
})

/**
 * The confirmation in a language that is not English.
 *
 * An English-only suite cannot tell a catalogue entry from a literal left in
 * the component — they render identically. This is the one assertion that can,
 * and it is what makes the copy above evidence of a conversion rather than of
 * a string that happens to be in English.
 */
describe('in Spanish', () => {
  beforeAll(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })

  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('names the document and warns in Spanish', async () => {
    const { ui } = show()
    await renderWithProviders(ui)

    await userEvent.click(
      screen.getByRole('button', { name: 'Eliminar Positioning' }),
    )

    expect(
      screen.getByRole('heading', { name: '¿Eliminar «Positioning»?' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'ELIMINAR DOCUMENTO' }),
    ).toBeInTheDocument()
    // The English that used to be written into the component.
    expect(screen.queryByText(/permanently deleted/)).not.toBeInTheDocument()
  })

  it('reads the sentence in Spanish', async () => {
    const filter = withToken(EMPTY_FILTER, {
      field: 'kind',
      negated: false,
      values: ['pdf'],
    })
    await renderWithProviders(show(undefined, { filter, total: 2 }).ui)
    expect(screen.getByRole('group', { name: 'Filtro' })).toHaveTextContent(
      'Mostrando PDF',
    )
    expect(
      screen.getByRole('button', { name: 'Quitar: PDF' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })
})
