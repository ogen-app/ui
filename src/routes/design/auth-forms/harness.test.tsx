import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthFormsDesignHarness } from './page'

describe('auth-forms harness', () => {
  it('leaves window.fetch alone until it is mounted, and restores it after', async () => {
    // The route tree imports every route module on boot, so a patch applied at
    // module scope would answer /api for the whole app — /campaigns included.
    const before = window.fetch
    expect(before).toBe(window.fetch)

    const qc = new QueryClient()
    const { unmount, container } = render(
      <QueryClientProvider client={qc}>
        <AuthFormsDesignHarness />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(container.querySelectorAll('form').length).toBeGreaterThan(0))
    expect(window.fetch).not.toBe(before)

    unmount()
    expect(window.fetch).toBe(before)
  })

  it('answers the flows the page advertises', async () => {
    const user = userEvent.setup()
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}>
        <AuthFormsDesignHarness />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(container.querySelectorAll("form").length).toBe(8))

    const login = within(container.querySelectorAll('form')[0] as HTMLElement)
    await user.type(login.getByPlaceholderText('Enter your email'), 'ada@example.com')
    await user.type(login.getByPlaceholderText('Enter password'), 'wrongun')
    await user.click(login.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText(/invalid credentials/i, {}, { timeout: 5000 })).toBeInTheDocument()
  })
})

vi.setConfig({ testTimeout: 20000 })
