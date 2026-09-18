import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Collapse } from '@/components/ui/collapse'
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
 * The campaigns that have been put away (CON-156), as a closed drawer at the
 * foot of the Campaigns list.
 *
 * It used to be a second view of this screen, reached by an icon in the top
 * right — which is a corner reserved for views, so the icon was in the right
 * place and still wrong. A view switch is for two ways of looking at the same
 * work, and this is not that: the archive is a small pile at the end of the
 * list, and sending someone to a separate screen to see it cost them the
 * active campaigns they were looking at, for a set most people open once and
 * never again. Here the list simply continues, and closed is the resting
 * state.
 *
 * Absent rather than present-and-empty when there is nothing archived — a
 * drawer that opens onto "nothing here" is a row of furniture that has never
 * held anything. The exceptions are the two states where hiding it would
 * mislead: `defaultOpen` (the address asked for it, having just sent a
 * campaign in) and a failed fetch, where vanishing would tell someone who just
 * archived a campaign that it was deleted instead.
 *
 * Deliberately not `CampaignCard`. The card scores a campaign — posts due,
 * gaps in its setup, what needs attention — and every one of those is a claim
 * about work in progress. An archived campaign has no work in progress, so the
 * card would be telling someone to fix a campaign they have explicitly stopped
 * running. What is worth knowing here is which campaign it is, when it was put
 * away, and how to get it back.
 *
 * The name still links through: archiving hides a campaign, it does not close
 * it, and looking at what a finished campaign did is most of the reason to
 * keep one.
 */
export function ArchivedCampaigns({
  defaultOpen = false,
}: {
  defaultOpen?: boolean
}) {
  const { t, i18n } = useTranslation()
  const { data: campaigns, isLoading, isError } = useArchivedCampaigns()

  const count = campaigns?.length ?? 0
  if (isLoading && !defaultOpen) return null
  if (!isError && count === 0 && !defaultOpen) return null

  return (
    <Collapse
      title={t('campaigns.archivedSection')}
      // No count while the answer isn't known yet, rather than a confident 0.
      meta={isLoading || isError ? undefined : count}
      defaultOpen={defaultOpen}
    >
      {isError ? (
        <p className="py-2 text-sm text-warning">
          {t('campaigns.archivedError')}
        </p>
      ) : count === 0 ? (
        <p className="max-w-150 py-2 text-sm text-tertiary-foreground">
          {t('campaigns.archivedEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-px pt-1">
          {campaigns!.map((campaign) => (
            <li key={campaign.id}>
              <ArchivedRow campaign={campaign} locale={i18n.language} />
            </li>
          ))}
        </ul>
      )}
    </Collapse>
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
