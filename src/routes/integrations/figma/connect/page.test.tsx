import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { i18next, loadLocaleResources } from '@/i18n'
import { setActiveWorkspaceId } from '@/lib/activeWorkspace'
import { renderWithProviders } from '@/test/renderWithProviders'
import FigmaConnectPage from './page'

/**
 * The approval page a Figma plugin opens (CON-339). The fetch is stubbed per
 * route so each state is reached the way the server would reach it.
 */

const PATH = '/integrations/figma/connect/'

const WORKSPACES = [
  {
    id: 'ws-a',
    name: 'Acme',
    role: 'owner',
    member_count: 3,
    is_default: true,
  },
  {
    id: 'ws-b',
    name: 'Beta Co',
    role: 'member',
    member_count: 5,
    is_default: false,
  },
]

const PENDING = {
  client: 'figma',
  client_label: 'Figma · Jane Doe',
  status: 'pending',
  created_ip: '203.0.113.7',
  created_at: '2026-10-06T10:00:00Z',
  expires_at: '2026-10-06T10:10:00Z',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Answer = (init: RequestInit) => Response

function serve(routes: Record<string, Response | Answer>) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const match = routes[url]
    if (!match) return json(404, { error: 'not found' })
    return typeof match === 'function' ? match(init) : match.clone()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const render = (search = '?key=wk') =>
  renderWithProviders(<FigmaConnectPage />, { path: PATH, search })

beforeEach(() => {
  setActiveWorkspaceId('ws-b')
})

afterEach(() => {
  setActiveWorkspaceId(null)
  vi.unstubAllGlobals()
})

describe('Figma connect page', () => {
  it('says the link expired when there is no key', async () => {
    serve({})
    await render('')
    expect(await screen.findByText('This link has expired')).toBeTruthy()
  })

  it('says the link expired on a 410', async () => {
    serve({
      '/api/integrations/figma/pairings/wk': json(410, {
        code: 'pairing_expired',
      }),
    })
    await render()
    expect(await screen.findByText('This link has expired')).toBeTruthy()
  })

  it('offers a retry when the preview fails for another reason', async () => {
    serve({ '/api/integrations/figma/pairings/wk': json(500, {}) })
    await render()
    expect(await screen.findByText('Something went wrong')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('says a request that was already answered was', async () => {
    serve({
      '/api/integrations/figma/pairings/wk': json(200, {
        ...PENDING,
        status: 'approved',
      }),
    })
    await render()
    expect(await screen.findByText('Already answered')).toBeTruthy()
  })

  it('defaults to the tab’s workspace, and names it in the warning', async () => {
    serve({
      '/api/integrations/figma/pairings/wk': json(200, PENDING),
      '/api/workspaces': json(200, WORKSPACES),
    })
    await render()
    expect(await screen.findByText('Figma · Jane Doe')).toBeTruthy()
    expect(screen.getByText(/203\.0\.113\.7/)).toBeTruthy()
    const checked = await screen.findByRole('radio', { checked: true })
    expect(checked.textContent).toContain('Beta Co')
    expect(
      screen.getByText(/Only allow this if you just clicked/).textContent,
    ).toContain('Beta Co')
  })

  it('approves in the workspace the user picked', async () => {
    let sent: Record<string, string> | undefined
    serve({
      '/api/integrations/figma/pairings/wk': json(200, PENDING),
      '/api/workspaces': json(200, WORKSPACES),
      '/api/integrations/figma/pairings/wk/approve': (init) => {
        sent = init.headers as Record<string, string>
        return json(200, {
          connection: {
            id: 'pt_1',
            client: 'figma',
            label: 'Figma · Jane Doe',
            created_at: PENDING.created_at,
            last_used_at: null,
          },
        })
      },
    })
    await render()
    fireEvent.click(await screen.findByRole('radio', { name: /Acme/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    expect(await screen.findByText('Connected')).toBeTruthy()
    expect(sent).toEqual({ 'X-Workspace-Id': 'ws-a' })
    expect(screen.getByText(/can now send images to/).textContent).toContain(
      'Acme',
    )
  })

  it('shows "already answered" when the approve loses the race (409)', async () => {
    serve({
      '/api/integrations/figma/pairings/wk': json(200, PENDING),
      '/api/workspaces': json(200, WORKSPACES),
      '/api/integrations/figma/pairings/wk/approve': json(409, {
        code: 'pairing_not_pending',
        error: 'already answered',
      }),
    })
    await render()
    await screen.findByRole('radio', { checked: true })
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    expect(await screen.findByText('Already answered')).toBeTruthy()
  })

  it('confirms a denial', async () => {
    serve({
      '/api/integrations/figma/pairings/wk': json(200, PENDING),
      '/api/workspaces': json(200, WORKSPACES),
      '/api/integrations/figma/pairings/wk/deny': new Response(null, {
        status: 204,
      }),
    })
    await render()
    await screen.findByRole('radio', { checked: true })
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }))
    expect(await screen.findByText('Request denied')).toBeTruthy()
  })

  it('keeps the choice open after a failure that says nothing about the request', async () => {
    serve({
      '/api/integrations/figma/pairings/wk': json(200, PENDING),
      '/api/workspaces': json(200, WORKSPACES),
      '/api/integrations/figma/pairings/wk/approve': json(500, {}),
    })
    await render()
    await screen.findByRole('radio', { checked: true })
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Allow' })).toBeTruthy()
  })
})

describe('Figma connect page, in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('renders the consent from the catalogue', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    serve({
      '/api/integrations/figma/pairings/wk': json(200, PENDING),
      '/api/workspaces': json(200, WORKSPACES),
    })
    await render()
    await screen.findByRole('radio', { checked: true })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Permitir' })).toBeTruthy(),
    )
    expect(screen.getByText(/Permítelo solo si/)).toBeTruthy()
    expect(screen.queryByText(/Only allow this/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull()
  })
})
