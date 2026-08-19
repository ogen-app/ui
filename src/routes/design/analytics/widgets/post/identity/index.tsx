import { createFileRoute } from '@tanstack/react-router'
import { PostIdentityHarness } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/widgets/post/identity/')({
  component: PostIdentityHarness,
})
