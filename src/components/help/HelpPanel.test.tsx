import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHelpArticle, fetchHelpIndex } from '@/services/help'
import { useHelpStore } from '@/stores/helpStore'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { HelpPanel } from './HelpPanel'

/**
 * Help shows the page you are on, follows you to the next one — until you
 * have gone somewhere of your own — and sits in the rail in the assistant's
 * place.
 */

vi.mock('@/config/featureFlags', () => ({
  useFeatureFlag: () => true,
  isFeatureEnabled: () => true,
}))

// The test articles behind spies, so a test can make one request fail — and
// so nothing here reaches Sanity.
vi.mock('@/services/help', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/help')>()
  const { HELP_ARTICLES } = await import('@/test/helpArticles')
  return {
    ...actual,
    fetchHelpArticle: vi.fn(async (key: string) => HELP_ARTICLES[key] ?? null),
    fetchHelpIndex: vi.fn(async () =>
      actual.buildHelpIndex(Object.values(HELP_ARTICLES)),
    ),
  }
})

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
  useHelpStore.setState({ history: [], page: 'posts' })
  useSettingsStore.setState({
    assistantOpen: true,
    helpOpen: false,
  })
})

describe('HelpPanel', () => {
  it('opens in the assistant’s place, and closing it gives the assistant back', () => {
    act(() => useHelpStore.getState().open('page-posts'))
    expect(selectActivePanel(useSettingsStore.getState())).toBe('help')
    act(() => useSettingsStore.getState().closeRightPanel())
    expect(selectActivePanel(useSettingsStore.getState())).toBe('assistant')
  })

  it('moves the page’s help along with the page', async () => {
    render(<HelpPanel onClose={() => {}} />, { wrapper })
    act(() => useHelpStore.getState().open('page-posts'))
    expect(await screen.findByRole('heading', { name: 'Posts' })).toBeVisible()

    navigateTo('calendar')
    await waitFor(() =>
      expect(useHelpStore.getState().history).toEqual(['page-calendar']),
    )
    expect(
      await screen.findByRole('heading', { name: 'Calendar' }),
    ).toBeVisible()

    // A screen with nothing written says so, rather than keeping help for a
    // place the reader has left.
    navigateTo('analytics')
    await waitFor(() => expect(useHelpStore.getState().history).toEqual([]))
    expect(await screen.findByText('No help for this page yet')).toBeVisible()
  })

  it('catches up with an index that lands after Help was pressed', async () => {
    // Pressed before the index arrived: nothing to show yet.
    act(() => useHelpStore.getState().open(null))
    render(<HelpPanel onClose={() => {}} />, { wrapper })
    await waitFor(() =>
      expect(useHelpStore.getState().history).toEqual(['page-posts']),
    )
  })

  it('leaves a trail the reader made alone', async () => {
    render(<HelpPanel onClose={() => {}} />, { wrapper })
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

  describe('with nothing to show', () => {
    it('says help could not load, rather than that none was written, and tries again', async () => {
      vi.mocked(fetchHelpIndex).mockRejectedValueOnce(new Error('offline'))
      act(() => useHelpStore.getState().open(null))
      render(<HelpPanel onClose={() => {}} />, { wrapper })

      expect(await screen.findByText('Couldn’t load help')).toBeVisible()
      expect(screen.queryByText('No help for this page yet')).toBeNull()

      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
      expect(
        await screen.findByRole('heading', { name: 'Posts' }),
      ).toBeVisible()
    })

    it('retries a failed article', async () => {
      vi.mocked(fetchHelpArticle).mockRejectedValueOnce(new Error('offline'))
      render(<HelpPanel onClose={() => {}} />, { wrapper })
      act(() => useHelpStore.getState().open('page-posts'))

      expect(await screen.findByText('Couldn’t load help')).toBeVisible()
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
      expect(
        await screen.findByRole('heading', { name: 'Posts' }),
      ).toBeVisible()
    })

    it('names a link that answers nothing', async () => {
      render(<HelpPanel onClose={() => {}} />, { wrapper })
      act(() => useHelpStore.getState().open('no-such-article'))
      expect(await screen.findByText('This article isn’t here')).toBeVisible()
    })

    it('hands a screen with no help to the assistant', async () => {
      useHelpStore.setState({ page: 'analytics' })
      act(() => useHelpStore.getState().open(null))
      render(<HelpPanel onClose={() => {}} />, { wrapper })

      await userEvent.click(
        await screen.findByRole('button', { name: 'Ask Ogen' }),
      )
      expect(selectActivePanel(useSettingsStore.getState())).toBe('assistant')
    })
  })
})
