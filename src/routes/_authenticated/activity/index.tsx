import { createFileRoute } from '@tanstack/react-router'

// `/activity` is the feed alone — the layout above already renders it, so this
// route exists to be the resting state with no report open.
export const Route = createFileRoute('/_authenticated/activity/')({
  component: () => null,
})
