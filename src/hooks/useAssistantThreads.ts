import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { listThreads, type ThreadSummary } from '@/services/api/assistant'

/**
 * Every thread the workspace has talked in (CON-459). The list is the
 * server's — it survives a reload and reaches every device and every member —
 * so it lives in the Query cache and nowhere else: never in the assistant
 * store, never in browser storage. A turn finishing here, and a teammate's
 * finishing elsewhere (`assistant.completed`), invalidate it.
 */
export const ASSISTANT_THREADS_KEY = ['assistant', 'threads'] as const

export function useAssistantThreads() {
  const query = useInfiniteQuery({
    queryKey: ASSISTANT_THREADS_KEY,
    queryFn: ({ pageParam }) => listThreads(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
    staleTime: 30_000,
  })
  const summaries = useMemo<ThreadSummary[]>(
    () => query.data?.pages.flatMap((page) => page.threads) ?? [],
    [query.data],
  )
  return {
    summaries,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  }
}
