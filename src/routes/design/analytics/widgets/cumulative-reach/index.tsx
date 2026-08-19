import { createFileRoute } from '@tanstack/react-router'
import { CumulativeReachHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/widgets/cumulative-reach/')({
  component: CumulativeReachHarness,
})
