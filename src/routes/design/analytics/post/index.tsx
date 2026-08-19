import { createFileRoute } from '@tanstack/react-router'
import { PostAnalyticsHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/post/')({
  component: PostAnalyticsHarness,
})
