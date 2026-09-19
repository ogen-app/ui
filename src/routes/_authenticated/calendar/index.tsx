import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { PageHeader } from '@/components/page-primitives/PageHeader.tsx'
import { PageNotBuiltYet } from '@/components/page-primitives/PageNotBuiltYet.tsx'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * The workspace's calendar — every campaign's posts on one grid.
 *
 * The same view the campaign already has, with the filter taken off, which is
 * why it is the workspace's twin of that row rather than a new idea.
 */
export const Route = createFileRoute('/_authenticated/calendar/')({
  beforeLoad: () => {
    if (!isFeatureEnabled('workspace-calendar'))
      throw redirect({ to: '/campaigns' })
  },
  component: WorkspaceCalendarView,
})

function WorkspaceCalendarView() {
  const { t } = useTranslation()
  return (
    <PageContainer>
      <PageHeader title={t('nav.calendar')} />
      <PageNotBuiltYet
        title={t('calendar.stub.workspaceTitle')}
        subtitle={t('calendar.stub.workspaceBody')}
      />
    </PageContainer>
  )
}
