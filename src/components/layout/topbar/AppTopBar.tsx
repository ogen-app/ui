import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon } from '@hugeicons/core-free-icons'
import { useSidebar } from '@/components/ui/sidebar'
import { CampaignSwitcher } from '@/components/layout/topbar/CampaignSwitcher'
import { RailButtons } from '@/components/layout/topbar/RailButtons'
import { WorkspaceMenu } from '@/components/layout/topbar/WorkspaceMenu'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'
import { navLevelOf } from '@/lib/navLevel'

/**
 * The app's top bar, over every screen inside the authenticated shell.
 *
 * Three columns that line up with the three below them:
 *
 * 1. **The workspace, with you in it** — exactly as wide as the rail under it,
 *    collapsing with it, so the corner and the rail read as one column.
 * 2. **The campaign** — a switcher over the page, naming the campaign you are
 *    in (and its window), or "All campaigns" at the workspace level.
 * 3. **Ask AI and Support** — each opens, closes or replaces the right column.
 *
 * It is chrome, not page: modals, sheets and the help panel's own popovers
 * all sit above it (`ZIndex.navigation`), and a page's own header — its title
 * and the views in its top-right corner — stays the page's.
 *
 * Sticky under the announcement ribbon rather than fixed, so the few screens
 * that scroll the document rather than their own container still keep it.
 */
export function AppTopBar() {
  const { t } = useTranslation()
  const { isMobile, state, setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const { level } = navLevelOf(pathname)
  const collapsed = !isMobile && state === 'collapsed'

  return (
    <header
      style={{ zIndex: ZIndex.navigation }}
      className="sticky top-(--announcement-h) flex h-(--topbar-h) shrink-0 items-stretch border-b border-border bg-sidebar-primary"
    >
      <div
        className={cn(
          'flex shrink-0 items-stretch',
          isMobile
            ? 'w-auto'
            : cn(
                'border-r border-border transition-[width] duration-200 ease-linear',
                collapsed ? 'w-(--sidebar-width-icon)' : 'w-(--sidebar-width)',
              ),
        )}
      >
        {isMobile && (
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            aria-label={t('nav.openMenu')}
            className="flex w-11 shrink-0 cursor-pointer items-center justify-center text-secondary-foreground hover:text-primary-foreground"
          >
            <HugeiconsIcon icon={Menu01Icon} size={18} strokeWidth={1.5} />
          </button>
        )}
        <WorkspaceMenu level={level} compact={collapsed || isMobile} />
      </div>
      <div className="flex min-w-0 flex-1 items-center px-3 lg:px-4">
        <CampaignSwitcher compact={isMobile} />
      </div>
      <div className="flex shrink-0 items-center pr-2 lg:pr-3">
        <RailButtons compact={isMobile} />
      </div>
    </header>
  )
}
