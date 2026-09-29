import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SidebarProvider } from '@/components/ui/sidebar'
import type { Asset } from '@/types/content'

/**
 * What the page is allowed to say about an empty bank.
 *
 * The screen has one claim that cannot be taken back once a user acts on it:
 * *nothing is filed here*, under three buttons offering to file the first
 * document. It is only true when the server has answered with an empty list —
 * and the bug this suite pins is the read that never got an answer at all
 * being mistaken for one.
 *
 * `useAssets` is stood in for rather than driven through a query client,
 * because the state under test is not reachable by failing a `fetch`: a
 * paused query is what TanStack parks a retry in when the tab is hidden or
 * the browser is offline, and jsdom has neither. The four shapes below are
 * the four a query result actually takes, and every one of them is checked
 * against the real `UseQueryResult` by the cast the mock carries.
 */
const state = vi.hoisted(() => ({
  status: 'pending' as 'pending' | 'error' | 'success',
  fetchStatus: 'fetching' as 'fetching' | 'paused' | 'idle',
  data: undefined as Asset[] | undefined,
  isError: false,
  /** Derived exactly as TanStack derives it, so the trap is reproduced here. */
  isLoading: true,
}))

vi.mock('@/hooks/useContent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useContent')>()),
  useAssets: () => state,
}))

/**
 * The table virtualises against a box jsdom measures as zero pixels tall, so
 * the real one draws no rows whatever it is handed — which is indistinguishable
 * from the empty state this suite is about. See `ContentList.test.tsx`.
 */
vi.mock('@/components/tables/docsTable', () => ({
  AssetsTable: ({ assets }: { assets: Asset[] }) => (
    <p>{`rows:${assets.length}`}</p>
  ),
}))

const { ContentPage } = await import('./ContentPage')

function given(next: Partial<typeof state>) {
  Object.assign(state, {
    status: 'pending',
    fetchStatus: 'fetching',
    data: undefined,
    isError: false,
    ...next,
  })
  state.isLoading =
    state.status === 'pending' && state.fetchStatus === 'fetching'
}

const EMPTY_STATE = 'Nothing is filed outside a campaign'

describe('ContentPage', () => {
  it('waits while the read is in flight', async () => {
    given({})
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage campaign={null} />
      </SidebarProvider>,
    )
    expect(screen.getByText('LOADING')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
  })

  it('keeps waiting while a failed read is paused, rather than reporting an empty bank', async () => {
    // The defect: a request that failed with the tab in the background stops
    // retrying until the tab is looked at again. `isLoading` is false there —
    // a paused query is not fetching — and `isError` is false too, so the page
    // drew its first-run state over a workspace holding eighteen documents.
    given({ fetchStatus: 'paused' })
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage campaign={null} />
      </SidebarProvider>,
    )
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
    expect(screen.getByText('LOADING')).toBeInTheDocument()
  })

  it('says the read failed when it failed', async () => {
    given({ status: 'error', fetchStatus: 'idle', isError: true })
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage campaign={null} />
      </SidebarProvider>,
    )
    expect(
      screen.getByText('Unable to load the content bank'),
    ).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
  })

  it('offers to file the first document once the server has said there are none', async () => {
    given({ status: 'success', fetchStatus: 'idle', data: [] })
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage campaign={null} />
      </SidebarProvider>,
    )
    expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
  })
})
