import { createFileRoute } from '@tanstack/react-router'
import LoadingStatesPage from './page'

// A design reference, not a product screen: deliberately outside
// `_authenticated` so it renders without the sidebar and nothing on it depends
// on a campaign, a post or a workspace being loaded. Auth is still guarded
// once, in `__root.tsx`.
export const Route = createFileRoute('/design/loading-states/')({
  component: LoadingStatesPage,
})
