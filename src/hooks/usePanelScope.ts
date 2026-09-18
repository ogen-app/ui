import { useLayoutEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import type { PanelScope } from '@/lib/rightPanel'

/**
 * Declare that this screen is underneath the right sidebar, so the panels
 * belonging to it become resolvable — and stop being resolvable when it goes.
 *
 * The sidebar renders above the router outlet, so it cannot see which route is
 * mounted; the route has to say so. This is the only thing navigation is
 * allowed to write. It records *where you are*, never *what you chose* — which
 * is why leaving a screen no longer has to close its panels by hand, and why
 * coming back restores them without anything having been saved on the way out.
 *
 * @param scope which family of panels this screen can host
 * @param campaignId the campaign those panels are about, for the ones that need it
 */
type Claim = { token: symbol; scope: PanelScope; campaignId?: string }

/**
 * Every mounted screen's claim, newest last — the top one owns the scope.
 *
 * A stack rather than a single token because screens can overlap in lifetime
 * (concurrent transitions, a tree kept mounted through an animation), in both
 * directions: an older instance's late cleanup must not clear the scope out
 * from under the live screen, and a newer screen unmounting must hand the
 * scope *back* to the one still mounted underneath, not to nothing.
 */
let claims: Claim[] = []

export function usePanelScope(scope: PanelScope, campaignId?: string) {
  // Layout, not passive: loading straight into a post with `postQuality`
  // remembered would otherwise paint one frame with no scope — the rail closed
  // — and then slide it open. Running before paint makes the restored panel
  // simply be there, which is the point of remembering it.
  useLayoutEffect(() => {
    const claim: Claim = { token: Symbol(scope), scope, campaignId }
    claims.push(claim)
    useSettingsStore.getState().setPanelScope(scope, campaignId)
    return () => {
      // The store only follows the top of the stack: a buried claim leaving
      // changes nothing, and the top leaving restores whichever screen is
      // still mounted beneath it — or clears the scope when none is.
      const wasTop = claims[claims.length - 1]?.token === claim.token
      claims = claims.filter((c) => c.token !== claim.token)
      if (wasTop) {
        const top = claims[claims.length - 1]
        useSettingsStore
          .getState()
          .setPanelScope(top?.scope ?? null, top?.campaignId)
      }
    }
  }, [scope, campaignId])
}
