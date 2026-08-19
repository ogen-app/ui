import { createFileRoute } from '@tanstack/react-router'
import { QualityHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/widgets/quality/')({
  component: QualityHarness,
})
