import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useViewContextStore } from '@/stores/viewContextStore'
import { useAssistantRequest } from './useAssistantContext'

describe('useAssistantRequest (CON-482)', () => {
  it('reports how many rows the list acted on, and consumes the request', () => {
    const report = vi.fn()
    renderHook(() => useAssistantRequest(() => 2))
    act(() => {
      useViewContextStore.getState().ask(
        {
          type: 'select',
          screen: 'campaign.list',
          selection: { kind: 'post', ids: ['a', 'b', 'c'] },
        },
        report,
      )
    })
    expect(report).toHaveBeenCalledWith(2)
    expect(useViewContextStore.getState().request).toBeNull()
  })

  it('leaves a request it can’t act on yet', () => {
    renderHook(() => useAssistantRequest(() => false))
    act(() => {
      useViewContextStore
        .getState()
        .ask({ type: 'open_saved_view', screen: 'ideas', savedViewId: 'v1' })
    })
    expect(useViewContextStore.getState().request).not.toBeNull()
  })
  it('acts once what it waits on arrives, so a cold open keeps the request', () => {
    const report = vi.fn()
    const { rerender } = renderHook(
      ({ posts }: { posts?: string[] }) =>
        useAssistantRequest(() => (posts ? posts.length : false), posts),
      { initialProps: {} as { posts?: string[] } },
    )
    act(() => {
      useViewContextStore.getState().ask(
        {
          type: 'select',
          screen: 'campaign.list',
          selection: { kind: 'post', ids: ['a'] },
        },
        report,
      )
    })
    expect(report).not.toHaveBeenCalled()
    rerender({ posts: ['a'] })
    expect(report).toHaveBeenCalledWith(1)
    expect(useViewContextStore.getState().request).toBeNull()
  })
})
