import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AssetKindTally } from '@/components/content/AssetKindTally'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { ASSET_LIST_KEY } from '@/hooks/useContent'
import { tallyKindFacet } from '@/lib/assetKind'
import { seedsWholeBank } from '@/lib/campaignSources'
import { counted } from '@/lib/intl'
import { queryAssets } from '@/services/api/content'
import type { Campaign } from '@/types/campaigns'
import { OverviewCard } from './OverviewCard.tsx'

/**
 * What the campaign has been given to write from: how many documents, and of
 * which kinds — the same tally the workspace's Assets module draws.
 *
 * The count beside the title comes from the campaign alone, so it is there at
 * once; the breakdown is the server's (the Assets query scoped to this
 * campaign, asked for facets and one row), so it costs the same for four
 * documents as for four hundred.
 */
export function AssetsStats({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation()
  const count = campaign.asset_ids.length
  const wholeBank = seedsWholeBank(campaign)
  const breakdown = useQuery({
    queryKey: [...ASSET_LIST_KEY, 'breakdown', campaign.id],
    queryFn: () =>
      queryAssets({
        scope_campaign: campaign.id,
        facets: 'kind,status',
        limit: '1',
      }),
    enabled: count > 0 && !wholeBank,
  })
  const facets = breakdown.data?.facets
  const tally = facets?.kind ? tallyKindFacet(facets.kind) : []
  const status = (value: string) =>
    facets?.status?.find((f) => f.value === value)?.count ?? 0

  const link = { target: 'assets' as const, campaignId: campaign.id }

  // A campaign nobody has opened since the whole-bank mode was retired still
  // generates from every document in the workspace.
  if (wholeBank || count === 0) {
    return (
      <OverviewCard section="assets" link={link}>
        <p className="text-sm text-tertiary-foreground">
          {wholeBank
            ? t('campaignOverview.stats.wholeBank')
            : t('campaignOverview.stats.noDocuments')}
        </p>
      </OverviewCard>
    )
  }

  return (
    <OverviewCard
      section="assets"
      link={link}
      status={
        <span className="text-sm text-secondary-foreground">
          {t('campaignOverview.stats.documents', counted(count))}
        </span>
      }
    >
      {!breakdown.data ? (
        <Skeleton className="h-5 w-48" />
      ) : tally.length > 0 ? (
        <AssetKindTally
          tally={tally}
          waiting={status('pending')}
          unreadable={status('failed') + status('partial')}
        />
      ) : (
        <p className="text-sm text-tertiary-foreground">
          {t('campaignOverview.stats.documentsGone')}
        </p>
      )}
    </OverviewCard>
  )
}
