import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useDeletePost } from './usePosts'

vi.mock('@/services/api/posts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/posts')>()),
  deletePost: vi.fn(async () => {}),
}))

describe('useDeletePost (CON-485)', () => {
  it('refreshes the ideas, whose post count and MADE INTO counted the post', async () => {
    const qc = new QueryClient()
    const invalidate = vi.spyOn(qc, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useDeletePost('c1'), { wrapper })
    await act(() => result.current.mutateAsync('p1'))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['ideas'] })
  })
})
