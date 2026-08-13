import { createFileRoute, redirect } from '@tanstack/react-router'
import { isFeatureEnabled } from '@/config/featureFlags'
import WorkspacesPage from './page'

// Deliberately outside `_authenticated`: this page is the way *between*
// workspaces, so it must not render the sidebar, whose every item — campaigns,
// content bank, settings — belongs to the workspace being left behind. Auth is
// still guarded, once, in `__root.tsx`.
export const Route = createFileRoute('/workspaces/')({
  // The chooser needs the multi-workspace model to have something to choose
  // between (CON-147). With the flag off the URL is not a half-working page
  // but no page at all — typing it lands you back in the app.
  beforeLoad: () => {
    if (!isFeatureEnabled('multi-workspace')) throw redirect({ to: '/' })
  },
  component: WorkspacesPage,
})
