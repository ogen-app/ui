import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * Activity's layout: the feed, with the daily report rendering over it from
 * `$date`. The feed stays mounted underneath so closing the report puts the
 * reader back where they were rather than refetching the page they came from.
 *
 * The flag is enforced here rather than only in the sidebar — with it off the
 * URL must behave as though the feature does not exist, not merely be
 * unlinked.
 */
export const Route = createFileRoute('/_authenticated/activity')({
  beforeLoad: () => {
    if (!isFeatureEnabled('activity')) throw redirect({ to: '/campaigns' })
  },
  component: ActivityLayout,
})

function ActivityLayout() {
  return (
    <>
      <ActivityFeed />
      <Outlet />
    </>
  )
}
