import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useAssistantStore } from '@/stores/assistantStore'
import { useAddSourceRequestStore } from '@/stores/addSourceRequestStore'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SidebarProvider } from '@/components/ui/sidebar'

/**
 * What the page is allowed to say about an empty bank.
 *
 * The screen has one claim that cannot be taken back once a user acts on it:
 * *nothing is filed here*, under three buttons offering to file the first
 * document. It is only true when the server has answered with an empty list —
 * and the bug this suite pins is the read that never got an answer at all
 * being mistaken for one.
 *
 * `useAssetList` is stood in for rather than driven through a query client,
 * because the state under test is not reachable by failing a `fetch`: a
 * paused query is what TanStack parks a retry in when the tab is hidden or
 * the browser is offline, and jsdom has neither. The four shapes below are
 * the four a query result actually takes, and every one of them is checked
 * against the real `UseQueryResult` by the cast the mock carries.
 */
const state = vi.hoisted(() => ({
  status: 'pending' as 'pending' | 'error' | 'success',
  fetchStatus: 'fetching' as 'fetching' | 'paused' | 'idle',
  data: undefined as { pages: unknown[] } | undefined,
  isError: false,
  /** Derived exactly as TanStack derives it, so the trap is reproduced here. */
  isLoading: true,
}))

const page = vi.hoisted(() => ({ rows: [] as unknown[], totalUnfiltered: 0 }))

vi.mock('@/hooks/useContent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useContent')>()),
  useAssetList: () => ({
    query: state,
    rows: page.rows,
    total: page.rows.length,
    totalUnfiltered: page.totalUnfiltered,
    facets: {},
    groups: [],
    ideasUndecidedTotal: 0,
  }),
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
        <ContentPage campaign={null} search={{}} onSearchChange={() => {}} />
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
        <ContentPage campaign={null} search={{}} onSearchChange={() => {}} />
      </SidebarProvider>,
    )
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
    expect(screen.getByText('LOADING')).toBeInTheDocument()
  })

  it('says the read failed when it failed', async () => {
    given({ status: 'error', fetchStatus: 'idle', isError: true })
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage campaign={null} search={{}} onSearchChange={() => {}} />
      </SidebarProvider>,
    )
    expect(
      screen.getByText('Unable to load the content bank'),
    ).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
  })

  it('offers to file the first document once the server has said there are none', async () => {
    given({ status: 'success', fetchStatus: 'idle', data: { pages: [] } })
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage campaign={null} search={{}} onSearchChange={() => {}} />
      </SidebarProvider>,
    )
    expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
  })

  it('opens ADD CONTENT once when the assistant asks for a source (CON-474)', async () => {
    given({ status: 'success', fetchStatus: 'idle', data: { pages: [] } })
    const opened = vi.fn()
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage
          campaign={null}
          search={{}}
          onSearchChange={() => {}}
          addSource="source"
          onAddSourceOpened={opened}
        />
      </SidebarProvider>,
    )
    // The ways in are offered; none of them is taken for the user.
    expect(
      screen.getByRole('menuitem', { name: 'Upload file' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Add a web page' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opened).toHaveBeenCalledTimes(1)
  })

  it('opens the upload itself when the assistant names it (CON-484)', async () => {
    given({ status: 'success', fetchStatus: 'idle', data: { pages: [] } })
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage
          campaign={null}
          search={{}}
          onSearchChange={() => {}}
          addSource="upload"
        />
      </SidebarProvider>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('says the assistant opened it, with BACK that takes the rail’s way back (CON-484)', async () => {
    given({ status: 'success', fetchStatus: 'idle', data: { pages: [] } })
    const undoUiAction = vi.fn(async () => {})
    useAssistantStore.setState({ undoUiAction })
    useAddSourceRequestStore.getState().mark({
      campaignId: null,
      threadId: 'workspace',
      turnId: 't1',
      index: 0,
    })
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage campaign={null} search={{}} onSearchChange={() => {}} />
      </SidebarProvider>,
    )
    expect(
      screen.getByText(
        'Opened by the assistant — the request waits until a file is read.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText('BACK'))
    expect(undoUiAction).toHaveBeenCalledWith('workspace', 't1', 0)
  })

  it('keeps ADD CONTENT closed otherwise', async () => {
    given({ status: 'success', fetchStatus: 'idle', data: { pages: [] } })
    await renderWithProviders(
      <SidebarProvider>
        <ContentPage campaign={null} search={{}} onSearchChange={() => {}} />
      </SidebarProvider>,
    )
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })
})
