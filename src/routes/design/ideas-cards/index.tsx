import { createFileRoute } from '@tanstack/react-router'
import { IdeasCardsHarness } from './page'

/**
 * TEMPORARY — a design harness for the Ideas list's rows and header, not a
 * product route. It sits outside `_authenticated` (no app chrome) and outside
 * the auth probe in `__root.tsx`, so it renders with the API down. Lives on
 * `design/ideas-cards` only; delete the folder and the `/design` exemption
 * when the design is settled.
 */
export const Route = createFileRoute('/design/ideas-cards/')({
  component: IdeasCardsHarness,
})
