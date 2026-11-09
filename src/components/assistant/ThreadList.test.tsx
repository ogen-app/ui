import { fireEvent, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import { ThreadList } from './ThreadList'

/**
 * The list is the server's (CON-459): what the workspace has talked in shows
 * after a reload, with nothing read from browser storage.
 */

function serve(threads: object[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('/api/assistant/threads')
        ? new Response(JSON.stringify(threads), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response('[]', { status: 200 }),
    ),
  )
}

const listed = {
  scope: 'campaign:c9',
  scope_kind: 'campaign',
  scope_id: 'c9',
  title: 'Autumn sale',
  last_message_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  last_role: 'model',
  preview: 'Spread the posts across October.',
  message_count: 4,
  archived: false,
}

beforeEach(() => useAssistantStore.getState().reset())
afterEach(() => vi.unstubAllGlobals())

describe('ThreadList', () => {
  it('lists a thread this tab never opened, and opens it where the user is', async () => {
    serve([listed])
    const here = useAssistantStore
      .getState()
      .openThread({ kind: 'campaign', campaignId: 'c1' }, '', 'Spring launch')
    await renderWithProviders(<ThreadList />)

    expect(await screen.findByText('Autumn sale')).toBeTruthy()
    expect(
      screen.getByText('5 minutes ago · Spread the posts across October.'),
    ).toBeTruthy()
    // History is the workspace's and survives, so there is nothing to close.
    expect(screen.queryByLabelText('Close this conversation')).toBeNull()

    fireEvent.click(screen.getByText('Autumn sale'))
    const state = useAssistantStore.getState()
    expect(state.activeThreadId).toBe('campaign:c9')
    expect(state.currentThreadId).toBe(here)
  })

  it('tags a thread whose campaign is archived', async () => {
    serve([{ ...listed, archived: true }])
    await renderWithProviders(<ThreadList />)
    expect(await screen.findByText('ARCHIVED')).toBeTruthy()
  })

  it('says nothing about an empty workspace until the list has answered', async () => {
    serve([])
    await renderWithProviders(<ThreadList />)
    expect(await screen.findByText('No conversations yet.')).toBeTruthy()
  })
})

describe('ThreadList in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the last message and its time', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    serve([
      {
        ...listed,
        last_message_at: new Date(Date.now() - 20_000).toISOString(),
      },
    ])
    await renderWithProviders(<ThreadList />)
    expect(
      await screen.findByText('ahora mismo · Spread the posts across October.'),
    ).toBeTruthy()
    expect(screen.queryByText(/just now/)).toBeNull()
  })
})
