import { createFileRoute } from '@tanstack/react-router'
import { CumulativeInteractionsHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/widgets/cumulative-interactions/')({
  component: CumulativeInteractionsHarness,
})
