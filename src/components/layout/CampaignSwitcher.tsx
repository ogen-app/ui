import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArchiveIcon,
  CaretUpDownIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
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
import { NavIcon } from '@/components/layout/nav/NavIcon'
import { placeGlyph } from '@/components/layout/nav/placeGlyph'
import { CreateCampaignDialog } from '@/components/campaigns/CreateCampaignDialog'
import { useEndCampaign } from '@/components/campaigns/useEndCampaign'
import { UpgradeDialog } from '@/components/entitlements/UpgradeDialog'
import { useUpgradeGate } from '@/components/entitlements/useUpgradeGate'
import { useCampaign, useCampaigns } from '@/hooks/useCampaigns'
import { identityColorVar } from '@/lib/identity'
import { cn } from '@/lib'
import { formatDateRange, formatNumber } from '@/lib/intl'
import { useCampaignScope } from '@/hooks/useCampaignScope'
import { scopeLink } from '@/lib/campaignScope'
import { useCampaignScopeStore } from '@/stores/campaignScopeStore'
import type { Campaign } from '@/types/campaigns'

/**
 * The scope above the page: all campaigns, or one.
 *
 * A filter, not a place: choosing a campaign narrows the page you are on and
 * leaves the menu as it is (`lib/campaignScope`). On a page no campaign
 * narrows — Foundation, Profile — it changes the filter and stays put, so the
 * next row you open comes back filtered.
 *
 * The list ends with NEW CAMPAIGN, behind the same allowance as the Campaigns
 * page's button: starting one is the other answer to "which campaign".
 *
 * With a campaign chosen, the menu ends with what can be done to it: its
 * settings, and the two ways to stop it (`useEndCampaign`, the same modals as
 * the Danger Zone). The bar is where a campaign is named on every one of its
 * pages, so it is where someone looks for the campaign itself — the gear at
 * the foot of the rail reads as the app's, and the Danger Zone is a scroll
 * below that. Archive is left out for an archived campaign, which can still
 * be opened by address.
 */
export function CampaignSwitcher() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { where, scope: campaignId, soleCampaignId } = useCampaignScope()
  const remember = useCampaignScopeStore((state) => state.setCampaignId)
  const { data: campaigns = [] } = useCampaigns()
  // Read on its own as well as from the list: an archived campaign is not in
  // the list, and its pages still need a name above them.
  const { data: current } = useCampaign(campaignId ?? '')
  const [creating, setCreating] = useState(false)
  const gate = useUpgradeGate('active_campaigns')
  const chosen = campaignId ? current : undefined
  const end = useEndCampaign(chosen)

  const go = (target: string | null) => {
    remember(target)
    const link = scopeLink(where, target, { soleCampaignId })
    if (link) void navigate(link)
  }

  const name = (campaign: Campaign) =>
    campaign.name.trim() || t('nav.untitledCampaign')

  return (
    <>
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
          <ChromeMenuRule />
          <ChromeMenuItem
            className="text-secondary-foreground"
            onSelect={gate.intent(() => setCreating(true))}
          >
            <PlusIcon className="size-3.5 shrink-0" />
            {t('nav.scope.newCampaign')}
          </ChromeMenuItem>
          {chosen && (
            <>
              <ChromeMenuRule />
              <ChromeMenuItem
                className="text-secondary-foreground"
                onSelect={() =>
                  void navigate({
                    to: '/campaigns/$campaignId/settings',
                    params: { campaignId: chosen.id },
                  })
                }
              >
                {/* The rail's own gear, so the two read as one place. */}
                <NavIcon icon={placeGlyph('settings').icon} size={14} />
                {t('nav.scope.settings')}
              </ChromeMenuItem>
              {!chosen.archived_at && (
                <ChromeMenuItem
                  className="text-destructive"
                  onSelect={() => end.ask('archive')}
                >
                  <ArchiveIcon className="size-3.5 shrink-0" />
                  {t('campaigns.dangerZone.archive.menuItem')}
                </ChromeMenuItem>
              )}
              <ChromeMenuItem
                className="text-destructive"
                onSelect={() => end.ask('delete')}
              >
                <TrashIcon className="size-3.5 shrink-0" />
                {t('campaigns.dangerZone.delete.menuItem')}
              </ChromeMenuItem>
            </>
          )}
        </ChromeMenuContent>
      </DropdownMenu>
      <CreateCampaignDialog
        open={creating}
        onClose={() => setCreating(false)}
      />
      <UpgradeDialog gate={gate} />
      {end.dialogs}
    </>
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
