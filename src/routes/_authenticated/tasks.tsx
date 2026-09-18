import { createFileRoute, redirect } from '@tanstack/react-router'
import { TasksBoard } from '@/components/tasks/TasksBoard'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * Tasks — its own module, beside Activity rather than inside it.
 *
 * The flag is enforced here rather than only in the sidebar: with it off the
 * URL must behave as though the feature does not exist, not merely be
 * unlinked. It is Tasks' own flag, not Activity's — the two ship separately.
 */
export const Route = createFileRoute('/_authenticated/tasks')({
  beforeLoad: () => {
    if (!isFeatureEnabled('tasks')) throw redirect({ to: '/campaigns' })
  },
  component: TasksBoard,
})
