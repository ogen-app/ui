import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DailyReportModal } from '@/components/activity/DailyReportModal'

/**
 * One day's report, over the feed. The date is the URL — `/activity/2026-08-19`
 * — so a report can be linked and sent rather than only opened.
 */
export const Route = createFileRoute('/_authenticated/activity/$date')({
  component: DailyReportRoute,
})

function DailyReportRoute() {
  const { date } = Route.useParams()
  const navigate = useNavigate()
  return (
    <DailyReportModal
      date={date}
      onClose={() => void navigate({ to: '/activity' })}
    />
  )
}
