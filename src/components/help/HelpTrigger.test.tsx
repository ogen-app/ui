import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as help from '@/services/help'
import { useHelpStore } from '@/stores/helpStore'
import { HelpTrigger } from './HelpTrigger'

/**
 * What the trigger does on a screen that is not about help — which is every
 * screen it appears on.
 *
 * Two of these three are the same rule seen from different sides: the trigger
 * is the feature's only presence outside the drawer, so it is where a flag that
 * is off has to be invisible *and* free. The third is the rule that lets
 * triggers be committed before anyone has written the article.
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

beforeEach(() => {
  useHelpStore.setState({ isOpen: false, history: [] })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(useFeatureFlag).mockReturnValue(false)
})

describe('HelpTrigger', () => {
  it('renders nothing and asks for nothing while the flag is off', async () => {
    const topics = vi.spyOn(help, 'fetchHelpTopicMap')
    render(<HelpTrigger topic="post.status" />, { wrapper })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    // The gate that matters on the day the fixtures are replaced by a GROQ
    // query: these triggers sit in the post editor, so an unconditional read
    // would open a cross-origin request to Sanity on a screen where the drawer
    // cannot be opened at all.
    expect(topics).not.toHaveBeenCalled()
  })

  it('stays invisible when no article claims its topic', async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    vi.spyOn(help, 'fetchHelpTopicMap').mockResolvedValue({})

    render(<HelpTrigger topic="post.status" />, { wrapper })

    // A "?" that opens an apology is worse than no "?", and this is what lets a
    // trigger be placed in the code before the article exists — it appears by
    // itself the day someone publishes one that claims the topic.
    await waitFor(() =>
      expect(screen.queryByRole('button')).not.toBeInTheDocument(),
    )
  })

  it('opens the article that claims its topic', async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    vi.spyOn(help, 'fetchHelpTopicMap').mockResolvedValue({
      'post.status': 'post-statuses',
    })

    render(<HelpTrigger topic="post.status" />, { wrapper })
    await userEvent.click(await screen.findByRole('button'))

    // Opening from a trigger starts a fresh trail rather than resuming one.
    expect(useHelpStore.getState().isOpen).toBe(true)
    expect(useHelpStore.getState().history).toEqual(['post-statuses'])
  })
})
