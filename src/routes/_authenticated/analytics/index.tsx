import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsPage } from './page'

/**
 * The route resolves whether or not the feature is switched on:
 * `analytics-overview` decides which of the two the page renders, not whether
 * the URL exists. A guard here would turn a bookmarked link into a 404 the day
 * someone turns the flag off.
 */
export const Route = createFileRoute('/_authenticated/analytics/')({
  component: AnalyticsPage,
})
