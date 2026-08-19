import { createFileRoute } from '@tanstack/react-router'
import { CampaignAnalyticsHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/campaign/')({
  component: CampaignAnalyticsHarness,
})
