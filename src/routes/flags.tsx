import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

import { DEV_TOOLS } from '@/config/flagOverrides'

/**
 * `/flags` — the staging feature-flag panel.
 *
 * Unlisted: nothing in the app links here, because the copy team having to
 * *choose* to switch a half-built feature on is the whole protection. It is not
 * secret, and leaning on a secret URL would be a worse promise than the one
 * below.
 *
 * The guard is the same shape the feature routes use — with `DEV_TOOLS` off the
 * URL behaves as though the page does not exist. What is different here is that
 * it also *doesn't* exist: `DEV_TOOLS` is a build-time constant, so in a
 * production build the ternary folds to `() => null`, the `import()` becomes
 * unreachable, and the panel's chunk is never emitted. All that survives is
 * this redirect.
 */
const FlagsPanel = DEV_TOOLS
  ? lazy(() => import('@/devtools/FlagsPanel'))
  : () => null

export const Route = createFileRoute('/flags')({
  beforeLoad: () => {
    if (!DEV_TOOLS) throw redirect({ to: '/' })
  },
  component: FlagsRoute,
})

/** Named rather than inline, so it is a component the hooks rules can see. */
function FlagsRoute() {
  return (
    <Suspense fallback={null}>
      <FlagsPanel />
    </Suspense>
  )
}
