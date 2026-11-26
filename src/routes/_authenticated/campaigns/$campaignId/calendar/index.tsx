import { createFileRoute, redirect } from '@tanstack/react-router'
import { readCalendarPlace } from '@/hooks/usePostsPlace'
import { parseCalendarSearch } from '@/lib/postFilter'

// Bare /campaigns/:id/calendar → wherever this campaign's calendar was last
// left, or the current week for one never opened. The date *and* the
// granularity, but never the list: this URL names the calendar, so restoring a
// table here would be answering a different question (`lib/postsPlace`).
export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/calendar/',
)({
  // The search rides through the redirect (CON-534): it is where the
  // assistant's set_filter lands.
  validateSearch: parseCalendarSearch,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/campaigns/$campaignId/calendar/$anchor/$view',
      params: {
        campaignId: params.campaignId,
        ...readCalendarPlace(params.campaignId),
      },
      search,
    })
  },
})
