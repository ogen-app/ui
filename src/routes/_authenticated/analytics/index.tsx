import { createFileRoute, redirect } from '@tanstack/react-router'
import { AnalyticsPage } from './page'
import { validateAnalyticsSearch } from '@/lib/analyticsSearch'
import { OVERVIEW_WINDOWS } from '@/hooks/useAnalyticsOverview'

/**
 * The route resolves whether or not the feature is switched on:
 * `analytics-overview` decides which of the two the page renders, not whether
 * the URL exists. A guard here would turn a bookmarked link into a 404 the day
 * someone turns the flag off.
 *
 * The period, the platforms and the campaign are the address (CON-463), so
 * the assistant can set them and a link carries them. A campaign here is
 * handed on to that campaign's own Analytics, so the switcher in the bar
 * above names it and stays the one campaign control.
 */
export const Route = createFileRoute('/_authenticated/analytics/')({
  staticData: { help: 'analytics' },
  validateSearch: (raw: Record<string, unknown>) =>
    validateAnalyticsSearch(
      raw,
      OVERVIEW_WINDOWS.map((w) => w.window),
    ),
  beforeLoad: ({ search }) => {
    const { campaign_id: campaignId, ...rest } = search
    if (campaignId)
      throw redirect({
        to: '/campaigns/$campaignId/analytics',
        params: { campaignId },
        search: rest,
        replace: true,
      })
  },
  component: AnalyticsPage,
})
