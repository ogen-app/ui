import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { IdeaBody } from '@/services/api/ideas'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { assetAnalysesKey, useAnswerIdea } from './useAssetAnalyses'

const verdicts = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/services/api/ideas', async (actual) => ({
  ...(await actual<typeof import('@/services/api/ideas')>()),
  setIdeaVerdict: verdicts.fn,
}))

const idea = (id: string): IdeaBody => ({
  id,
  title: id,
  note: '',
  campaign_id: null,
  verdict: null,
  created_at: '2026-10-12T10:00:00Z',
  created_by: null,
  decided_at: null,
  decided_by: null,
  remind_at: null,
})

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData<AssetAnalysis[]>(assetAnalysesKey('a1'), [
    { asset_id: 'a1', ideas: [idea('i1'), idea('i2')] } as AssetAnalysis,
  ])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const verdictOf = (id: string) =>
    client
      .getQueryData<AssetAnalysis[]>(assetAnalysesKey('a1'))?.[0]
      ?.ideas.find((i) => i.id === id)?.verdict
  return { wrapper, verdictOf }
}

describe('useAnswerIdea', () => {
  it('puts back only the idea whose answer failed', async () => {
    let fail: (reason: unknown) => void = () => {}
    verdicts.fn
      .mockReset()
      .mockImplementationOnce(
        () => new Promise((_resolve, reject) => (fail = reject)),
      )
      .mockResolvedValue(undefined)
    const { wrapper, verdictOf } = setup()
    const first = renderHook(() => useAnswerIdea('a1', 'i1'), { wrapper })
    const second = renderHook(() => useAnswerIdea('a1', 'i2'), { wrapper })

    act(() => first.result.current.answer('yes'))
    await waitFor(() => expect(verdictOf('i1')).toBe('yes'))
    act(() => second.result.current.answer('no'))
    await waitFor(() => expect(verdictOf('i2')).toBe('no'))

    act(() => fail(new Error('down')))
    await waitFor(() => expect(verdictOf('i1')).toBeNull())
    // The other idea's answer, given while the first was in flight, stays.
    expect(verdictOf('i2')).toBe('no')
  })

  it('refuses a second answer for the same idea while one is pending', async () => {
    let settle: (value?: unknown) => void = () => {}
    verdicts.fn
      .mockReset()
      .mockImplementationOnce(
        () => new Promise((resolve) => (settle = resolve)),
      )
    const { wrapper } = setup()
    const { result } = renderHook(() => useAnswerIdea('a1', 'i1'), { wrapper })

    act(() => result.current.answer('yes'))
    await waitFor(() => expect(result.current.pending).toBe(true))
    act(() => result.current.answer('no'))
    expect(verdicts.fn).toHaveBeenCalledTimes(1)

    act(() => settle())
    await waitFor(() => expect(result.current.pending).toBe(false))
  })
})
