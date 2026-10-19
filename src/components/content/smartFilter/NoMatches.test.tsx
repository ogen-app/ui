import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import {
  EMPTY_FILTER,
  searchFromFilter,
  tokensOf,
  withToken,
  type AssetFilter,
} from '@/lib/assetFilter'
import type { AssetQueryParams } from '@/types/assetList'
import { NoMatches } from './NoMatches'
import { useFilterVocabulary } from './useFilterVocabulary'

vi.mock('@/hooks/useTags', () => ({ useTags: () => ({ data: [] }) }))
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({ data: [] }),
  useArchivedCampaigns: () => ({ data: [] }),
}))

/**
 * The server, as far as this screen asks it anything: how many assets a
 * query leaves. Nothing was updated today, and there are 4 PDFs.
 */
vi.mock('@/services/api/content', () => ({
  queryAssets: vi.fn(async (params: AssetQueryParams) => ({
    assets: [],
    next_cursor: null,
    total: params.updated ? 0 : params.kind ? 4 : 41,
    total_unfiltered: 41,
    facets: {},
  })),
}))

function Harness({
  filter,
  onChange,
}: {
  filter: AssetFilter
  onChange: (next: AssetFilter) => void
}) {
  const vocabulary = useFilterVocabulary({ facets: {}, scoped: false })
  return (
    <NoMatches
      filter={filter}
      vocabulary={vocabulary}
      // The search params stand in for the request; same keys.
      paramsFor={(f) => searchFromFilter(f) as AssetQueryParams}
      onChange={onChange}
    />
  )
}

describe('NoMatches', () => {
  it('names the one filter in the way and offers removing exactly that', async () => {
    const filter = withToken(
      withToken(EMPTY_FILTER, {
        field: 'kind',
        negated: false,
        values: ['pdf'],
      }),
      { field: 'updated', negated: false, values: ['1d'] },
    )
    const onChange = vi.fn()
    await renderWithProviders(<Harness filter={filter} onChange={onChange} />)

    expect(
      screen.getByText('No assets match these filters'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Removing “updated today” would show 4.'),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove “updated today”' }),
    )
    expect(tokensOf(onChange.mock.calls[0][0])).toEqual([
      { field: 'kind', negated: false, values: ['pdf'] },
    ])

    await userEvent.click(
      screen.getByRole('button', { name: 'Clear all filters' }),
    )
    expect(tokensOf(onChange.mock.calls[1][0])).toEqual([])
  })
})
