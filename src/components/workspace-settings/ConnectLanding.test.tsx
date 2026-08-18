import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ConnectLanding } from './ConnectLanding'

const success = vi.fn()

vi.mock('@/stores/toastStore', () => ({
  toast: { success: (...a: unknown[]) => success(...a), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const render = (props: { connected?: string; connectError?: string }) =>
  renderWithProviders(<ConnectLanding {...props} />, { path: '/workspace-settings' })

beforeEach(() => {
  success.mockReset()
})

describe('ConnectLanding', () => {
  it('confirms a finished connect and clears the parameter', async () => {
    const { router } = await render({ connected: 'linkedin' })

    await waitFor(() => expect(success).toHaveBeenCalledTimes(1))
    // The platform is named, not echoed as Zernio's wire id.
    expect(success.mock.calls[0][0]).toMatch(/LinkedIn is connected/)

    // Stripped, so a reload doesn't re-announce a connect from a minute ago
    // and a copied link carries none of this.
    await waitFor(() => expect(router.state.location.search).toEqual({}))
    expect(screen.getByText(/finishing setup/i)).toBeInTheDocument()
  })

  it('words the failure codes and clears them too', async () => {
    const { router } = await render({ connectError: 'no_targets' })

    expect(
      await screen.findByText(/doesn’t have any pages or profiles/i),
    ).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toEqual({}))
    expect(success).not.toHaveBeenCalled()
  })

  it('falls back rather than printing a code it does not know', async () => {
    // A new `connect_error` shipped on the backend must not surface as jargon.
    await render({ connectError: 'some_future_code' })

    expect(await screen.findByText(/couldn’t connect your account/i)).toBeInTheDocument()
    expect(screen.queryByText(/some_future_code/)).not.toBeInTheDocument()
  })

  it('renders nothing when the page was opened normally', async () => {
    const { container } = await render({})

    expect(success).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })
})
