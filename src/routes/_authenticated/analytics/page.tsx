import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import type { AnalyticsSearch } from '@/lib/analyticsSearch'

/**
 * Analytics for all campaigns — the dashboard with the campaign a choice in
 * its scope bar (`AnalyticsDashboard`). A campaign's Analytics tab is the same
 * dashboard with the campaign fixed.
 */
export function AnalyticsPage() {
  const { t } = useTranslation()
  // The period, platforms and campaign are the address (CON-463): the
  // assistant's `set_window` lands there, and BACK puts the old one back.
  const search = useSearch({ from: '/_authenticated/analytics/' })
  const navigate = useNavigate({ from: '/analytics/' })

  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <AnalyticsDashboard
        title={t('analytics.surface.title')}
        search={search}
        onSearchChange={(next: AnalyticsSearch) =>
          void navigate({ search: next, replace: true })
        }
      />
    </PageContainer>
  )
}
