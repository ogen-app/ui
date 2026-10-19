import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as service from '@/services/api/analytics'
import type { InsightEnvelope } from '@/types/analytics'
import { useAnalyticsLearnings } from './useAnalyticsLearnings'
import { useAnalyticsOverview } from './useAnalyticsOverview'
import { useAnalyticsPerformers } from './useAnalyticsPerformers'

/**
 * Which platforms the answer on screen counted (CON-289).
 *
 * All three reads keep their previous answer up while a new selection is in
 * flight, so the selection and the answer disagree for the length of a
 * request. The card's empty state names platforms — "Nothing measured on
 * LinkedIn" — and has to name the ones the answer was fetched for, or it says
 * that about a read that counted everything.
 */

const NO_DATA: InsightEnvelope<never> = {
  available: false,
  reason: 'no_data',
  data: null,
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.restoreAllMocks()
})

const CASES = [
  {
    name: 'overview',
    fetcher: 'fetchAnalyticsOverview',
    use: (platforms: string[]) => useAnalyticsOverview('28d', platforms),
  },
  {
    name: 'performers',
    fetcher: 'fetchPerformers',
    use: (platforms: string[]) =>
      useAnalyticsPerformers('28d', 'reach', platforms),
  },
  {
    name: 'learnings',
    fetcher: 'fetchLearnings',
    use: (platforms: string[]) => useAnalyticsLearnings('reach', platforms),
  },
] as const

describe.each(CASES)('the $name read', ({ fetcher, use }) => {
  it('names the platforms its shown answer counted, not the pending ones', async () => {
    let release: (envelope: InsightEnvelope<never>) => void = () => {}
    const fetched = vi
      .spyOn(service, fetcher)
      .mockResolvedValueOnce(NO_DATA)
      .mockImplementationOnce(
        () =>
          new Promise<InsightEnvelope<never>>((resolve) => {
            release = resolve
          }),
      )

    const { result, rerender } = renderHook(
      ({ platforms }: { platforms: string[] }) => use(platforms),
      { wrapper, initialProps: { platforms: ['linkedin'] } },
    )
    await waitFor(() => expect(result.current.isEmpty).toBe(true))
    expect(result.current.platforms).toEqual(['linkedin'])

    // Every platform chosen; the LinkedIn answer stays up meanwhile, and it is
    // still LinkedIn's.
    rerender({ platforms: [] })
    await waitFor(() => expect(fetched).toHaveBeenCalledTimes(2))
    expect(result.current.isEmpty).toBe(true)
    expect(result.current.platforms).toEqual(['linkedin'])

    await act(async () => release(NO_DATA))
    await waitFor(() => expect(result.current.platforms).toEqual([]))
  })
})
