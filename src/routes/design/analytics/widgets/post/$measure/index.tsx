import { createFileRoute } from '@tanstack/react-router'
import { PostMeasureHarness } from './page'

/**
 * TEMPORARY — design harness. See `routes/design/analytics/index.tsx`.
 *
 * One route for seven benches. The cards differ only in which measure they are
 * bound to, and seven copies of the same file would drift the moment one of the
 * seven needed a different note.
 */
export const Route = createFileRoute('/design/analytics/widgets/post/$measure/')({
  component: PostMeasureHarness,
})
