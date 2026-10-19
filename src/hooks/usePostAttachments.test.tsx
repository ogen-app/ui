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

  it('refreshes once the last of two overlapping writes lands, not the first', async () => {
    // Refetching when the first lands would fetch a list without the second
    // and paint it over the second's optimistic state.
    vi.mocked(service.listAttachments)
      .mockReset()
      .mockResolvedValue(list(file('a', 0), file('b', 1)))
    const settle: Array<() => void> = []
    vi.mocked(service.setAttachmentSegment).mockImplementation(
      () =>
        new Promise((resolve) => {
          settle.push(() => resolve(undefined as never))
        }),
    )
    const { result } = renderHook(() => usePostAttachments('p1'), { wrapper })
    await waitFor(() => expect(ids(result)).toEqual(['a', 'b']))

    act(() =>
      result.current.assignSegment({ attachmentId: 'a', segmentIndex: 1 }),
    )
    act(() =>
      result.current.assignSegment({ attachmentId: 'b', segmentIndex: 1 }),
    )
    await waitFor(() => expect(settle).toHaveLength(2))

    await act(async () => settle[0]())
    await new Promise((r) => setTimeout(r, 20))
    expect(service.listAttachments).toHaveBeenCalledTimes(1)

    await act(async () => settle[1]())
    await waitFor(() =>
      expect(service.listAttachments).toHaveBeenCalledTimes(2),
    )
  })
})

describe('usePostAttachments and the calendar', () => {
  it("makes every post list stale after an upload, since a row's cover is its first file", async () => {
    // CON-247: the list rows carry `cover_url`, and the upload answers with
    // the attachment rather than the post — the hook knows only the post's id.
    vi.mocked(service.uploadAttachment).mockResolvedValue(file('b', 1))
    queryClient.setQueryData(['campaigns', 'c1', 'posts'], [])
    queryClient.setQueryData(['posts'], [])
    const { result } = renderHook(() => usePostAttachments('p1'), { wrapper })
    await waitFor(() => expect(ids(result)).toEqual(['a']))

    await act(() =>
      result.current.upload([new File(['x'], 'x.png', { type: 'image/png' })]),
    )

    const stale = (key: unknown[]) =>
      queryClient.getQueryState(key)?.isInvalidated
    expect(stale(['campaigns', 'c1', 'posts'])).toBe(true)
    expect(stale(['posts'])).toBe(true)
  })
})

describe('usePostAttachments and the content bank (CON-290)', () => {
  it('attaches in the order picked and remembers which image each came from', async () => {
    // The server places each copy at the next position as it lands, so the
    // second request must not leave before the first has answered.
    const order: string[] = []
    let release: () => void = () => {}
    vi.mocked(service.attachFromAsset).mockImplementation(
      async (_post, assetId) => {
        order.push(assetId)
        if (assetId === 'img-1') {
          await new Promise<void>((r) => {
            release = r
          })
        }
        return file(assetId === 'img-1' ? 'b' : 'c', 9)
      },
    )
    vi.mocked(service.listAttachments)
      .mockReset()
      .mockResolvedValueOnce(list(file('a', 0)))
      .mockResolvedValue(list(file('a', 0), file('b', 1), file('c', 2)))
    const { result } = renderHook(() => usePostAttachments('p1'), { wrapper })
    await waitFor(() => expect(ids(result)).toEqual(['a']))

    let run: Promise<unknown> = Promise.resolve()
    act(() => {
      run = result.current.attachFromAssets([
        { id: 'img-1', title: 'One' },
        { id: 'img-2', title: 'Two' },
      ])
    })
    await waitFor(() => expect(order).toEqual(['img-1']))
    expect(result.current.pending.map((p) => p.percent)).toEqual([null])

    await act(async () => {
      release()
      await run
    })

    expect(order).toEqual(['img-1', 'img-2'])
    await waitFor(() => expect(ids(result)).toEqual(['a', 'b', 'c']))
    expect([...result.current.attachedAssetIds]).toEqual(['img-1', 'img-2'])
  })

  it('offers an image again once its attachment is removed', async () => {
    vi.mocked(service.attachFromAsset).mockResolvedValue(file('b', 1))
    vi.mocked(service.listAttachments)
      .mockReset()
      .mockResolvedValueOnce(list(file('a', 0)))
      .mockResolvedValueOnce(list(file('a', 0), file('b', 1)))
      .mockResolvedValue(list(file('a', 0)))
    vi.mocked(service.deleteAttachment).mockResolvedValue()
    const { result } = renderHook(() => usePostAttachments('p1'), { wrapper })
    await waitFor(() => expect(ids(result)).toEqual(['a']))

    await act(() =>
      result.current.attachFromAssets([{ id: 'img', title: 'X' }]),
    )
    await waitFor(() =>
      expect(result.current.attachedAssetIds.has('img')).toBe(true),
    )

    await act(() => result.current.remove('b'))
    await waitFor(() => expect(ids(result)).toEqual(['a']))
    expect(result.current.attachedAssetIds.size).toBe(0)
  })

  it('reports a refusal with its title and keeps going', async () => {
    const refusal = new Error('nope')
    vi.mocked(service.attachFromAsset)
      .mockRejectedValueOnce(refusal)
      .mockResolvedValueOnce(file('b', 1))
    const { result } = renderHook(() => usePostAttachments('p1'), { wrapper })
    await waitFor(() => expect(ids(result)).toEqual(['a']))

    let outcome: Awaited<
      ReturnType<ReturnType<typeof usePostAttachments>['attachFromAssets']>
    > = { attached: 0, failures: [] }
    await act(async () => {
      outcome = await result.current.attachFromAssets([
        { id: 'img-1', title: 'Refused' },
        { id: 'img-2', title: 'Fine' },
      ])
    })

    expect(outcome).toEqual({
      attached: 1,
      failures: [{ title: 'Refused', error: refusal }],
    })
    expect(result.current.pending).toEqual([])
  })
})
