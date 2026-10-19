import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SidebarProvider } from '@/components/ui/sidebar'
import type { SavedView } from '@/services/api/savedViews'
import type { Campaign } from '@/types/campaigns'

/**
 * The Assets page's smart groups (CON-392): the Views dropdown at the
 * sentence's start, a group opened into the address, edited, and saved.
 */
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

vi.mock('@/hooks/useContent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useContent')>()),
  useAssetList: () => ({
    query: {
      status: 'success',
      fetchStatus: 'idle',
      data: { pages: [] },
      isError: false,
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      dataUpdatedAt: 0,
    },
    rows: [],
    total: 6,
    totalUnfiltered: 24,
    facets: {},
    groups: [],
    ideasUndecidedTotal: 0,
  }),
}))

const { ContentPage } = await import('./ContentPage')

const GARTNER: SavedView = {
  id: 'v1',
  surface: 'assets',
  name: 'Gartner research',
  query: 'group=tag&kind=pdf&sort=-updated_at',
  shared: true,
  createdBy: 'u1',
  createdAt: '2026-10-19T09:00:00Z',
  valid: true,
  canEdit: true,
  counts: { total: 6 },
}

const onSearchChange = vi.fn()

function renderPage(search = {}, campaign: Campaign | null = null) {
  return renderWithProviders(
    <SidebarProvider>
      <ContentPage
        campaign={campaign}
        search={search}
        onSearchChange={onSearchChange}
      />
    </SidebarProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  groups.listSavedViews.mockResolvedValue([GARTNER])
})

describe('the Assets page’s smart groups', () => {
  it('lists the groups with their counts and opens one into the address', async () => {
    await renderPage()
    await userEvent.click(
      screen.getByRole('button', { name: 'Views: All assets' }),
    )
    const item = await screen.findByRole('menuitem', {
      name: /^Gartner research/,
    })
    expect(item).toHaveTextContent('6')
    expect(groups.listSavedViews).toHaveBeenCalledWith('assets', {
      counts: ['total'],
      timeZone: expect.any(String),
    })

    await userEvent.click(item)
    expect(onSearchChange).toHaveBeenLastCalledWith({
      kind: 'pdf',
      sort: '-updated_at',
      group: 'tag',
      view: 'v1',
    })
  })

  it('marks an open group edited, and saves the changes over it', async () => {
    groups.updateSavedView.mockResolvedValue(GARTNER)
    await renderPage({
      kind: 'pdf',
      tag: 't1',
      sort: '-updated_at',
      group: 'tag',
      view: 'v1',
    })
    expect(await screen.findByText('edited')).toBeInTheDocument()
    // Clear belongs to no group; leaving it is the button's job.
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(groups.updateSavedView).toHaveBeenCalledWith('v1', {
      query: 'group=tag&kind=pdf&sort=-updated_at&tag=t1',
    })
  })

  it('saves a filter as a new group, with how it is read', async () => {
    groups.createSavedView.mockResolvedValue({ ...GARTNER, id: 'v2' })
    await renderPage({ kind: 'pdf', updated: '30d' })
    await userEvent.click(
      await screen.findByRole('button', { name: 'Save as group' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'SAVE GROUP' }))
    await waitFor(() =>
      expect(groups.createSavedView).toHaveBeenCalledWith({
        surface: 'assets',
        name: 'PDFs, updated in the last 30 days',
        shared: false,
        query: 'group=created&kind=pdf&sort=-created_at&updated=30d',
      }),
    )
  })

  it('has none on a campaign’s own page', async () => {
    await renderPage({}, {
      id: 'c1',
      name: 'Hotel de Russie',
      asset_ids: [],
      use_assets: false,
    } as unknown as Campaign)
    expect(screen.getByRole('group', { name: 'Filter' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Views:/ }),
    ).not.toBeInTheDocument()
    expect(groups.listSavedViews).not.toHaveBeenCalled()
  })
})
