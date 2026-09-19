import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { updatePost } from '@/services/api/posts'
import { useUpdatePost } from './usePosts'
import { campaignPostsKey, WORKSPACE_POSTS_KEY } from '@/lib/queryKeys'
import type { Post, PostPayload } from '@/types/posts'

/**
 * Where a post save paints, and which campaign hears about it.
 *
 * The workspace calendar reads every campaign's posts under one key and drags
 * posts that belong to campaigns it was not opened for, so `campaignId` is
 * `null` there. Two things have to follow, and neither is visible until a save
 * is actually in flight:
 *
 * - the optimistic patch lands in the list the caller is *looking at* — a
 *   dragged card that paints into a campaign key nobody is rendering snaps
 *   back to its old day until the refetch answers;
 * - the settle still names a campaign, read off the payload, so that
 *   campaign's own calendar and the summaries roll-up are marked stale. A
 *   settle that named nothing would leave the campaign calendar showing the
 *   post on the day it was dragged off.
 *
 * Covered here rather than through the grid because a real HTML5 drag is not
 * something a synthetic pointer can raise.
 */
vi.mock('@/services/api/posts', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/posts')>(
    '@/services/api/posts',
  )
  return { ...actual, updatePost: vi.fn() }
})

const MOVED = '2026-10-01T09:00:00Z'

function post(id: string, scheduledAt: string | null): Post {
  return { id, campaign_id: 'c-1', scheduled_at: scheduledAt } as Post
}

function payload(): PostPayload {
  return { campaign_id: 'c-1', scheduled_at: MOVED }
}

function Probe({ campaignId }: { campaignId: string | null }) {
  const { mutate } = useUpdatePost(campaignId)
  return (
    <button onClick={() => mutate({ id: 'p-1', payload: payload() })}>
      save
    </button>
  )
}

/** A macrotask, so every settled promise chain has run to completion. */
function settle() {
  return act(() => new Promise<void>((res) => setTimeout(res, 0)))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useUpdatePost with no campaign', () => {
  it('paints into the workspace list, not a campaign one', async () => {
    let release!: (p: Post) => void
    vi.mocked(updatePost).mockReturnValue(
      new Promise<Post>((res) => {
        release = res
      }),
    )

    const { queryClient } = await renderWithProviders(
      <Probe campaignId={null} />,
    )
    queryClient.setQueryData(WORKSPACE_POSTS_KEY, [post('p-1', null)])
    queryClient.setQueryData(campaignPostsKey('c-1'), [post('p-1', null)])

    act(() => screen.getByText('save').click())
    await settle()

    expect(
      queryClient.getQueryData<Post[]>(WORKSPACE_POSTS_KEY)?.[0].scheduled_at,
    ).toBe(MOVED)

    release(post('p-1', MOVED))
    await settle()
  })

  it('marks the post’s own campaign stale on the way out', async () => {
    vi.mocked(updatePost).mockResolvedValue(post('p-1', MOVED))

    const { queryClient } = await renderWithProviders(
      <Probe campaignId={null} />,
    )
    queryClient.setQueryData(campaignPostsKey('c-1'), [post('p-1', null)])

    act(() => screen.getByText('save').click())

    await waitFor(() => {
      expect(
        queryClient.getQueryState(campaignPostsKey('c-1'))?.isInvalidated,
      ).toBe(true)
    })
  })

  it('rolls the workspace list back when the server refuses', async () => {
    vi.mocked(updatePost).mockRejectedValue(new Error('nope'))

    const { queryClient } = await renderWithProviders(
      <Probe campaignId={null} />,
    )
    queryClient.setQueryData(WORKSPACE_POSTS_KEY, [post('p-1', null)])

    act(() => screen.getByText('save').click())

    await waitFor(() => {
      expect(
        queryClient.getQueryData<Post[]>(WORKSPACE_POSTS_KEY)?.[0].scheduled_at,
      ).toBeNull()
    })
  })
})
