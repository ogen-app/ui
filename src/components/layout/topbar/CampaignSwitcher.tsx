import { useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CaretUpDownIcon, CheckIcon } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import { useCampaign, useCampaigns } from '@/hooks/useCampaigns'
import { cn } from '@/lib'
import {
  CAMPAIGN_SECTION_PATH,
  campaignSectionOf,
} from '@/lib/campaignSections'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { formatDate } from '@/lib/intl'
import { navLevelOf } from '@/lib/navLevel'
import type { Campaign } from '@/types/campaigns'

/**
 * The top bar's second column: which campaign you are in, and the way to the
 * next one.
 *
 * It answers on every screen, not only inside a campaign. At the workspace
 * level it reads "All campaigns" — the same words as its first option, which
 * is where it leads — so the way into a campaign is in one place whether you
 * are on Ideas or on the campaign list.
 *
 * **Switching keeps your place.** On a campaign's Strategy, picking another
 * campaign opens *its* Strategy; from inside a post or an asset, it opens the
 * other campaign's list of them, since the item you were in is not that
 * campaign's. Anywhere else — the workspace's own screens — it opens the
 * campaign's Overview.
 *
 * The window sits beside the name because it is the campaign's commitment,
 * the thing every section is read against, and it used to be stated at the
 * top of the rail for that reason. It moved up with the name.
 */
export function CampaignSwitcher({ compact }: { compact: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { campaignId } = navLevelOf(pathname)
  // Safe on the empty string — the hook is `enabled: !!id` — and seeded from
  // the campaigns list, so arriving from `/campaigns` draws the name at once.
  const { data: campaign } = useCampaign(campaignId ?? '')
  // `?? []`, not a destructuring default: an empty workspace's list comes
  // back as `null`, which a default does not catch.
  const campaigns = useCampaigns().data ?? []

  const section = campaignSectionOf(pathname) ?? 'overview'
  const onCampaignList = pathname === '/campaigns'

  const open = (id: string) =>
    navigate({ to: CAMPAIGN_SECTION_PATH[section], params: { campaignId: id } })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('nav.switcher.label')}
          className={cn(
            '-ml-1.5 flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-secondary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {campaignId ? (
            <>
              <CampaignIcon
                abbr={identityAbbr(campaignName(campaign, t))}
                color={identityColorVar(campaignId)}
                active
                className="size-6 text-[10px]"
              />
              {campaign ? (
                <span className="truncate text-sm font-medium">
                  {campaignName(campaign, t)}
                </span>
              ) : (
                // Not "Untitled campaign" while the read is in flight — that
                // is a claim about the campaign, and it would be wrong.
                <span className="h-4 w-28 animate-pulse rounded-sm bg-secondary" />
              )}
              {campaign && !compact && (
                <span className="shrink-0 rounded-full border border-border px-2 font-mono text-xs leading-5 text-tertiary-foreground">
                  {campaignWindow(campaign) ?? t('nav.campaignNoWindow')}
                </span>
              )}
            </>
          ) : (
            <span className="truncate text-sm font-medium">
              {t('nav.switcher.allCampaigns')}
            </span>
          )}
          <CaretUpDownIcon className="size-4 shrink-0 text-tertiary-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] w-72 overflow-y-auto p-1.5"
      >
        <DropdownMenuItem
          className="gap-2.5 px-2"
          onSelect={() => navigate({ to: '/campaigns' })}
        >
          <span className="flex-1">{t('nav.switcher.allCampaigns')}</span>
          {onCampaignList && <CheckIcon className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5" />
        {campaigns.length === 0 ? (
          <DropdownMenuItem disabled className="px-2">
            {t('nav.switcher.none')}
          </DropdownMenuItem>
        ) : (
          campaigns.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="gap-2.5 px-2"
              onSelect={() => open(item.id)}
            >
              <CampaignIcon
                abbr={identityAbbr(campaignName(item, t))}
                color={identityColorVar(item.id)}
                active
                className="size-5 text-[9px]"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{campaignName(item, t)}</span>
                <span className="truncate font-mono text-xs text-tertiary-foreground">
                  {campaignWindow(item) ?? t('nav.campaignNoWindow')}
                </span>
              </span>
              {item.id === campaignId && <CheckIcon className="size-4" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function campaignName(
  campaign: Campaign | undefined,
  t: (key: 'nav.untitledCampaign') => string,
): string {
  return campaign?.name.trim() || t('nav.untitledCampaign')
}

/**
 * The window, as one short line. Null when the campaign has no dates rather
 * than half a range: "Sep 1 – " is worse than saying there is no window, and
 * an undated campaign is a real and common state (`lib/postGoal`).
 */
function campaignWindow(campaign: Campaign): string | null {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const start = formatDate(campaign.start_date, options)
  const end = formatDate(campaign.end_date, options)
  return start && end ? `${start} – ${end}` : null
}
