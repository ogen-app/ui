import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { CampaignTabBar } from '@/components/campaigns/CampaignTabBar'
import { isFeatureEnabled } from '@/config/featureFlags'
import { BRAND_TABS, brandTabs } from '@/lib/brandSections'

/**
 * Brand — the workspace-level material every campaign writes from (CON-227).
 *
 * **The layout route, and the only place the flag is checked.** Gating the
 * parent gates every tab under it: with `brand-materials` off the app has no
 * Brand at all, which is what the standing rule requires — not a blank page,
 * and not five child routes each repeating the same guard and each one edit
 * away from forgetting it. The nav row is gated separately in `AppSidebar`,
 * because "every entry point" means the sidebar too.
 *
 * The shape is Content Bank's, deliberately: a layout owning header and tabs,
 * one child route per tab, and the active tab derived from the URL rather than
 * held in state. Anything heavy enough to need the whole window escapes to
 * `brand_/…` below, the same trailing-underscore escape the asset editor uses.
 *
 * Top-right stays empty here. Per CON-178 it is views only, and the tab bar is
 * already the view switch; creation belongs to the tab that owns the thing
 * being created, which is why `ADD VOICE` lives on Voices and not up here.
 */
export const Route = createFileRoute('/_authenticated/brand')({
  beforeLoad: () => {
    if (!isFeatureEnabled('brand-materials')) {
      throw redirect({ to: '/campaigns' })
    }
  },
  component: BrandLayout,
})

function activeTabFromPath(pathname: string): string {
  const match = BRAND_TABS.find(
    (tab) => tab.id !== 'overview' && pathname.includes(`/brand/${tab.id}`),
  )
  return match?.id ?? 'overview'
}

function BrandLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeTab = activeTabFromPath(pathname)

  const handleTabSelect = (id: string) => {
    navigate({ to: id === 'overview' ? '/brand' : `/brand/${id}` })
  }

  return (
    <PageContainer variant="fullFlex">
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader title={t('nav.brand')} />
        {/* No argument, so no counts: there is no brand query yet — every tab
            below renders `EMPTY_BRAND`. `brandTabs(data)` is what this becomes
            the day the endpoint lands, which is also what the harness runs. */}
        <CampaignTabBar
          activeTab={activeTab}
          tabs={brandTabs()}
          onTabSelect={handleTabSelect}
        />
        {/* Each tab owns its own scrolling. A tab is a working screen, and the
            template compositor in particular has a fixed rail beside a scrolling
            detail — a single scroller here would drag the rail off with it. */}
        <div className="grid h-full overflow-hidden px-3 lg:px-6">
          <Outlet />
        </div>
      </div>
    </PageContainer>
  )
}
