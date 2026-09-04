import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { PageError } from '@/components/page-primitives/PageError'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { Button } from '@/components/ui/button'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import {
  useArchivedCampaigns,
  useUnarchiveCampaign,
} from '@/hooks/useCampaigns'
import { campaignTypeInfo } from '@/lib/campaignTypeDictionary'
import { formatDate } from '@/lib/intl'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import type { Campaign } from '@/types/campaigns'

/**
 * The campaigns that have been put away (CON-156).
 *
 * Deliberately not `CampaignCard`. The card scores a campaign — posts due,
 * gaps in its setup, what needs attention — and every one of those is a claim
 * about work in progress. An archived campaign has no work in progress, so the
 * card would be telling someone to fix a campaign they have explicitly stopped
 * running. What is worth knowing here is which campaign it is, when it was put
 * away, and how to get it back.
 *
 * The name still links through: archiving hides a campaign, it does not close
 * it, and looking at what a finished campaign did is most of the reason to keep
 * one.
 */
export function ArchivedCampaigns() {
  const { t, i18n } = useTranslation()
  const { data: campaigns, isLoading, isError } = useArchivedCampaigns()

  if (isLoading) return <PageLoader />
  if (isError) return <PageError header={t('campaigns.archivedError')} />

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="grow grid px-3 lg:px-6 pb-6">
        <PageGridEmptyState
          title={t('campaigns.archivedEmpty.title')}
          subtitle={t('campaigns.archivedEmpty.subtitle')}
        />
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-px px-3 lg:px-6 pt-4 pb-10">
      {campaigns.map((campaign) => (
        <li key={campaign.id}>
          <ArchivedRow campaign={campaign} locale={i18n.language} />
        </li>
      ))}
    </ul>
  )
}

function ArchivedRow({
  campaign,
  locale,
}: {
  campaign: Campaign
  locale: string
}) {
  const { t } = useTranslation()
  const unarchive = useUnarchiveCampaign()

  const title = campaign.name.trim() || t('campaigns.untitled')
  const typeName = campaign.campaign_type?.name
  const typeLabel = typeName ? campaignTypeInfo(typeName).label : null
  // Null only for a row the server sent into the wrong list; the date is
  // context rather than the point of the line, so it simply doesn't draw.
  const archivedOn = formatDate(
    campaign.archived_at,
    { day: 'numeric', month: 'short', year: 'numeric' },
    locale,
  )

  return (
    <div className="flex items-center gap-3 bg-secondary px-3 py-2.5">
      <CampaignIcon
        abbr={identityAbbr(title)}
        color={identityColorVar(campaign.id)}
        className="size-5"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to="/campaigns/$campaignId"
          params={{ campaignId: campaign.id }}
          className="truncate text-sm font-medium hover:underline"
        >
          {title}
        </Link>
        <span className="truncate text-xs text-tertiary-foreground">
          {[typeLabel, archivedOn && t('campaigns.archivedOn', { archivedOn })]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => unarchive.mutate(campaign.id)}
        loading={unarchive.isPending}
      >
        <ArrowCounterClockwiseIcon />
        <span>{t('campaigns.unarchive')}</span>
      </Button>
    </div>
  )
}
