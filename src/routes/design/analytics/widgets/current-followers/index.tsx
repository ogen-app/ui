import { createFileRoute } from '@tanstack/react-router'
import { CurrentFollowersHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/widgets/current-followers/')({
  component: CurrentFollowersHarness,
})
