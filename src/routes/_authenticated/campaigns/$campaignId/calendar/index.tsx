import { createFileRoute, redirect } from '@tanstack/react-router'
import { readCalendarPlace } from '@/hooks/usePostsPlace'

// Bare /campaigns/:id/calendar → wherever this campaign's calendar was last
// left, or the current week for one never opened. The date *and* the
// granularity, but never the list: this URL names the calendar, so restoring a
// table here would be answering a different question (`lib/postsPlace`).
export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/calendar/',
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/campaigns/$campaignId/calendar/$anchor/$view',
      params: {
        campaignId: params.campaignId,
        ...readCalendarPlace(params.campaignId),
      },
    })
  },
})
