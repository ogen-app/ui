import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  addSourceSearch,
  connectSearch,
  destinationFor,
  searchFromFilter,
  windowCampaign,
  type AnalyticsWindow,
  type UIAction,
} from '@/lib/assistantUiActions'
import { OVERVIEW_WINDOWS } from '@/hooks/useAnalyticsOverview'
import { searchFromWindow, type AnalyticsSearch } from '@/lib/analyticsSearch'
import { setUiActionApplier } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'
import {
  useAnalyticsHighlightStore,
  windowControls,
} from '@/stores/analyticsHighlightStore'

/**
 * A window whose preset the picker doesn't offer lands as its dates: the
 * dashboard's address drops a span it can't label, which would quietly show
 * the default period instead.
 */
function offeredPeriod(window: AnalyticsWindow): AnalyticsWindow {
  if (!window.preset) return window
  if (OVERVIEW_WINDOWS.some((w) => w.window === window.preset)) return window
  return window.from && window.to ? { ...window, preset: undefined } : window
}

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
          case 'navigate': {
            if (!destination) return undefined
            const windowed =
              Boolean(action.window) && destination.to === '/analytics'
            // A navigate to the dashboard may carry the window it opens on
            // (CON-479): "Opened Analytics · last 90 days".
            await go(
              destination.to,
              destination.params,
              windowed && action.window
                ? searchFromWindow({
                    ...offeredPeriod(action.window),
                    campaignId: windowCampaign(action),
                  })
                : undefined,
            )
            if (windowed)
              useAnalyticsHighlightStore
                .getState()
                .mark(windowControls(action.changed))
            return before
          }
          case 'set_filter':
            if (!destination) return undefined
            await go(
              destination.to,
              destination.params,
              searchFromFilter(action.filter ?? ''),
            )
            return before
          case 'set_window': {
            if (!destination || !action.window) return undefined
            // The window's dates are what the dashboard resolved its period
            // to; when they haven't moved, the period stays the preset.
            const shown = useViewContextStore.getState().page?.window
            const here = router.state.location.search as AnalyticsSearch
            const same =
              shown &&
              shown.from === action.window.from &&
              shown.to === action.window.to
            await go(
              destination.to,
              destination.params,
              searchFromWindow(
                {
                  ...offeredPeriod(action.window),
                  campaignId: windowCampaign(action),
                },
                same &&
                  router.state.location.pathname.replace(/\/$/, '') ===
                    destination.to
                  ? { window: here.window, from: here.from, to: here.to }
                  : undefined,
              ),
            )
            // The bar tints what moved; the user's next touch clears it.
            useAnalyticsHighlightStore
              .getState()
              .mark(windowControls(action.changed))
            return before
          }
          case 'open_connect':
            if (!destination || !action.connect) return undefined
            await go(
              destination.to,
              destination.params,
              connectSearch(action.connect),
            )
            return before
          case 'open_add_source':
            // The menu offers the ways in; choosing one is the user's.
            if (!destination) return undefined
            await go(
              destination.to,
              destination.params,
              addSourceSearch(
                router.buildLocation({
                  to: destination.to,
                  params: destination.params,
                } as never).pathname,
                router.state.location,
              ),
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
        if (action.window) useAnalyticsHighlightStore.getState().clear()
        await router.navigate({ href } as never)
      },
    })
    return () => setUiActionApplier(null)
  }, [router])
}
