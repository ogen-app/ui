import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  destinationFor,
  searchFromFilter,
  type UIAction,
} from '@/lib/assistantUiActions'
import { setUiActionApplier } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'

/**
 * Lets the assistant drive the screen (CON-450, D5). The store applies a
 * turn's `ui_action`s when it completes, through what this registers: the
 * router does the navigating, and a list picks up a selection or a smart group
 * itself (`viewContextStore.request`), because those are its own state.
 * Mounted once, in the authenticated layout.
 */
export function useAssistantUiActions() {
  const router = useRouter()

  useEffect(() => {
    const go = (to: string, params: Record<string, string>, search?: object) =>
      // The destination is a route template from `lib/assistantUiActions`,
      // checked against the router's tree at runtime rather than by type.
      router.navigate({ to, params, search } as never)

    setUiActionApplier({
      apply: async (action: UIAction) => {
        const before = router.state.location.href
        const destination = destinationFor(action)
        switch (action.type) {
          case 'navigate':
            if (!destination) return undefined
            await go(destination.to, destination.params)
            return before
          case 'set_filter':
            if (!destination) return undefined
            await go(
              destination.to,
              destination.params,
              searchFromFilter(action.filter ?? ''),
            )
            return before
          case 'select':
          case 'open_saved_view': {
            // The list has to be on screen to pick the request up.
            const here = useViewContextStore.getState().location.screen
            if (destination && here !== action.screen) {
              await go(destination.to, destination.params)
            }
            useViewContextStore.getState().ask(action)
            return before
          }
        }
      },
      restore: async (href: string, action: UIAction) => {
        // Ticked rows are the list's own state, not the address, so the list
        // is asked to clear them *before* the address moves: while it is
        // still mounted to take the request up. If it isn't, leaving the
        // screen drops the request (`setLocation`).
        if (action.type === 'select' && action.selection) {
          useViewContextStore.getState().ask({
            ...action,
            selection: { kind: action.selection.kind, ids: [] },
          })
        }
        await router.navigate({ href } as never)
      },
    })
    return () => setUiActionApplier(null)
  }, [router])
}
