import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SidebarProvider } from '@/components/ui/sidebar'
import { ZernioError } from '@/types/integrations'
import { ConnectPicker } from './ConnectPicker'

const getPendingConnection = vi.fn()
const selectPendingTarget = vi.fn()

vi.mock('@/services/api/zernio', () => ({
  getPendingConnection: (...a: unknown[]) => getPendingConnection(...a),
  selectPendingTarget: (...a: unknown[]) => selectPendingTarget(...a),
  createConnectLink: vi.fn(),
  getZernioHealth: vi.fn(),
  listZernioAccounts: vi.fn(),
  disconnectZernioAccount: vi.fn(),
  triggerZernioSync: vi.fn(),
}))

const PENDING = {
  platform: 'linkedin',
  options: [
    { id: 'urn:org:1', name: 'Ogen', kind: 'organization' as const, username: 'ogen-app' },
    { id: 'urn:org:2', name: 'BN Digital', kind: 'organization' as const },
  ],
}

// The picker is a page, so it draws `PageHeader`, which reads the sidebar's
// context for the mobile menu button. Nothing here asserts on the sidebar; it
// is scaffolding the page cannot render without.
const render = () =>
  renderWithProviders(
    <SidebarProvider>
      <ConnectPicker connectionId="cn_1" />
    </SidebarProvider>,
    { path: '/workspace-settings/connect/cn_1' },
  )

beforeEach(() => {
  getPendingConnection.mockReset().mockResolvedValue(PENDING)
  selectPendingTarget.mockReset().mockResolvedValue(undefined)
})

describe('ConnectPicker', () => {
  it('connects the chosen target and returns to the accounts page', async () => {
    const user = userEvent.setup()
    const { router } = await render()

    await screen.findByRole('radio', { name: /BN Digital/ })
    await user.click(screen.getByRole('radio', { name: /BN Digital/ }))
    await user.click(screen.getByRole('button', { name: /connect linkedin/i }))

    await waitFor(() =>
      expect(selectPendingTarget).toHaveBeenCalledWith('cn_1', 'urn:org:2'),
    )
    // Back through the same door the zero-click connect uses, so the account
    // page shows the confirmation and waits for the sync (CON-217).
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/workspace-settings'),
    )
    expect(router.state.location.search).toEqual({ connected: 'linkedin' })
  })

  it('cannot submit until something is chosen', async () => {
    await render()

    await screen.findByRole('radio', { name: /Ogen/ })
    expect(screen.getByRole('button', { name: /connect linkedin/i })).toBeDisabled()
    expect(selectPendingTarget).not.toHaveBeenCalled()
  })

  it('offers to start again when the connection is gone', async () => {
    // Every way of missing — expired, already spent, another workspace's, never
    // existed — comes back as one 404, deliberately. All four mean the same
    // thing to the reader.
    getPendingConnection.mockRejectedValue(
      new ZernioError('connection_not_found', 404, 'connection_not_found'),
    )
    await render()

    expect(await screen.findByText(/expired or was already used/i)).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('treats a bare 404 as gone, not as an error to read', async () => {
    // A 404 that never reached the handler — an environment where the endpoint
    // isn't deployed, a proxy that swallows it — carries no `error` body, so
    // the code is `unknown`. The user's connect timed out either way; the
    // router's plumbing is not their problem.
    getPendingConnection.mockRejectedValue(
      new ZernioError('unknown', 404, 'Cannot GET /api/integrations/zernio/connect/pending/cn_1'),
    )
    await render()

    expect(await screen.findByText(/expired or was already used/i)).toBeInTheDocument()
    expect(screen.queryByText(/Cannot GET/)).not.toBeInTheDocument()
  })

  it('keeps the choice on screen when the platform hiccups', async () => {
    selectPendingTarget.mockRejectedValue(
      new ZernioError('integration_degraded', 502, 'integration_degraded'),
    )
    const user = userEvent.setup()
    await render()

    await screen.findByRole('radio', { name: /Ogen/ })
    await user.click(screen.getByRole('radio', { name: /Ogen/ }))
    await user.click(screen.getByRole('button', { name: /connect linkedin/i }))

    await screen.findByRole('alert')
    // Still choosable, and still chosen: a retry shouldn't cost the user the
    // decision they already made.
    expect(screen.getByRole('radio', { name: /Ogen/ })).toBeChecked()
    expect(screen.getByRole('button', { name: /connect linkedin/i })).toBeEnabled()
  })
})
