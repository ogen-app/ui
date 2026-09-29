import { createFileRoute, redirect } from '@tanstack/react-router'
import { isFeatureEnabled } from '@/config/featureFlags'
import { readCalendarPlace } from '@/hooks/usePostsPlace'
import { WORKSPACE_PLACE } from '@/lib/postsPlace'

/**
 * Bare `/calendar` → wherever the workspace calendar was last left, or the
 * current week for a workspace nobody has opened it in.
 *
 * The same redirect the campaign's `/calendar` does, reading the same memory
 * under its own key (`lib/postsPlace`). It restores the date *and* the
 * granularity and nothing else — there is no list view here for it to restore
 * even if one had been remembered.
 */
export const Route = createFileRoute('/_authenticated/calendar/')({
  beforeLoad: () => {
    if (!isFeatureEnabled('workspace-calendar'))
      throw redirect({ to: '/campaigns' })
    throw redirect({
      to: '/calendar/$anchor/$view',
      params: readCalendarPlace(WORKSPACE_PLACE),
    })
  },
})
