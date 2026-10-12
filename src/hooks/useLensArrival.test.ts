import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import type { IdeaBody } from '@/services/api/ideas'
import { ARRIVAL_MS, useLensArrival } from './useLensArrival'

const idea = (id: string, verdict: IdeaBody['verdict'] = null) =>
  ({ id, title: id, note: '', verdict }) as IdeaBody

const lens = (over: Partial<AssetAnalysis>): AssetAnalysis =>
  ({
    id: 'an-1',
    campaign_id: null,
    status: 'ready',
    summary: 'S',
    ideas: [],
    ...over,
  }) as AssetAnalysis

describe('useLensArrival', () => {
  it('counts the ideas of a lens that finished on this page, then clears', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ l }) => useLensArrival(l), {
      initialProps: { l: lens({ status: 'running', summary: '' }) },
    })
    expect(result.current).toBeNull()

    rerender({
      l: lens({ ideas: [idea('a'), idea('b'), idea('c', 'no')] }),
    })
    expect(result.current).toBe(2)

    act(() => vi.advanceTimersByTime(ARRIVAL_MS))
    expect(result.current).toBeNull()
    vi.useRealTimers()
  })

  it('says nothing on a first load or when switching to a ready lens', () => {
    const { result, rerender } = renderHook(({ l }) => useLensArrival(l), {
      initialProps: { l: lens({}) as AssetAnalysis | undefined },
    })
    expect(result.current).toBeNull()
    rerender({ l: lens({ id: 'an-2', campaign_id: 'c1' }) })
    expect(result.current).toBeNull()
  })
})
