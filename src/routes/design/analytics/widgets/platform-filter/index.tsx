import { createFileRoute } from '@tanstack/react-router'
import { PlatformFilterHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/widgets/platform-filter/')({
  component: PlatformFilterHarness,
})
