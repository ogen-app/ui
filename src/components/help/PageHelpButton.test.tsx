import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as help from '@/services/help'
import { useHelpStore } from '@/stores/helpStore'
import { PageHelpButton } from './PageHelpButton'

/**
 * The page header's "?" — on every screen, so it is held to the trigger's two
 * rules: invisible and free with the flag off, invisible with nothing written.
 */

vi.mock('@/config/featureFlags', () => ({
  useFeatureFlag: vi.fn(() => false),
}))

const { useFeatureFlag } = await import('@/config/featureFlags')

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const INDEX = { topics: {}, pages: { posts: 'page-posts' } }

beforeEach(() => {
  useHelpStore.setState({ isOpen: false, history: [], page: 'posts' })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(useFeatureFlag).mockReturnValue(false)
})

describe('PageHelpButton', () => {
  it('renders nothing and needs no Query client while the flag is off', () => {
    const index = vi.spyOn(help, 'fetchHelpIndex')
    // No wrapper: `PageHeader` is in a great many tests that provide none.
    render(<PageHelpButton />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(index).not.toHaveBeenCalled()
  })

  it('stays invisible on a screen nobody has written about', async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    vi.spyOn(help, 'fetchHelpIndex').mockResolvedValue(INDEX)
    useHelpStore.setState({ page: 'analytics' })

    render(<PageHelpButton />, { wrapper })
    await waitFor(() => expect(help.fetchHelpIndex).toHaveBeenCalled())
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('opens the screen’s article, and closes it again', async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    vi.spyOn(help, 'fetchHelpIndex').mockResolvedValue(INDEX)

    render(<PageHelpButton />, { wrapper })
    const button = await screen.findByRole('button', {
      name: 'Help for this page',
    })

    await userEvent.click(button)
    expect(useHelpStore.getState()).toMatchObject({
      isOpen: true,
      history: ['page-posts'],
    })
    expect(button).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(button)
    expect(useHelpStore.getState().isOpen).toBe(false)
  })
})
