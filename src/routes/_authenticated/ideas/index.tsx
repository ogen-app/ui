import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { PageHeader } from '@/components/page-primitives/PageHeader.tsx'
import { PageNotBuiltYet } from '@/components/page-primitives/PageNotBuiltYet.tsx'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * Ideas — the workspace's, which is to say the ones not yet committed to a
 * campaign.
 *
 * The flag is enforced here rather than only in the rail: with it off the URL
 * must behave as though the module does not exist, not merely be unlinked.
 */
export const Route = createFileRoute('/_authenticated/ideas/')({
  beforeLoad: () => {
    if (!isFeatureEnabled('ideas')) throw redirect({ to: '/campaigns' })
  },
  component: WorkspaceIdeasView,
})

function WorkspaceIdeasView() {
  const { t } = useTranslation()
  return (
    <PageContainer>
      <PageHeader title={t('nav.ideas')} />
      <PageNotBuiltYet
        title={t('ideas.stub.workspaceTitle')}
        subtitle={t('ideas.stub.workspaceBody')}
      />
    </PageContainer>
  )
}
