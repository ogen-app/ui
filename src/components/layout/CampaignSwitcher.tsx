import { useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CaretUpDownIcon } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CHROME_ROW,
  ChromeMenuContent,
  ChromeMenuItem,
  ChromeMenuRule,
} from '@/components/layout/chrome'
import { useCampaign, useCampaigns } from '@/hooks/useCampaigns'
import { useFeatureFlag } from '@/config/featureFlags'
import { identityColorVar } from '@/lib/identity'
import { cn } from '@/lib'
import { formatDateRange, formatNumber } from '@/lib/intl'
import { navLevelOf } from '@/lib/navLevel'
import { scopeTarget } from '@/lib/campaignScope'
import type { Campaign } from '@/types/campaigns'

/**
 * The scope above the page: all campaigns, or one.
 *
 * It replaces the rail's second level. Choosing a campaign narrows the place
 * you are on rather than taking you somewhere else (`lib/campaignScope`), so
 * the menu stays one menu and the campaign is a filter over it.
 */
export function CampaignSwitcher() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const workspaceCalendar = useFeatureFlag('workspace-calendar')
  const { campaignId } = navLevelOf(pathname)
  const { data: campaigns = [] } = useCampaigns()
  // Read on its own as well as from the list: an archived campaign is not in
  // the list, and its pages still need a name above them.
  const { data: current } = useCampaign(campaignId ?? '')

  const go = (target: string | null) =>
    navigate({ href: scopeTarget(pathname, target, { workspaceCalendar }) })

  const name = (campaign: Campaign) =>
    campaign.name.trim() || t('nav.untitledCampaign')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('nav.scope.switch')}
        className={cn(CHROME_ROW, 'w-auto px-2.5')}
      >
        {campaignId && current ? (
          <>
            <CampaignDot id={current.id} className="size-2.5" />
            <span className="truncate font-medium text-primary-foreground">
              {name(current)}
            </span>
            <span className="shrink-0 tabular-nums text-tertiary-foreground">
              {campaignWindow(current) ?? t('nav.campaignNoWindow')}
            </span>
          </>
        ) : (
          <>
            <span className="truncate font-medium text-primary-foreground">
              {t('nav.scope.all')}
            </span>
            <span className="shrink-0 tabular-nums text-tertiary-foreground">
              {formatNumber(campaigns.length)}
            </span>
          </>
        )}
        <CaretUpDownIcon className="size-3.5 shrink-0 text-tertiary-foreground" />
      </DropdownMenuTrigger>
      {/* Choosing navigates, so focus has nowhere to go back to; handing it
          to the trigger would leave it outlined on the next page. */}
      <ChromeMenuContent
        align="start"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <ChromeMenuItem on={!campaignId} onSelect={() => go(null)}>
          {t('nav.scope.all')}
        </ChromeMenuItem>
        <ChromeMenuRule />
        {campaigns.map((campaign) => (
          <ChromeMenuItem
            key={campaign.id}
            on={campaign.id === campaignId}
            note={campaignWindow(campaign) ?? undefined}
            onSelect={() => go(campaign.id)}
          >
            <CampaignDot id={campaign.id} />
            <span className="truncate">{name(campaign)}</span>
          </ChromeMenuItem>
        ))}
      </ChromeMenuContent>
    </DropdownMenu>
  )
}

/** A campaign's colour, as a dot: the one mark the bar and its menu use. */
function CampaignDot({ id, className }: { id: string; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ backgroundColor: identityColorVar(id) }}
      className={cn('size-2 shrink-0 rounded-full', className)}
    />
  )
}

/** The window as one span, or null when the campaign has no dates. */
function campaignWindow(campaign: Campaign): string | null {
  if (!campaign.start_date || !campaign.end_date) return null
  const start = new Date(campaign.start_date)
  const end = new Date(campaign.end_date)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return formatDateRange(start, end, { month: 'short', day: 'numeric' })
}
