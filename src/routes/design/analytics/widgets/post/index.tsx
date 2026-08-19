import { createFileRoute } from '@tanstack/react-router'
import { PostWidgetHub } from './page'

/** TEMPORARY — design harness. See `routes/design/analytics/index.tsx`. */
export const Route = createFileRoute('/design/analytics/widgets/post/')({
  component: PostWidgetHub,
})
