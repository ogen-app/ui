import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { IdeasSurface } from '@/components/ideas/IdeasSurface'

/**
 * Ideas — the workspace's, which is to say the ones not yet committed to a
 * campaign.
 */
export const Route = createFileRoute('/_authenticated/ideas/')({
  component: WorkspaceIdeasView,
})

function WorkspaceIdeasView() {
  const { t } = useTranslation()
  return <IdeasSurface heading={t('nav.ideas')} />
}
