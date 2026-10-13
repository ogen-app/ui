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
import { useState } from 'react'
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
  }: {
    total?: number
    filter?: AssetFilter
    params?: Record<string, string>
  } = {},
) {
  return {
    onDeleteMany,
    ui: (
      <ContentList
        campaignId={null}
        list={listOf([POSITIONING, TRANSCRIPT], total, Math.max(total, 5))}
        params={params}
        filter={filter}
        onFilterChange={() => {}}
        sort="-updated_at"
        onSortChange={() => {}}
        grouping="ideas"
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
  it('selects every match from the filter bar, and deletes all N', async () => {
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

describe('the filter bar', () => {
  it('answers with the count and offers to clear once something is filtered', async () => {
    const filter = withToken(EMPTY_FILTER, {
      field: 'kind',
      negated: false,
      values: ['pdf'],
    })
    const { ui } = show(undefined, { filter, total: 2 })
    await renderWithProviders(ui)
    expect(screen.getByText('2 of 5')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Clear all' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove filter: Type is PDF' }),
    ).toBeInTheDocument()
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
})
