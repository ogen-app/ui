import { useState } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import {
  EMPTY_FILTER,
  tokensOf,
  withToken,
  type AssetFilter,
} from '@/lib/assetFilter'
import type { AssetListPage } from '@/types/assetList'
import { AssetFilterBar } from './AssetFilterBar'
import { useFilterVocabulary } from './useFilterVocabulary'

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({
    data: [
      { id: 't1', name: 'Gartner', color: '' },
      { id: 't2', name: 'Finance', color: '' },
      { id: 't3', name: 'DevOps', color: '' },
    ],
  }),
}))
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({
    data: [{ id: 'c1', name: 'Finance Q4 thought leadership' }],
  }),
  useArchivedCampaigns: () => ({ data: [] }),
}))
// The counts beside free text are the server's; here, a fixed answer.
vi.mock('@/hooks/useContent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useContent')>()),
  assetCountQuery: (params: unknown) => ({
    queryKey: ['assets', 'list', 'count', params],
    queryFn: async () => 5,
  }),
}))

const FACETS: AssetListPage['facets'] = {
  kind: [
    { value: 'pdf', count: 24 },
    { value: 'web', count: 6 },
    { value: 'audio', count: 0 },
  ],
  tag: [
    { value: 't1', count: 7 },
    { value: 't2', count: 3 },
    { value: 't3', count: 2 },
    { value: 'none', count: 27 },
  ],
  campaign: [
    { value: 'c1', count: 2 },
    { value: 'none', count: 37 },
  ],
}

function Harness({
  initial = EMPTY_FILTER,
  onChange,
}: {
  initial?: AssetFilter
  onChange: (next: AssetFilter) => void
}) {
  const [filter, setFilter] = useState(initial)
  const vocabulary = useFilterVocabulary({ facets: FACETS, scoped: false })
  return (
    <AssetFilterBar
      filter={filter}
      onChange={(next) => {
        setFilter(next)
        onChange(next)
      }}
      vocabulary={vocabulary}
      total={4}
      totalUnfiltered={41}
      paramsFor={() => ({})}
    />
  )
}

async function mount(initial?: AssetFilter) {
  const onChange = vi.fn()
  await renderWithProviders(<Harness initial={initial} onChange={onChange} />)
  const input = screen.getByRole('combobox')
  return { onChange, input }
}

const last = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls[fn.mock.calls.length - 1][0] as AssetFilter

describe('AssetFilterBar', () => {
  it('builds a token by keyboard alone: field, operator, value', async () => {
    const { onChange, input } = await mount()
    await userEvent.click(input)
    expect(screen.getByText('Choose a field')).toBeInTheDocument()

    // Title, then Type.
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByRole('option', { name: 'is not' })).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    // Most-used first, with the server's count beside each.
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('PDF24')
    await userEvent.keyboard('{Enter}')

    expect(tokensOf(last(onChange))).toEqual([
      { field: 'kind', negated: false, values: ['pdf'] },
    ])
    expect(
      screen.getByRole('button', { name: 'Remove filter: Type is PDF' }),
    ).toBeInTheDocument()
    expect(screen.getByText('4 of 41')).toBeInTheDocument()
  })

  it('dims a value that would leave nothing rather than removing it', async () => {
    const { input } = await mount()
    await userEvent.type(input, 'type:')
    expect(screen.getByText('Recording')).toHaveClass(
      'text-tertiary-foreground',
    )
  })

  it('ticks several values into one token', async () => {
    const { onChange, input } = await mount()
    // The old syntax, as an accelerator to the Tag value step.
    await userEvent.type(input, 'tag:')
    await userEvent.keyboard(' {ArrowDown}{Enter}')
    expect(last(onChange).tag.any).toEqual(['t1', 't2'])
    expect(
      screen.getByRole('button', {
        name: 'Change filter: Tag is Gartner or Finance',
      }),
    ).toBeInTheDocument()
  })

  it('offers the values words match, and commits one in a keystroke', async () => {
    const { onChange, input } = await mount()
    await userEvent.type(input, 'finance')
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Matching values')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('option', { name: /Campaign is Finance Q4/ }),
    )
    expect(last(onChange).campaign.any).toEqual(['c1'])
  })

  it('searches titles and inside the documents from free text', async () => {
    const { onChange, input } = await mount()
    await userEvent.type(input, 'overwintering')
    expect(
      screen.getByRole('option', { name: /Text mentions “overwintering”/ }),
    ).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(last(onChange).title.any).toEqual(['overwintering'])
  })

  it('steps back on Backspace, then picks out the last token and removes it', async () => {
    const filter = withToken(EMPTY_FILTER, {
      field: 'kind',
      negated: false,
      values: ['pdf'],
    })
    const { onChange, input } = await mount(filter)
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{Enter}{Enter}')
    // value → operator → field
    await userEvent.keyboard('{Backspace}')
    expect(screen.getByRole('option', { name: 'is not' })).toBeInTheDocument()
    await userEvent.keyboard('{Backspace}{Backspace}')
    expect(
      screen.getByText('Backspace again removes it · Enter edits it'),
    ).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.keyboard('{Backspace}')
    expect(tokensOf(last(onChange))).toEqual([])
  })

  it('reopens a token’s value step with its values ticked', async () => {
    const filter = withToken(EMPTY_FILTER, {
      field: 'tag',
      negated: false,
      values: ['t1'],
    })
    await mount(filter)
    await userEvent.click(
      screen.getByRole('button', { name: 'Change filter: Tag is Gartner' }),
    )
    expect(screen.getByRole('checkbox', { name: 'Gartner' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Finance' })).not.toBeChecked()
  })
})

/**
 * The bar in Spanish. An English render cannot tell a catalogue entry from a
 * literal left in the component; this one can.
 */
describe('AssetFilterBar in Spanish', () => {
  beforeAll(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('reads every word from the catalogue', async () => {
    const filter = withToken(EMPTY_FILTER, {
      field: 'tag',
      negated: false,
      values: ['t1', 't2'],
    })
    const { input } = await mount(filter)
    expect(input).toHaveAccessibleName('Filtrar los recursos')
    expect(
      screen.getByRole('button', {
        name: 'Quitar filtro: Etiqueta es Gartner o Finance',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('4 de 41')).toBeInTheDocument()

    await userEvent.click(input)
    expect(screen.getByText('Elige un campo')).toBeInTheDocument()
    expect(screen.getByText('Actualizado')).toBeInTheDocument()
    // The English that would be there had any of it been written in.
    expect(screen.queryByText('Choose a field')).not.toBeInTheDocument()
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
    expect(screen.queryByText('move')).not.toBeInTheDocument()
  })
})
