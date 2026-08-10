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
/**
 * Which effect instance currently owns the scope. Identity, not scope
 * equality: two screens with the *same* scope can overlap in lifetime
 * (concurrent transitions, a tree kept mounted through an animation), and the
 * older one's late cleanup must not clear the scope out from under the live
 * one.
 */
let claimant: symbol | null = null

export function usePanelScope(scope: PanelScope, campaignId?: string) {
  // Layout, not passive: loading straight into a post with `postQuality`
  // remembered would otherwise paint one frame with no scope — the rail closed
  // — and then slide it open. Running before paint makes the restored panel
  // simply be there, which is the point of remembering it.
  useLayoutEffect(() => {
    const token = Symbol(scope)
    claimant = token
    useSettingsStore.getState().setPanelScope(scope, campaignId)
    return () => {
      // Only if it is still ours. React runs every cleanup in a commit before
      // any effect, so a route swap normally clears then sets — but whenever a
      // newer instance has claimed since, this cleanup is stale and must
      // no-op.
      if (claimant === token) {
        claimant = null
        useSettingsStore.getState().setPanelScope(null)
      }
    }
  }, [scope, campaignId])
}
