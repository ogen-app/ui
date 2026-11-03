import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHelpStore } from '@/stores/helpStore'
import { HelpDrawer } from './HelpDrawer'

/**
 * Page help follows the page — until the reader has gone somewhere of their
 * own, after which navigating leaves their trail alone.
 */

vi.mock('@/config/featureFlags', () => ({ useFeatureFlag: () => true }))
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({}) }))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const navigateTo = (page: 'posts' | 'calendar' | 'analytics') =>
  act(() => useHelpStore.getState().setPage(page))

beforeEach(() => {
  window.location.hash = ''
  useHelpStore.setState({ isOpen: false, history: [], page: 'posts' })
})

describe('HelpDrawer', () => {
  it('moves the page’s help along with the page', async () => {
    render(<HelpDrawer />, { wrapper })
    // Let the index land before opening, as it has in the app by the time
    // anyone can press the button.
    await waitFor(() => expect(useHelpStore.getState().page).toBe('posts'))
    act(() => useHelpStore.getState().open('page-posts'))
    expect(await screen.findByRole('heading', { name: 'Posts' })).toBeVisible()

    navigateTo('calendar')
    await waitFor(() =>
      expect(useHelpStore.getState().history).toEqual(['page-calendar']),
    )
    expect(
      await screen.findByRole('heading', { name: 'Calendar' }),
    ).toBeVisible()

    // A screen with nothing written keeps what was being read.
    navigateTo('analytics')
    await new Promise((r) => setTimeout(r, 0))
    expect(useHelpStore.getState().history).toEqual(['page-calendar'])
  })

  it('leaves a trail the reader made alone', async () => {
    render(<HelpDrawer />, { wrapper })
    act(() => useHelpStore.getState().open('page-posts'))
    await screen.findByRole('heading', { name: 'Posts' })
    act(() => useHelpStore.getState().push('post-statuses'))

    navigateTo('calendar')
    await new Promise((r) => setTimeout(r, 0))
    expect(useHelpStore.getState().history).toEqual([
      'page-posts',
      'post-statuses',
    ])
  })
})
