import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Post } from '@/types/posts'
import { useBulkPostActions } from './useBulkPostActions'

/** Each delete waits on its own resolver, so the test settles them in any order. */
const deletes = vi.hoisted(() => ({
  pending: new Map<string, () => void>(),
}))
vi.mock('@/hooks/usePosts', () => ({
  useDeletePost: () => ({
    mutateAsync: (id: string) =>
      new Promise<void>((resolve) => deletes.pending.set(id, resolve)),
    // What TanStack reports: the latest call only — false once it is done.
    isPending: false,
  }),
  useUpdatePost: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

describe('useBulkPostActions (CON-472)', () => {
  it('stays busy until every request of a sweep has settled, in any order', async () => {
    const { result } = renderHook(() => useBulkPostActions('c1', () => {}))
    let sweep!: Promise<number>
    act(() => {
      sweep = result.current.deletePosts([
        { id: 'p1' } as Post,
        { id: 'p2' } as Post,
      ])
    })
    expect(result.current.busy).toBe(true)
    await act(async () => deletes.pending.get('p2')!())
    expect(result.current.busy).toBe(true)
    await act(async () => {
      deletes.pending.get('p1')!()
      await sweep
    })
    expect(result.current.busy).toBe(false)
  })
})
