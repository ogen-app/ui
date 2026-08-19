import { createFileRoute } from '@tanstack/react-router'
import { PostOverviewHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/widgets/post/overview/')({
  component: PostOverviewHarness,
})
