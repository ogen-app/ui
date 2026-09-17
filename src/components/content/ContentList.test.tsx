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
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import type { Asset } from '@/types/content'

/**
 * The table is stood in for, and only here.
 *
 * `AssetsTable` virtualises against a measured box, which in jsdom is zero
 * pixels tall and renders no rows at all — so a test driving the real one
 * would be asserting against an empty list. What is under test is the wiring
 * either side of it: a bin click reaching a confirmation rather than a delete,
 * and what the answer does to the selection. The stand-in offers exactly the
 * two controls a row has, and the prop it calls (`onDelete(asset)`) is typed
 * against the real component, so the seam it fakes cannot drift silently.
 */
vi.mock('@/components/tables/docsTable', () => ({
  AssetsTable: ({
    assets,
    onDelete,
    onToggleRow,
    selectedIds,
  }: {
    assets: Asset[]
    onDelete: (asset: Asset) => void
    onToggleRow?: (id: string) => void
    selectedIds?: Set<string>
  }) => (
    <div>
      {assets.map((asset) => (
        <div key={asset.id}>
          <button onClick={() => onToggleRow?.(asset.id)}>
            {`tick ${asset.id}`}
          </button>
          <button onClick={() => onDelete(asset)}>{`bin ${asset.id}`}</button>
        </div>
      ))}
      <p>{`ticked:${[...(selectedIds ?? [])].join(',')}`}</p>
    </div>
  ),
}))

const { ContentList } = await import('./ContentList')

function asset(id: string, title: string): Asset {
  return {
    id,
    title,
    content: '',
    status: 'ready',
    type: 'MD',
    alt_text: '',
    tag_ids: [],
    tags: [],
    created_by: 'u1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

const POSITIONING = asset('a1', 'Positioning')
const TRANSCRIPT = asset('a2', 'Interview transcript')

function show(onDeleteMany = vi.fn().mockResolvedValue(undefined)) {
  return {
    onDeleteMany,
    ui: (
      <ContentList
        campaignId={null}
        assets={[POSITIONING, TRANSCRIPT]}
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
  // The filter reads the workspace's tags; nothing here is about them.
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

describe('deleting one row', () => {
  /*
   * The regression this exists for. The bin used to call the delete directly:
   * one click, no dialog, and nothing anywhere in the product that undoes it.
   */
  it('asks first, and names the document it is asking about', async () => {
    const { ui, onDeleteMany } = show()
    await renderWithProviders(ui)

    await userEvent.click(screen.getByText('bin a1'))

    expect(
      screen.getByRole('heading', { name: 'Delete "Positioning"?' }),
    ).toBeInTheDocument()
    expect(onDeleteMany).not.toHaveBeenCalled()
  })

  it('deletes only that document once confirmed', async () => {
    const { ui, onDeleteMany } = show()
    await renderWithProviders(ui)

    await userEvent.click(screen.getByText('bin a2'))
    await userEvent.click(
      screen.getByRole('button', { name: 'DELETE DOCUMENT' }),
    )

    expect(onDeleteMany).toHaveBeenCalledWith(['a2'])
  })

  it('deletes nothing when the dialog is turned down', async () => {
    const { ui, onDeleteMany } = show()
    await renderWithProviders(ui)

    await userEvent.click(screen.getByText('bin a1'))
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

    await userEvent.click(screen.getByText('tick a1'))
    await userEvent.click(screen.getByText('bin a2'))
    await userEvent.click(
      screen.getByRole('button', { name: 'DELETE DOCUMENT' }),
    )

    expect(screen.getByText('ticked:a1')).toBeInTheDocument()
  })
})

describe('deleting a selection', () => {
  it('counts what it is about to delete, and empties the selection after', async () => {
    const { ui, onDeleteMany } = show()
    await renderWithProviders(ui)

    await userEvent.click(screen.getByText('tick a1'))
    await userEvent.click(screen.getByText('tick a2'))
    await userEvent.click(screen.getByRole('button', { name: /DELETE$/ }))

    expect(
      screen.getByRole('heading', { name: 'Delete 2 documents?' }),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'DELETE 2 DOCUMENTS' }),
    )

    expect(onDeleteMany).toHaveBeenCalledWith(['a1', 'a2'])
    expect(screen.getByText('ticked:')).toBeInTheDocument()
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

    await userEvent.click(screen.getByText('bin a1'))

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
