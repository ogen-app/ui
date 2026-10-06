import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/lib/queryClient'
import * as service from '@/services/api/attachments'
import { handleEvent } from '@/stores/eventStreamStore'
import type {
  AttachmentListResponse,
  PostAttachmentWithValidation,
} from '@/types/attachments'
import type { AppEvent } from '@/types/events'
import { usePostAttachments } from './usePostAttachments'

/**
 * Files that arrive from outside the editor (CON-345).
 *
 * The Figma plugin attaches to a post the user has open in another window, and
 * the server announces it on the broadcast stream. These run the real path —
 * the stream's handler, the routing table and the hook, against the app's own
 * query client — because the bug this guards against is a gap *between* them.
 */

vi.mock('@/services/api/attachments')

const file = (id: string, position: number): PostAttachmentWithValidation =>
  ({
    id,
    post_id: 'p1',
    position,
    segment_index: null,
    mime_type: 'image/png',
    platform_validation: [],
  }) as unknown as PostAttachmentWithValidation

const list = (
  ...attachments: PostAttachmentWithValidation[]
): AttachmentListResponse => ({ attachments, platform_validation: [] })

const changed: AppEvent = {
  id: 'evt-1',
  topic: 'entity:post:p1',
  type: 'post.attachments.changed',
  payload: { attachment_id: 'b', action: 'created', source: 'figma_plugin' },
  created_at: '2026-10-06T19:00:00Z',
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const ids = (r: { current: ReturnType<typeof usePostAttachments> }) =>
  r.current.attachments.map((a) => a.id)

beforeEach(() => {
  vi.mocked(service.listAttachments)
    .mockResolvedValueOnce(list(file('a', 0)))
    .mockResolvedValue(list(file('a', 0), file('b', 1)))
})

afterEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
})

describe('usePostAttachments and the event stream', () => {
  it('shows a file attached from outside the editor without a reload', async () => {
    const { result } = renderHook(() => usePostAttachments('p1'), { wrapper })
    await waitFor(() => expect(ids(result)).toEqual(['a']))

    act(() => handleEvent(changed))

    await waitFor(() => expect(ids(result)).toEqual(['a', 'b']))
  })

  it('ignores the same news about another post', async () => {
    const { result } = renderHook(() => usePostAttachments('p1'), { wrapper })
    await waitFor(() => expect(ids(result)).toEqual(['a']))

    act(() => handleEvent({ ...changed, topic: 'entity:post:p2' }))

    await new Promise((r) => setTimeout(r, 20))
    expect(service.listAttachments).toHaveBeenCalledTimes(1)
  })

  it('holds the refetch while a reorder is still being written', async () => {
    // A reorder is one request per file, and each will be announced. A refetch
    // between them would paint a half-applied order over the user's drag.
    vi.mocked(service.listAttachments)
      .mockReset()
      .mockResolvedValue(list(file('a', 0), file('b', 1)))
    vi.mocked(service.reorderAttachment).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePostAttachments('p1'), { wrapper })
    await waitFor(() => expect(ids(result)).toEqual(['a', 'b']))

    act(() => result.current.reorder([file('b', 1), file('a', 0)]))
    await waitFor(() => expect(result.current.reordering).toBe(true))
    act(() => handleEvent(changed))

    await new Promise((r) => setTimeout(r, 20))
    expect(service.listAttachments).toHaveBeenCalledTimes(1)
    expect(ids(result)).toEqual(['b', 'a'])
  })
})
