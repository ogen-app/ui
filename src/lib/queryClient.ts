import { MutationCache, QueryClient } from '@tanstack/react-query'

import { toast } from '@/stores/toastStore'

const FIVE_MINUTES = 1000 * 60 * 5

/**
 * Per-mutation control over the default error toast below.
 *
 * Declared through TanStack's `Register` interface so `meta` is typed at every
 * `useMutation` call rather than being a free-form bag — a typo in the opt-out
 * would otherwise fail silently, which is the exact class of bug this whole
 * mechanism exists to remove. It has to stay a `type`, not an `interface`:
 * TanStack only honours the augmentation if it satisfies
 * `Record<string, unknown>`, and interfaces don't.
 */
export type MutationErrorMeta = {
  /**
   * Set `false` only when the failure is already visible some other way — an
   * inline form error, a dialog that turns the refusal into its next question,
   * or a hook that triages the error itself. Silence must be a deliberate
   * opt-out; that is the entire point of the default (CON-164 §2).
   */
  errorToast?: false
  /**
   * Overrides the toast title, with the error's own message kept as the
   * description. Worth setting only where the API's message doesn't name the
   * action the user took — those messages already read as titles ("Unable to
   * delete post"), so most mutations need nothing here.
   */
  errorTitle?: string
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: MutationErrorMeta
  }
}

/**
 * The app's single Query client. It lives here rather than in `main.tsx` so
 * non-React code can reach the cache — the assistant store runs its turns
 * outside the component tree and has to invalidate the post it edited.
 */
export const queryClient = new QueryClient({
  /**
   * Every mutation reports its own failure unless it opts out.
   *
   * Before CON-164 this was opt-in per call site, so whether a rejected write
   * said anything depended on whoever wrote the hook. Two ways that went
   * wrong: `useAddPost` had no `onError` at all, and its only visible success
   * is a navigation — so a refused create was indistinguishable from a dead
   * button. And `useUpdatePost` rolls its optimistic write back in silence, so
   * a refused update *undoes itself on screen*, which reads as a UI glitch
   * rather than as a refusal.
   *
   * A cache-level handler fires in addition to any `onError` on the mutation
   * or on the `mutate` call, so those keep doing their rollback and dialog
   * work untouched — only the toast is centralised. That is also why the
   * opt-out exists: without it, a site with its own message would toast twice.
   */
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const meta = mutation.options.meta
      if (meta?.errorToast === false) return
      // `apiJson`/`apiVoid` throw with the backend's message, or with the
      // per-call fallback ("Unable to delete post") when the body carries
      // none. Both are already written for the user, so the message is the
      // title unless a hook asked for something more specific.
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong'
      const title = meta?.errorTitle ?? message
      toast.error(title, {
        // No echo when the override says the same thing as the message.
        description: title === message ? undefined : message,
      })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export const QUERY_FIVE_MINUTES = FIVE_MINUTES
