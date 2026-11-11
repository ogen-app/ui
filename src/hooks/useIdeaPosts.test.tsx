import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { useJustWrittenStore } from '@/stores/justWrittenStore'
import { useToastStore } from '@/stores/toastStore'
import type { DraftIdeasEvent } from '@/services/api/ideaPosts'
import { useDraftIdeas } from './useIdeaPosts'

const api = vi.hoisted(() => ({
  events: [] as DraftIdeasEvent[],
  navigate: vi.fn(),
  openPanel: vi.fn(),
}))
vi.mock('@/services/api/ideaPosts', () => ({
  draftIdeas: vi.fn(
    async (
      _ids: string[],
      _options: unknown,
      onEvent: (e: DraftIdeasEvent) => void,
    ) => api.events.forEach(onEvent),
  ),
}))
// The real store persists to localStorage; only the call matters here.
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: (pick: (s: { openRightPanel: () => void }) => unknown) =>
    pick({ openRightPanel: api.openPanel }),
}))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => api.navigate,
}))

const post = (postId: string, publishDate?: string): DraftIdeasEvent => ({
  type: 'post',
  postId,
  title: postId,
  ...(publishDate ? { publishDate } : {}),
})

async function draft(campaignId?: string) {
  const { result } = renderHook(() => useDraftIdeas(), {
    wrapper: QueryWrapper,
  })
  await act(() => result.current.mutateAsync({ ids: ['i1'], campaignId }))
  await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1))
  return useToastStore.getState().toasts[0]
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
  useJustWrittenStore.setState({ ids: new Set() })
  api.navigate.mockReset()
})

describe('useDraftIdeas (CON-470)', () => {
  it('says the drafts aren’t scheduled, and SHOW opens Not scheduled on the campaign', async () => {
    api.events = [
      post('p1'),
      post('p2'),
      { type: 'complete', postIds: [], warnings: [] },
    ]
    const toast = await draft('c1')
    expect(toast.title).toBe('2 drafts written, not scheduled')
    expect(toast.description).toBe(
      'In Not scheduled, until you put them on a day.',
    )
    expect([...useJustWrittenStore.getState().ids]).toEqual(['p1', 'p2'])

    toast.action!.onClick()
    expect(api.openPanel).toHaveBeenCalledWith('notScheduled')
    expect(api.navigate).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/calendar',
      params: { campaignId: 'c1' },
    })
  })

  it('counts the dated ones apart, and marks only the unscheduled', async () => {
    api.events = [post('p1'), post('p2', '2026-11-26')]
    const toast = await draft('c1')
    expect(toast.title).toBe('2 drafts written, 1 not scheduled')
    expect([...useJustWrittenStore.getState().ids]).toEqual(['p1'])
  })

  it('offers nothing to show when every draft got a date', async () => {
    api.events = [post('p1', '2026-11-26')]
    const toast = await draft('c1')
    expect(toast.title).toBe('1 draft written')
    expect(toast.action).toBeUndefined()
  })

  it('has nowhere to SHOW without the drafts’ campaign', async () => {
    api.events = [post('p1')]
    const toast = await draft()
    expect(toast.title).toBe('1 draft written, not scheduled')
    expect(toast.action).toBeUndefined()
  })
})
