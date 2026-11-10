import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsPage } from './page'
import { validateAnalyticsSearch } from '@/lib/analyticsSearch'

/**
 * The route resolves whether or not the feature is switched on:
 * `analytics-overview` decides which of the two the page renders, not whether
 * the URL exists. A guard here would turn a bookmarked link into a 404 the day
 * someone turns the flag off.
 *
 * The period, the platforms and the campaign are the address (CON-463), so
 * the assistant can set them and a link carries them.
 */
export const Route = createFileRoute('/_authenticated/analytics/')({
  validateSearch: validateAnalyticsSearch,
  component: AnalyticsPage,
})
