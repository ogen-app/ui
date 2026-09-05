import { createFileRoute } from '@tanstack/react-router'
import { NavDrilldownHarness } from './page'

/**
 * TEMPORARY — a design harness for the campaign drill-down, not a product
 * route. It sits outside `_authenticated` (no app chrome) and outside the auth
 * probe in `__root.tsx`, so it renders with the API down and with nobody
 * signed in. Delete the whole `routes/design/` folder and the `/design`
 * exemption in `__root.tsx` when the design is settled.
 */
export const Route = createFileRoute('/design/nav-drilldown/')({
  component: NavDrilldownHarness,
})
