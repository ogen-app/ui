import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ActivityFeed } from '@/components/activity/ActivityFeed'

/**
 * Activity's layout: the feed, with the daily report rendering over it from
 * `$date`. The feed stays mounted underneath so closing the report puts the
 * reader back where they were rather than refetching the page they came from.
 */
export const Route = createFileRoute('/_authenticated/activity')({
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
