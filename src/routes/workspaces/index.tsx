import { createFileRoute } from '@tanstack/react-router'
import WorkspacesPage from './page'

// Deliberately outside `_authenticated`: this page is the way *between*
// workspaces, so it must not render the sidebar, whose every item — campaigns,
// content bank, settings — belongs to the workspace being left behind. Auth is
// still guarded, once, in `__root.tsx`.
export const Route = createFileRoute('/workspaces/')({
  component: WorkspacesPage,
})
