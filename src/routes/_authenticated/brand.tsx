import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * Brand — the workspace-level material every campaign writes from (CON-227).
 *
 * **A pathless gate, and nothing else.** This layout used to own a header and a
 * tab bar; it owns no chrome at all now, because Brand is a hub and five
 * drilldowns rather than one screen with five tabs (see `lib/brandSections`).
 * Each child is a whole page — its own header, its own way back — and a shared
 * frame around them would be a frame that has to be right for the Overview, for
 * a library, and for the template compositor at once.
 *
 * What it is still here for is **the flag**. Gating the parent gates every
 * screen under it: with `brand-materials` off the app has no Brand at all,
 * which is what the standing rule requires — not a blank page, and not five
 * child routes each repeating the same guard and each one edit away from
 * forgetting it. The nav row is gated separately in `AppSidebar`, because
 * "every entry point" means the sidebar too. The voice editor repeats the guard
 * because it escapes this layout (`brand_/…`) and so escapes this `beforeLoad`.
 */
export const Route = createFileRoute('/_authenticated/brand')({
  beforeLoad: () => {
    if (!isFeatureEnabled('brand-materials')) {
      throw redirect({ to: '/campaigns' })
    }
  },
  component: Outlet,
})
