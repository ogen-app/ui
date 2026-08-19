import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * TEMPORARY — the entry point for the analytics design harnesses, not a product
 * route. Everything under `design/` sits outside `_authenticated` (no app
 * chrome) and outside the auth probe in `__root.tsx`, so it renders with the API
 * down.
 *
 * Lives on a `design/*` branch, never on `develop` — see CLAUDE.md.
 *
 * There is no hub page here any more. It had grown into a page of claims about
 * the other pages: a second place for the argument to live, which drifted from
 * the harnesses it described and from `docs/analytics-design.md`, which is where
 * the argument belongs. The nav in `chrome-page` is the whole map.
 */
export const Route = createFileRoute('/design/analytics/')({
  beforeLoad: () => {
    throw redirect({ to: '/design/analytics/campaign' })
  },
})
