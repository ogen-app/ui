import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/brand/look` — logos with jobs, colours with roles, type, imagery.
 *
 * **Closed, and the screen behind it still exists.** `LookSection` renders and
 * `GET /api/brand` returns `look`; what is missing is anything that writes it
 * and anything that reads it — the image flows are CON-105/CON-132. The
 * Overview does not offer the card (`shown` in `lib/brandSections`), so this
 * route is only reachable by typing the URL or following an old link, and it
 * answers the way the rest of the module answers a section that is not there:
 * back to the Overview, not a page insisting the feature exists.
 *
 * Reopening it is deleting this file's `beforeLoad` and restoring the two lines
 * below it — kept in the git history rather than commented out here.
 */
export const Route = createFileRoute('/_authenticated/brand/look')({
  beforeLoad: () => {
    throw redirect({ to: '/brand' })
  },
})
