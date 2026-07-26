import { QueryClient } from '@tanstack/react-query'

const FIVE_MINUTES = 1000 * 60 * 5

/**
 * The app's single Query client. It lives here rather than in `main.tsx` so
 * non-React code can reach the cache — the assistant store runs its turns
 * outside the component tree and has to invalidate the post it edited.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export const QUERY_FIVE_MINUTES = FIVE_MINUTES
